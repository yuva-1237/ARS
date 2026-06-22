import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="recruiter", nullable=False)  # admin, hr_manager, recruiter
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    jobs = relationship("JobDescription", back_populates="creator")
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    department = Column(String, nullable=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    status = Column(String, default="active", nullable=False) # active, draft, archived
    
    # AI Extracted features
    required_skills = Column(JSON, nullable=True)       # List of strings
    preferred_skills = Column(JSON, nullable=True)      # List of strings
    experience_years = Column(Integer, nullable=True)
    education_requirements = Column(String, nullable=True)
    responsibilities = Column(JSON, nullable=True)      # List of strings
    keywords = Column(JSON, nullable=True)              # List of strings
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="jobs")
    candidate_scores = relationship("CandidateScore", back_populates="job", cascade="all, delete-orphan")
    interview_questions = relationship("InterviewQuestion", back_populates="job", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # PDF, DOCX, TXT, Image
    raw_text = Column(Text, nullable=True)
    status = Column(String, default="pending", nullable=False) # pending, processing, parsed, failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    candidate = relationship("Candidate", back_populates="resume", uselist=False, cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    first_name = Column(String, index=True, nullable=True)
    last_name = Column(String, index=True, nullable=True)
    email = Column(String, index=True, nullable=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    github = Column(String, nullable=True)
    portfolio = Column(String, nullable=True)
    
    # Structured resume data
    education = Column(JSON, nullable=True)       # List of Dict (school, degree, major, year, gpa)
    skills = Column(JSON, nullable=True)          # List of strings
    experience = Column(JSON, nullable=True)     # List of Dict (company, role, start_date, end_date, description)
    projects = Column(JSON, nullable=True)       # List of Dict (title, description, url, technologies)
    certifications = Column(JSON, nullable=True) # List of strings or Dict
    languages = Column(JSON, nullable=True)      # List of strings or Dict
    achievements = Column(JSON, nullable=True)   # List of strings
    
    status = Column(String, default="new", nullable=False) # new, screening, interviewed, offered, rejected
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    resume = relationship("Resume", back_populates="candidate")
    scores = relationship("CandidateScore", back_populates="candidate", cascade="all, delete-orphan")
    interview_questions = relationship("InterviewQuestion", back_populates="candidate", cascade="all, delete-orphan")


class CandidateScore(Base):
    __tablename__ = "candidate_scores"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False)
    
    # Matching Scores (0-100)
    overall_score = Column(Float, nullable=False, default=0.0)
    skill_score = Column(Float, nullable=False, default=0.0)
    experience_score = Column(Float, nullable=False, default=0.0)
    education_score = Column(Float, nullable=False, default=0.0)
    certification_score = Column(Float, nullable=False, default=0.0)
    project_score = Column(Float, nullable=False, default=0.0)
    keyword_score = Column(Float, nullable=False, default=0.0)
    semantic_score = Column(Float, nullable=False, default=0.0)
    
    explanation = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=False, default=0.0)
    ranked_position = Column(Integer, nullable=True)
    
    # Fraud Detection (0-100)
    fraud_risk_score = Column(Float, nullable=False, default=0.0)
    fraud_risk_report = Column(JSON, nullable=True) # List of risks detected
    
    # AI Summary
    ai_summary = Column(Text, nullable=True)
    strengths = Column(JSON, nullable=True) # List of strings
    weaknesses = Column(JSON, nullable=True) # List of strings
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    candidate = relationship("Candidate", back_populates="scores")
    job = relationship("JobDescription", back_populates="candidate_scores")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False)
    
    question_text = Column(Text, nullable=False)
    category = Column(String, nullable=False) # technical, behavioral, situational, system_design, coding
    difficulty = Column(String, nullable=False) # easy, medium, hard
    ideal_answer = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    candidate = relationship("Candidate", back_populates="interview_questions")
    job = relationship("JobDescription", back_populates="interview_questions")


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False) # user, assistant
    message_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    notification_type = Column(String, nullable=False) # processing_complete, interview_recommendation, general
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)
    target_table = Column(String, nullable=True)
    target_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
