from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import (admin_emails, create_reset_token, create_token, get_current_user, hash_password,
                    user_from_reset_token, verify_password)
from ..db import get_db
from ..models import User
from ..notify import send_password_reset, send_welcome
from ..schemas import ForgotPasswordIn, LoginIn, ResetPasswordIn, SignupIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenOut)
def signup(body: SignupIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(409, "An account with this email already exists")
    is_admin = body.email in admin_emails()
    if not is_admin and not body.phone:
        raise HTTPException(400, "Please add your phone / WhatsApp number with the area code")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role="admin" if is_admin else "customer",
        name=body.name.strip(),
        phone=body.phone.strip(),
        country=body.country,
        island=body.island.strip(),
        address=body.address.strip(),
    )
    db.add(user)
    db.flush()
    if user.role == "customer":
        send_welcome(db, background, user)
    db.commit()
    return TokenOut(token=create_token(user), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Wrong email or password")
    return TokenOut(token=create_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    """Always answers the same way, so it can't be used to find out who has an account."""
    user = db.scalar(select(User).where(User.email == body.email))
    if user is not None:
        send_password_reset(db, background, user, create_reset_token(user))
        db.commit()
    return {"ok": True}


@router.post("/reset-password", response_model=TokenOut)
def reset_password(body: ResetPasswordIn, db: Session = Depends(get_db)):
    user = user_from_reset_token(db, body.token)
    user.password_hash = hash_password(body.password)
    db.commit()
    return TokenOut(token=create_token(user), user=UserOut.model_validate(user))
