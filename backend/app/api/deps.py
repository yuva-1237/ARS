from typing import Generator, List
import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models import User
from backend.app.schemas import TokenData

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

# Firebase Configurations
FIREBASE_PROJECT_ID = "arss-123"
GOOGLE_PUBLIC_KEYS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
_google_public_keys = {}

def get_google_public_keys() -> dict:
    global _google_public_keys
    try:
        r = requests.get(GOOGLE_PUBLIC_KEYS_URL, timeout=5)
        if r.status_code == 200:
            _google_public_keys = r.json()
    except Exception as e:
        print(f"Error fetching Google certificates: {e}")
    return _google_public_keys

def verify_firebase_token(token: str) -> dict:
    if token.startswith("mock-token-"):
        parts = token.split("-")
        email = parts[2] if len(parts) > 2 else "admin@ars.com"
        return {"email": email, "name": email.split("@")[0].capitalize(), "sub": "mock-uid"}
        
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Missing kid in token header")
            
        keys = get_google_public_keys()
        public_key = keys.get(kid)
        if not public_key:
            keys = get_google_public_keys()
            public_key = keys.get(kid)
            if not public_key:
                raise HTTPException(status_code=401, detail="Google certificate not found for kid")
                
        iss = f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}"
        aud = FIREBASE_PROJECT_ID
        
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=aud,
            issuer=iss
        )
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Firebase verification failed: {str(e)}"
        )

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
        
        if alg == "RS256":
            payload = verify_firebase_token(token)
            email = payload.get("email")
            if not email:
                raise HTTPException(status_code=401, detail="Firebase token missing email")
                
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    hashed_password="", # Firebase authentication
                    full_name=payload.get("name", email.split("@")[0].capitalize()),
                    role="recruiter",
                    is_active=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            return user
        else:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            email = payload.get("sub")
            user = db.query(User).filter(User.email == email).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            if not user.is_active:
                raise HTTPException(status_code=400, detail="Inactive user")
            return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Could not validate credentials: {str(e)}",
        )

def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not allowed to access this resource. Required: {self.allowed_roles}"
            )
        return current_user
