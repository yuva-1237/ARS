import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.core.security import get_password_hash
from backend.app.api.router import api_router
from backend.app.models import User

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Database tables on startup (Standard for simple deployments, Alembic can be added)
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized.")
except Exception as e:
    logger.error(f"Error initializing database: {e}")

# Seed default admin user if none exist
def seed_admin_user():
    db = SessionLocal()
    try:
        admin_exists = db.query(User).filter(User.email == "admin@ars.com").first()
        if not admin_exists:
            hashed_pwd = get_password_hash("adminpass")
            default_admin = User(
                email="admin@ars.com",
                hashed_password=hashed_pwd,
                full_name="System Administrator",
                role="admin",
                is_active=True
            )
            db.add(default_admin)
            
            # Also seed a default recruiter and HR manager for test purposes
            default_recruiter = User(
                email="recruiter@ars.com",
                hashed_password=get_password_hash("recruiterpass"),
                full_name="Jane Recruiter",
                role="recruiter",
                is_active=True
            )
            db.add(default_recruiter)
            
            default_hr = User(
                email="hr@ars.com",
                hashed_password=get_password_hash("hrpass"),
                full_name="Mark HR Manager",
                role="hr_manager",
                is_active=True
            )
            db.add(default_hr)
            
            db.commit()
            logger.info("Default seed users created: admin@ars.com, recruiter@ars.com, hr@ars.com")
    except Exception as e:
        logger.error(f"Error seeding database users: {e}")
    finally:
        db.close()

seed_admin_user()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware Configuration
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount Routers
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "platform": settings.PROJECT_NAME,
        "docs": "/docs"
    }
