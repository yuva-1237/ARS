import csv
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List, Optional
from collections import Counter
from backend.app.core.database import get_db
from backend.app.models import Candidate, CandidateScore, JobDescription, Resume, User
from backend.app.api.deps import get_current_user, RoleChecker

router = APIRouter()
hr_only = RoleChecker(["hr_manager", "admin"])

@router.get("/")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns aggregated telemetry data for charts and dashboard cards.
    """
    # 1. Total Candidates count
    total_candidates = db.query(Candidate).count()
    
    # 2. Active Jobs count
    active_jobs = db.query(JobDescription).filter(JobDescription.status == "active").count()
    
    # 3. Average Match Score
    avg_score = db.query(func.avg(CandidateScore.overall_score)).scalar() or 0.0
    avg_score = round(float(avg_score), 1)
    
    # 4. Resume Processing Rate (parsed vs total)
    total_resumes = db.query(Resume).count()
    parsed_resumes = db.query(Resume).filter(Resume.status == "parsed").count()
    processing_rate = (parsed_resumes / total_resumes * 100) if total_resumes else 0.0
    processing_rate = round(processing_rate, 1)

    # 5. Funnel Distribution
    status_counts = db.query(Candidate.status, func.count(Candidate.id)).group_by(Candidate.status).all()
    funnel = {s: count for s, count in status_counts}
    # Enforce standard keys
    funnel_data = [
        {"stage": "Applied/New", "value": funnel.get("new", 0)},
        {"stage": "AI Screened", "value": funnel.get("screening", 0) + parsed_resumes},
        {"stage": "Interviewing", "value": funnel.get("interviewed", 0)},
        {"stage": "Offered", "value": funnel.get("offered", 0)},
        {"stage": "Rejected", "value": funnel.get("rejected", 0)},
    ]

    # 6. Applications by Job
    jobs = db.query(JobDescription).all()
    job_applications = []
    for job in jobs:
        count = db.query(CandidateScore).filter(CandidateScore.job_id == job.id).count()
        job_applications.append({
            "name": job.title,
            "count": count
        })
        
    # 7. Skill Distribution
    candidates = db.query(Candidate).all()
    all_skills = []
    for c in candidates:
        if c.skills:
            # skills is a list of strings
            all_skills.extend([s.strip().capitalize() for s in c.skills])
            
    skill_counts = Counter(all_skills).most_common(8)
    skill_distribution = [{"name": skill, "count": count} for skill, count in skill_counts]
    if not skill_distribution:
        skill_distribution = [
            {"name": "Python", "count": 0},
            {"name": "React", "count": 0},
            {"name": "SQL", "count": 0}
        ]

    # 8. Experience Years Breakdown
    experience_breakdown = [
        {"name": "Entry (0-2 yrs)", "value": 0},
        {"name": "Mid (3-5 yrs)", "value": 0},
        {"name": "Senior (5-8 yrs)", "value": 0},
        {"name": "Principal (8+ yrs)", "value": 0}
    ]
    
    for c in candidates:
        exp_years = len(c.experience) if c.experience else 0
        if exp_years <= 2:
            experience_breakdown[0]["value"] += 1
        elif exp_years <= 5:
            experience_breakdown[1]["value"] += 1
        elif exp_years <= 8:
            experience_breakdown[2]["value"] += 1
        else:
            experience_breakdown[3]["value"] += 1

    return {
        "metrics": {
            "total_candidates": total_candidates,
            "active_jobs": active_jobs,
            "avg_match_score": avg_score,
            "processing_rate": processing_rate,
            "interview_readiness_score": 78.5, # Custom metric
            "resume_total": total_resumes
        },
        "charts": {
            "applications_by_job": job_applications,
            "skill_distribution": skill_distribution,
            "candidate_funnel": funnel_data,
            "experience_breakdown": experience_breakdown
        }
    }

@router.get("/export")
def export_reports_csv(
    job_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exports candidates and scores as a streaming CSV file download.
    """
    output = StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Candidate ID", "First Name", "Last Name", "Email", "Phone", 
        "Location", "Hiring Status", "Job Applied", "Overall Score", 
        "Skill Match", "Experience Match", "Education Match", "Fraud Risk"
    ])
    
    query = db.query(Candidate, CandidateScore, JobDescription).join(
        CandidateScore, Candidate.id == CandidateScore.candidate_id
    ).join(
        JobDescription, CandidateScore.job_id == JobDescription.id
    )
    
    if job_id:
        query = query.filter(JobDescription.id == job_id)
        
    records = query.all()
    for cand, score, job in records:
        writer.writerow([
            cand.id, cand.first_name, cand.last_name, cand.email, cand.phone,
            cand.location, cand.status, job.title, score.overall_score,
            score.skill_score, score.experience_score, score.education_score,
            score.fraud_risk_score
        ])
        
    output.seek(0)
    
    filename = f"ars_candidates_report_{job_id or 'all'}.csv"
    
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
