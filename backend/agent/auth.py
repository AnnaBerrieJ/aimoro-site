"""Password hashing, JWT tokens and role checks.

Env:
  SECRET_KEY    - required in production; signs login tokens.
  ADMIN_EMAILS  - comma-separated; signing up with one of these emails
                  creates an admin account (that's how Ashley gets admin).
"""
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import User

_DEV_KEY = "dev-only-insecure-key-change-me-before-deploying"
SECRET_KEY = os.getenv("SECRET_KEY", _DEV_KEY)
# Render sets RENDER=true. Refuse to run a public server with the dev key,
# since anyone could forge an admin login with it.
if SECRET_KEY == _DEV_KEY and (os.getenv("RENDER") or os.getenv("ENV") == "production"):
    raise RuntimeError("Set SECRET_KEY in the deployment environment before starting the server")
ALGORITHM = "HS256"
TOKEN_DAYS = 7

_bearer = HTTPBearer(auto_error=False)


def admin_emails() -> set[str]:
    return {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not logged in")
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired login")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    # Role is read from the database, not the token, so demoting takes effect immediately.
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin only")
    return user
