import os
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.schemas import SettingsOut, AIScoringWeights
from backend.app.models import User
from backend.app.api.deps import get_current_user, RoleChecker

router = APIRouter()
admin_only = RoleChecker(["admin", "hr_manager"])

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
    current_user: User = Depends(admin_only)
):
    """
    Updates platform scoring weights (restricted to HR Managers and Admins).
    """
    data = {
        "organization_name": org_name,
        "scoring_weights": weights.dict()
    }
    save_local_settings(data)
    return {
        "organization_name": org_name,
        "scoring_weights": weights,
        "gemini_api_key_configured": bool(settings.GEMINI_API_KEY)
    }
