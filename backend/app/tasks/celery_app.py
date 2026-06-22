import os
from celery import Celery
from backend.app.core.config import settings

# Initialize Celery app
celery_app = Celery(
    "ars_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Make tasks run locally/synchronously if Redis is unavailable or celery is run in memory
    task_always_eager=os.getenv("CELERY_ALWAYS_EAGER", "False").lower() in ("true", "1", "yes")
)

# Auto-discover tasks from resume_tasks module
celery_app.autodiscover_tasks(["backend.app.tasks"])
