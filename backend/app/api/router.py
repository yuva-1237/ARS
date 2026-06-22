from fastapi import APIRouter
from backend.app.api import auth, jobs, candidates, upload, copilot, analytics, settings

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Job Management"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["Candidates"])
api_router.include_router(upload.router, prefix="/upload", tags=["Resume Upload"])
api_router.include_router(copilot.router, prefix="/copilot", tags=["AI Copilot Chat"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Hiring Analytics"])
api_router.include_router(settings.router, prefix="/settings", tags=["Platform Settings"])
