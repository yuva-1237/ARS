from pydantic import BaseModel, EmailStr, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

# ==========================================
# AUTHENTICATION & USER SCHEMAS
# ==========================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "recruiter" # recruiter, hr_manager, admin

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


# ==========================================
# JOB DESCRIPTION SCHEMAS
# ==========================================

class JobDescriptionBase(BaseModel):
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    description: str
    status: str = "active" # active, draft, archived

class JobDescriptionCreate(JobDescriptionBase):
    pass

class JobDescriptionUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    education_requirements: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    keywords: Optional[List[str]] = None

class JobDescriptionOut(JobDescriptionBase):
    id: int
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    education_requirements: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# RESUME & CANDIDATE SCHEMAS
# ==========================================

class ResumeOut(BaseModel):
    id: int
    file_name: str
    file_type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class CandidateBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    status: str = "new"

class CandidateOut(CandidateBase):
    id: int
    resume_id: int
    skills: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CandidateDetailOut(CandidateOut):
    education: Optional[List[Dict[str, Any]]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    achievements: Optional[List[str]] = None

    class Config:
        from_attributes = True


# ==========================================
# AI SCORES & FRAUD SCHEMAS
# ==========================================

class CandidateScoreOut(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    overall_score: float
    skill_score: float
    experience_score: float
    education_score: float
    certification_score: float
    project_score: float
    keyword_score: float
    semantic_score: float
    explanation: Optional[str] = None
    confidence_score: float
    ranked_position: Optional[int] = None
    fraud_risk_score: float
    fraud_risk_report: Optional[List[Dict[str, Any]]] = None
    ai_summary: Optional[str] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# INTERVIEW QUESTION SCHEMAS
# ==========================================

class InterviewQuestionOut(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    question_text: str
    category: str
    difficulty: str
    ideal_answer: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# COPILOT & CHAT SCHEMAS
# ==========================================

class ChatMessage(BaseModel):
    role: str # user, assistant
    content: str
    created_at: Optional[datetime] = None

class ChatRequest(BaseModel):
    session_id: str
    message: str
    job_id: Optional[int] = None

class ChatResponse(BaseModel):
    answer: str
    session_id: str
    suggested_candidates: List[Dict[str, Any]] = []


# ==========================================
# NOTIFICATION SCHEMAS
# ==========================================

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    is_read: bool
    notification_type: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# CONFIGURATION & SETTINGS SCHEMAS
# ==========================================

class AIScoringWeights(BaseModel):
    skill_weight: float = 0.25
    experience_weight: float = 0.25
    education_weight: float = 0.15
    certification_weight: float = 0.10
    project_weight: float = 0.10
    keyword_weight: float = 0.05
    semantic_weight: float = 0.10

class SettingsOut(BaseModel):
    organization_name: str = "Enterprise Recruiter Platform"
    scoring_weights: AIScoringWeights = AIScoringWeights()
    gemini_api_key_configured: bool = False
