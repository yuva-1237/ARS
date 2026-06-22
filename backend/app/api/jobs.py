from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.models import JobDescription, User, Candidate, CandidateScore, Resume
from backend.app.schemas import JobDescriptionCreate, JobDescriptionUpdate, JobDescriptionOut
from backend.app.api.deps import get_current_user, RoleChecker
from backend.app.services.gemini_service import extract_job_features, match_candidate_to_job
from backend.app.tasks.resume_tasks import process_resume_workflow

router = APIRouter()

# Recruiter, HR Manager, and Admin can manage jobs
hiring_staff_only = RoleChecker(["recruiter", "hr_manager", "admin"])

@router.post("/", response_model=JobDescriptionOut, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobDescriptionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(hiring_staff_only)
):
    """
    Creates a new job description. Automatically schedules Gemini features extraction.
    """
    new_job = JobDescription(
        title=job_in.title,
        department=job_in.department,
        location=job_in.location,
        description=job_in.description,
        status=job_in.status,
        created_by=current_user.id
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    
    # Run AI feature extraction asynchronously to not block the request
    background_tasks.add_task(ai_extract_job_parameters, new_job.id)
    
    return new_job

@router.get("/", response_model=List[JobDescriptionOut])
def list_jobs(
    status: Optional[str] = "active",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve job description list.
    """
    query = db.query(JobDescription)
    if status:
        query = query.filter(JobDescription.status == status)
    return query.all()

@router.get("/{job_id}", response_model=JobDescriptionOut)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single job description by ID.
    """
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")
    return job

@router.put("/{job_id}", response_model=JobDescriptionOut)
def update_job(
    job_id: int,
    job_in: JobDescriptionUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(hiring_staff_only)
):
    """
    Updates an existing job. Trigger AI feature re-extraction if description changes.
    """
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")
        
    trigger_extract = False
    
    for field, value in job_in.dict(exclude_unset=True).items():
        if field == "description" and value != job.description:
            trigger_extract = True
        setattr(job, field, value)
        
    db.commit()
    db.refresh(job)
    
    if trigger_extract:
        background_tasks.add_task(ai_extract_job_parameters, job.id)
        
    return job

@router.delete("/{job_id}", response_model=JobDescriptionOut)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(hiring_staff_only)
):
    """
    Archives a job description.
    """
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")
    
    job.status = "archived"
    db.commit()
    db.refresh(job)
    return job

@router.post("/{job_id}/recalculate")
def recalculate_job_scores(
    job_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(hiring_staff_only)
):
    """
    Triggers re-scoring for all candidates against this job (e.g. after updating parameters).
    """
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Find all candidates with parsed resumes
    resumes = db.query(Resume).filter(Resume.status == "parsed").all()
    resume_ids = [r.id for r in resumes]
    
    for r_id in resume_ids:
        background_tasks.add_task(process_resume_workflow, r_id, [job_id])
        
    return {"message": f"Triggered score recalculation for {len(resume_ids)} candidates."}

# ==========================================
# WORKER FUNCTION FOR JOB EXTRACTION
# ==========================================

def ai_extract_job_parameters(job_id: int):
    """
    Helper to run Gemini extraction and update job.
    """
    db = get_db()
    try:
        session = next(db)
        job = session.query(JobDescription).filter(JobDescription.id == job_id).first()
        if not job:
            return
            
        features = extract_job_features(job.description)
        
        job.required_skills = features.get("required_skills", [])
        job.preferred_skills = features.get("preferred_skills", [])
        job.experience_years = features.get("experience_years", 0)
        job.education_requirements = features.get("education_requirements", "")
        job.responsibilities = features.get("responsibilities", [])
        job.keywords = features.get("keywords", [])
        
        session.commit()
        
        # After job parameters are extracted, trigger candidate matching for all candidates
        # to ensure initial scores populate immediately
        resumes = session.query(Resume).filter(Resume.status == "parsed").all()
        for r in resumes:
            # Run matching synchronously in the background thread
            process_resume_workflow(r.id, [job_id])
            
    except Exception as e:
        print(f"Error in job AI parameter extraction: {e}")
