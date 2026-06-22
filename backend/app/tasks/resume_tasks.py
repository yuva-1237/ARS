import os
import logging
from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal
from backend.app.models import Resume, Candidate, CandidateScore, JobDescription, InterviewQuestion, Notification, User
from backend.app.services.gemini_service import parse_resume_text, match_candidate_to_job, detect_resume_fraud, generate_interview_questions
from backend.app.services.rag_service import rag_service
from backend.app.services.firebase_service import send_notification_to_user

logger = logging.getLogger(__name__)

# ==========================================
# FILE TEXT EXTRACTION HELPERS
# ==========================================

def _extract_text_from_pdf(file_path: str) -> str:
    text = ""
    # Try pdfplumber
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        if text.strip():
            return text
    except Exception as e:
        logger.warning(f"pdfplumber failed to extract text from {file_path}: {e}")

    # Fallback to PyPDF
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        logger.error(f"PyPDF failed to extract text from {file_path}: {e}")
    return text

def _extract_text_from_docx(file_path: str) -> str:
    text = ""
    try:
        import docx2txt
        text = docx2txt.process(file_path)
        if text.strip():
            return text
    except Exception as e:
        logger.warning(f"docx2txt failed on {file_path}: {e}")

    try:
        import docx
        doc = docx.Document(file_path)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    except Exception as e:
        logger.error(f"python-docx failed on {file_path}: {e}")
    return text

def _extract_text_from_image(file_path: str) -> str:
    try:
        from PIL import Image
        import pytesseract
        # Open image and run Tesseract OCR
        img = Image.open(file_path)
        text = pytesseract.image_to_string(img)
        return text
    except Exception as e:
        logger.error(f"OCR failed for {file_path}: {e}. Ensure Tesseract is installed and on PATH.")
    return ""

def _extract_text_from_txt(file_path: str) -> str:
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception as e:
        logger.error(f"Failed to read TXT file {file_path}: {e}")
    return ""

def extract_resume_text(file_path: str, file_type: str) -> str:
    file_type = file_type.lower()
    if "pdf" in file_type:
        return _extract_text_from_pdf(file_path)
    elif "docx" in file_type or "officedocument" in file_type:
        return _extract_text_from_docx(file_path)
    elif "text" in file_type or "txt" in file_type:
        return _extract_text_from_txt(file_path)
    elif "image" in file_type or "png" in file_type or "jpg" in file_type or "jpeg" in file_type:
        return _extract_text_from_image(file_path)
    else:
        # Default fallback: try text reading, then pdf, docx
        try:
            return _extract_text_from_txt(file_path)
        except Exception:
            return ""

# ==========================================
# RESUME PROCESSING WORKFLOW
# ==========================================

