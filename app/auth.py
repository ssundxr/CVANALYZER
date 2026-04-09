from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import AdminUser

ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 390000
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24


def hash_password(password: str, *, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERATIONS)
    return f"{ALGORITHM}${ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    algorithm, iterations, salt, digest = stored.split("$", 3)
    if algorithm != ALGORITHM:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iterations)).hex()
    return hmac.compare_digest(candidate, digest)


def authenticate_user(db: Session, username: str, password: str) -> AdminUser | None:
    user = db.scalar(select(AdminUser).where(AdminUser.username == username.strip()))
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def create_access_token(user_id: int, secret_key: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, secret_key, algorithm=JWT_ALGORITHM)


def get_current_user(request: Request, db: Session) -> AdminUser | None:
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    return db.get(AdminUser, user_id)


def require_admin_api(request: Request, db: Session = Depends(get_db)) -> AdminUser:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            from .config import settings
            payload = jwt.decode(token, settings.secret_key, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                user = db.get(AdminUser, int(user_id))
                if user:
                    return user
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired.")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token.")
    user = get_current_user(request, db)
    if user:
        return user
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")


def authenticate_candidate(db: Session, email: str, password: str):
    from .models import Candidate
    candidate = db.scalar(select(Candidate).where(Candidate.email == email.strip()))
    if not candidate or not verify_password(password, candidate.password_hash):
        return None
    return candidate


def require_candidate_api(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            from .config import settings
            from .models import Candidate
            payload = jwt.decode(token, settings.secret_key, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            role = payload.get("role")
            if user_id and role == "candidate":
                candidate = db.get(Candidate, int(user_id))
                if candidate:
                    return candidate
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired.")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token.")
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Candidate authentication required.")

def create_candidate_access_token(candidate_id: int, secret_key: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode({"sub": str(candidate_id), "role": "candidate", "exp": expire}, secret_key, algorithm=JWT_ALGORITHM)
