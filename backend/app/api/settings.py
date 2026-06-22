import os
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.schemas import SettingsOut, AIScoringWeights
from backend.app.models import User, CandidateScore
from backend.app.api.deps import get_current_user, RoleChecker

router = APIRouter()
# Settings can be updated by any authenticated hiring staff
settings_update_allowed = RoleChecker(["admin", "hr_manager", "recruiter"])

SETTINGS_FILE = "data/settings.json"

def load_local_settings() -> dict:
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "organization_name": "Enterprise Recruiter Platform",
        "scoring_weights": {
            "skill_weight": 0.25,
            "experience_weight": 0.25,
            "education_weight": 0.15,
            "certification_weight": 0.10,
            "project_weight": 0.10,
            "keyword_weight": 0.05,
            "semantic_weight": 0.10
        }
    }

def save_local_settings(data: dict):
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f, indent=4)

@router.get("/", response_model=SettingsOut)
def get_platform_settings(current_user: User = Depends(get_current_user)):
    """
    Get organizational settings and scoring configurations.
    """
    data = load_local_settings()
    return {
        "organization_name": data.get("organization_name", "Enterprise Recruiter Platform"),
        "scoring_weights": data.get("scoring_weights"),
        "gemini_api_key_configured": bool(settings.GEMINI_API_KEY)
    }

@router.put("/", response_model=SettingsOut)
def update_platform_settings(
    org_name: str,
    weights: AIScoringWeights,
    current_user: User = Depends(settings_update_allowed),
    db: Session = Depends(get_db)
):
    """
    Updates platform scoring weights (restricted to HR Managers and Admins) and re-scores candidates.
    """
    data = {
        "organization_name": org_name,
        "scoring_weights": weights.dict()
    }
    save_local_settings(data)
    
    # Recalculate existing CandidateScores
    scores = db.query(CandidateScore).all()
    
    skill_w = weights.skill_weight
    exp_w = weights.experience_weight
    edu_w = weights.education_weight
    cert_w = weights.certification_weight
    proj_w = weights.project_weight
    key_w = weights.keyword_weight
    sem_w = weights.semantic_weight
    
    total_w = skill_w + exp_w + edu_w + cert_w + proj_w + key_w + sem_w
    
    job_ids = set()
    for score in scores:
        job_ids.add(score.job_id)
        if total_w > 0:
            weighted_score = (
                (score.skill_score * skill_w) +
                (score.experience_score * exp_w) +
                (score.education_score * edu_w) +
                (score.certification_score * cert_w) +
                (score.project_score * proj_w) +
                (score.keyword_score * key_w) +
                (score.semantic_score * sem_w)
            ) / total_w
        else:
            weighted_score = score.overall_score
            
        score.overall_score = round(float(weighted_score), 1)
        
    db.commit()
    
    # Recalculate rankings for affected jobs
    if job_ids:
        from backend.app.tasks.resume_tasks import _recalculate_ranks_for_jobs
        _recalculate_ranks_for_jobs(db, list(job_ids))
        
    return {
        "organization_name": org_name,
        "scoring_weights": weights,
        "gemini_api_key_configured": bool(settings.GEMINI_API_KEY)
    }