def process_resume_workflow(resume_id: int, job_ids: list = None):
    """
    Main synchronous resume processing engine. Can be called directly or inside Celery.
    """
    db = SessionLocal()
    try:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            logger.error(f"Resume {resume_id} not found in database.")
            return False

        resume.status = "processing"
        db.commit()
        
        # Step 1: Extract Text
        logger.info(f"Extracting text from resume {resume_id}...")
        raw_text = extract_resume_text(resume.file_path, resume.file_type)
        if not raw_text.strip():
            logger.error(f"No text extracted from resume {resume_id}.")
            resume.status = "failed"
            db.commit()
            return False
            
        resume.raw_text = raw_text
        db.commit()
        
        is_image = any(img_type in resume.file_type.lower() for img_type in ["image", "png", "jpg", "jpeg"])
        if is_image:
            first_user = db.query(User).first()
            target_user_id = first_user.id if first_user else 1
            send_notification_to_user(
                db_user_id=target_user_id,
                title="Image Analysis Completed",
                message=f"OCR analysis finished successfully for scanned resume '{resume.file_name}'.",
                notification_type="success",
                db=db
            )

        # Step 2: AI Parse
        logger.info(f"Calling Gemini to parse resume {resume_id}...")
        parsed_data = parse_resume_text(raw_text)
        
        # Step 3: Create Candidate Profile
        candidate = db.query(Candidate).filter(Candidate.resume_id == resume_id).first()
        if not candidate:
            candidate = Candidate(resume_id=resume_id)
            db.add(candidate)
            db.commit()
            db.refresh(candidate)

        # Update candidate details
        candidate.first_name = parsed_data.get("first_name", "")
        candidate.last_name = parsed_data.get("last_name", "")
        candidate.email = parsed_data.get("email", "")
        candidate.phone = parsed_data.get("phone", "")
        candidate.location = parsed_data.get("location", "")
        candidate.linkedin = parsed_data.get("linkedin", "")
        candidate.github = parsed_data.get("github", "")
        candidate.portfolio = parsed_data.get("portfolio", "")
        
        candidate.skills = parsed_data.get("skills", [])
        candidate.education = parsed_data.get("education", [])
        candidate.experience = parsed_data.get("experience", [])
        candidate.projects = parsed_data.get("projects", [])
        candidate.certifications = parsed_data.get("certifications", [])
        candidate.languages = parsed_data.get("languages", [])
        candidate.achievements = parsed_data.get("achievements", [])
        candidate.status = "screening"
        db.commit()

        # Step 4: Run Fraud Detection
        logger.info(f"Running AI Fraud Analysis on candidate {candidate.id}...")
        fraud_data = detect_resume_fraud(parsed_data)
        
        # Step 5: Index in RAG vector db
        meta = {
            "first_name": candidate.first_name,
            "last_name": candidate.last_name,
            "email": candidate.email,
            "skills": candidate.skills,
            "experience_years": len(candidate.experience)
        }
        rag_service.index_candidate(candidate.id, raw_text, meta)

        # Step 6: Process Scores against Jobs
        # If specific jobs were passed, score those. Otherwise, score all active jobs in the DB.
        if not job_ids:
            active_jobs = db.query(JobDescription).filter(JobDescription.status == "active").all()
            job_ids = [j.id for j in active_jobs]
            
        for job_id in job_ids:
            job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
            if not job:
                continue
            
            logger.info(f"Matching candidate {candidate.id} with job {job_id}...")
            job_json = {
                "title": job.title,
                "required_skills": job.required_skills or [],
                "preferred_skills": job.preferred_skills or [],
                "experience_years": job.experience_years or 0,
                "education_requirements": job.education_requirements or "",
                "responsibilities": job.responsibilities or [],
                "keywords": job.keywords or []
            }
            
            match_results = match_candidate_to_job(parsed_data, job_json)
            
            # Check if score already exists
            existing_score = db.query(CandidateScore).filter(
                CandidateScore.candidate_id == candidate.id,
                CandidateScore.job_id == job_id
            ).first()
            
            if not existing_score:
                existing_score = CandidateScore(candidate_id=candidate.id, job_id=job_id)
                db.add(existing_score)
                
            # Get match sub-scores from LLM results
            s_score = match_results.get("skill_score", 0.0)
            e_score = match_results.get("experience_score", 0.0)
            ed_score = match_results.get("education_score", 0.0)
            c_score = match_results.get("certification_score", 0.0)
            p_score = match_results.get("project_score", 0.0)
            k_score = match_results.get("keyword_score", 0.0)
            se_score = match_results.get("semantic_score", 0.0)

            # Load configured scoring weights from settings
            from backend.app.api.settings import load_local_settings
            local_settings = load_local_settings()
            weights = local_settings.get("scoring_weights", {})
            
            skill_w = weights.get("skill_weight", 0.25)
            exp_w = weights.get("experience_weight", 0.25)
            edu_w = weights.get("education_weight", 0.15)
            cert_w = weights.get("certification_weight", 0.10)
            proj_w = weights.get("project_weight", 0.10)
            key_w = weights.get("keyword_weight", 0.05)
            sem_w = weights.get("semantic_weight", 0.10)
            
            total_w = skill_w + exp_w + edu_w + cert_w + proj_w + key_w + sem_w
            if total_w > 0:
                weighted_score = (
                    (s_score * skill_w) +
                    (e_score * exp_w) +
                    (ed_score * edu_w) +
                    (c_score * cert_w) +
                    (p_score * proj_w) +
                    (k_score * key_w) +
                    (se_score * sem_w)
                ) / total_w
            else:
                weighted_score = match_results.get("overall_score", 0.0)
                
            existing_score.overall_score = round(float(weighted_score), 1)
            existing_score.skill_score = round(float(s_score), 1)
            existing_score.experience_score = round(float(e_score), 1)
            existing_score.education_score = round(float(ed_score), 1)
            existing_score.certification_score = round(float(c_score), 1)
            existing_score.project_score = round(float(p_score), 1)
            existing_score.keyword_score = round(float(k_score), 1)
            existing_score.semantic_score = round(float(se_score), 1)
            existing_score.explanation = match_results.get("explanation", "")
            existing_score.confidence_score = match_results.get("confidence_score", 0.0)
            
            # Save fraud data directly inside the score sheet
            existing_score.fraud_risk_score = fraud_data.get("fraud_risk_score", 0.0)
            existing_score.fraud_risk_report = fraud_data.get("fraud_risk_report", [])
            
            # AI summary
            existing_score.ai_summary = match_results.get("ai_summary", "")
            existing_score.strengths = match_results.get("strengths", [])
            existing_score.weaknesses = match_results.get("weaknesses", [])
            db.commit()
            
            # Step 7: Generate Interview Questions
            logger.info(f"Generating interview questions for candidate {candidate.id} on job {job_id}...")
            # Clean up old questions for this combination
            db.query(InterviewQuestion).filter(
                InterviewQuestion.candidate_id == candidate.id,
                InterviewQuestion.job_id == job_id
            ).delete()
            
            questions = generate_interview_questions(parsed_data, job_json)
            for q in questions:
                new_q = InterviewQuestion(
                    candidate_id=candidate.id,
                    job_id=job_id,
                    question_text=q.get("question_text", ""),
                    category=q.get("category", "technical"),
                    difficulty=q.get("difficulty", "medium"),
                    ideal_answer=q.get("ideal_answer", "")
                )
                db.add(new_q)
            db.commit()

        # Update resume status
        resume.status = "parsed"
        db.commit()
        
        # Create user notification
        first_user = db.query(User).first()
        target_user_id = first_user.id if first_user else 1
        send_notification_to_user(
            db_user_id=target_user_id,
            title="File Processing Completed",
            message=f"Candidate {candidate.first_name} {candidate.last_name}'s resume has been screened successfully.",
            notification_type="success",
            db=db
        )
        
        # Calculate ranks across scored candidates for these jobs
        _recalculate_ranks_for_jobs(db, job_ids)

        logger.info(f"Resume {resume_id} successfully parsed and indexed.")
        return True
        
    except Exception as e:
        logger.error(f"Error in process_resume_workflow for resume {resume_id}: {e}", exc_info=True)
        try:
            first_user = db.query(User).first()
            target_user_id = first_user.id if first_user else 1
            resume_obj = db.query(Resume).filter(Resume.id == resume_id).first()
            file_name = resume_obj.file_name if resume_obj else f"ID {resume_id}"
            send_notification_to_user(
                db_user_id=target_user_id,
                title="Resume Processing Failed",
                message=f"An error occurred while parsing resume '{file_name}'. Please verify the document format.",
                notification_type="error",
                db=db
            )
        except Exception as notif_err:
            logger.error(f"Failed to send error notification: {notif_err}")
        # Attempt to mark failed
        try:
            resume = db.query(Resume).filter(Resume.id == resume_id).first()
            if resume:
                resume.status = "failed"
                db.commit()
        except Exception:
            pass
        return False
    finally:
        db.close()

def _recalculate_ranks_for_jobs(db: Session, job_ids: list):
    for job_id in job_ids:
        scores = db.query(CandidateScore).filter(
            CandidateScore.job_id == job_id
        ).order_by(CandidateScore.overall_score.desc()).all()
        
        for idx, score in enumerate(scores):
            score.ranked_position = idx + 1
        db.commit()

# ==========================================
# CELERY TASK WRAPPERS
# ==========================================

from backend.app.tasks.celery_app import celery_app

@celery_app.task(name="backend.app.tasks.process_resume_task")
def process_resume_task(resume_id: int, job_ids: list = None):
    """
    Celery worker entrypoint task.
    """
    logger.info(f"Celery task started: parsing resume {resume_id}")
    return process_resume_workflow(resume_id, job_ids)
