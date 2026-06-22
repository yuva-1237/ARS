import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.models import Candidate, CandidateScore, InterviewQuestion, Resume, User, JobDescription
from backend.app.schemas import CandidateOut, CandidateDetailOut, CandidateScoreOut, InterviewQuestionOut
from backend.app.api.deps import get_current_user, RoleChecker

router = APIRouter()

# Recruiter, HR Manager, and Admin can view/edit candidate profiles
hiring_staff_only = RoleChecker(["recruiter", "hr_manager", "admin"])

@router.get("/")
def list_candidates(
    job_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists candidates with filters, pagination, and sorting by job match score if job_id is provided.
    """
    skip = (page - 1) * limit
    
    if job_id:
        # Join with CandidateScore to sort by score
        query = db.query(Candidate, CandidateScore).join(
            CandidateScore, Candidate.id == CandidateScore.candidate_id
        ).filter(CandidateScore.job_id == job_id)
        
        if status:
            query = query.filter(Candidate.status == status)
            
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    Candidate.first_name.ilike(search_filter),
                    Candidate.last_name.ilike(search_filter),
                    Candidate.email.ilike(search_filter),
                    Candidate.skills.cast(str).ilike(search_filter)
                )
            )
            
        # Order by rank/score
        query = query.order_by(CandidateScore.overall_score.desc())
        total = query.count()
        results = query.offset(skip).limit(limit).all()
        
        items = []
        for candidate, score in results:
            item = {
                "id": candidate.id,
                "resume_id": candidate.resume_id,
                "first_name": candidate.first_name,
                "last_name": candidate.last_name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location": candidate.location,
                "skills": candidate.skills,
                "status": candidate.status,
                "created_at": candidate.created_at,
                "match_score": score.overall_score,
                "rank": score.ranked_position,
                "fraud_risk_score": score.fraud_risk_score
            }
            items.append(item)
            
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "items": items
        }
    else:
        # Generic candidate list
        query = db.query(Candidate)
        if status:
            query = query.filter(Candidate.status == status)
            
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    Candidate.first_name.ilike(search_filter),
                    Candidate.last_name.ilike(search_filter),
                    Candidate.email.ilike(search_filter),
                    Candidate.skills.cast(str).ilike(search_filter)
                )
            )
            
        total = query.count()
        candidates = query.offset(skip).limit(limit).all()
        
        items = []
        for c in candidates:
            # Get highest overall score for status display if available
            best_score = db.query(CandidateScore).filter(
                CandidateScore.candidate_id == c.id
            ).order_by(CandidateScore.overall_score.desc()).first()
            
            items.append({
                "id": c.id,
                "resume_id": c.resume_id,
                "first_name": c.first_name,
                "last_name": c.last_name,
                "email": c.email,
                "phone": c.phone,
                "location": c.location,
                "skills": c.skills,
                "status": c.status,
                "created_at": c.created_at,
                "match_score": best_score.overall_score if best_score else None,
                "rank": None,
                "fraud_risk_score": best_score.fraud_risk_score if best_score else 0.0
            })
            
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "items": items
        }

@router.get("/{candidate_id}", response_model=CandidateDetailOut)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed candidate profile.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@router.get("/{candidate_id}/score/{job_id}", response_model=CandidateScoreOut)
def get_candidate_score(
    candidate_id: int,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed AI score and fraud report for a specific job.
    """
    score = db.query(CandidateScore).filter(
        CandidateScore.candidate_id == candidate_id,
        CandidateScore.job_id == job_id
    ).first()
    
    if not score:
        raise HTTPException(
            status_code=404, 
            detail="Score record not found. Ensure candidate has been screened for this job."
        )
    return score

@router.get("/{candidate_id}/scores")
def get_candidate_all_scores(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all job match scores for a candidate, including job titles.
    """
    results = db.query(CandidateScore, JobDescription).join(
        JobDescription, CandidateScore.job_id == JobDescription.id
    ).filter(
        CandidateScore.candidate_id == candidate_id
    ).all()
    
    scores = []
    for score, job in results:
        scores.append({
            "id": score.id,
            "candidate_id": score.candidate_id,
            "job_id": score.job_id,
            "job_title": job.title,
            "overall_score": score.overall_score,
            "skill_score": score.skill_score,
            "experience_score": score.experience_score,
            "education_score": score.education_score,
            "certification_score": score.certification_score,
            "project_score": score.project_score,
            "keyword_score": score.keyword_score,
            "semantic_score": score.semantic_score,
            "explanation": score.explanation,
            "confidence_score": score.confidence_score,
            "ranked_position": score.ranked_position,
            "fraud_risk_score": score.fraud_risk_score,
            "fraud_risk_report": score.fraud_risk_report,
            "ai_summary": score.ai_summary,
            "strengths": score.strengths,
            "weaknesses": score.weaknesses,
            "created_at": score.created_at
        })
    return scores

@router.put("/{candidate_id}/status")
def update_candidate_status(
    candidate_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(hiring_staff_only)
):
    """
    Updates the hiring status of the candidate (e.g. screened, interviewed, offered, rejected).
    """
    valid_statuses = ["new", "screening", "interviewed", "offered", "rejected"]
    if status.lower() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
        
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    candidate.status = status.lower()
    db.commit()
    return {"message": "Status updated successfully", "status": candidate.status}

@router.get("/{candidate_id}/resume")
def download_candidate_resume(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Downloads/streams the original resume file.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    resume = db.query(Resume).filter(Resume.id == candidate.resume_id).first()
    if not resume or not os.path.exists(resume.file_path):
        raise HTTPException(status_code=404, detail="Resume file not found on disk")
        
    return FileResponse(
        path=resume.file_path,
        filename=resume.file_name,
        media_type="application/octet-stream"
    )

@router.get("/{candidate_id}/questions/{job_id}", response_model=List[InterviewQuestionOut])
def get_interview_questions(
    candidate_id: int,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves AI generated interview questions for a candidate on a job.
    """
    questions = db.query(InterviewQuestion).filter(
        InterviewQuestion.candidate_id == candidate_id,
        InterviewQuestion.job_id == job_id
    ).all()
    return questions
