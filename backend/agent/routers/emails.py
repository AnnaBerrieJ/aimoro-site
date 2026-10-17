"""Admin email review: edit automatic customer emails before they send, or write new ones from templates."""
import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..db import get_db
from ..email_templates import email_templates
from ..models import Notification, ProductRequest
from ..notify import build_attachments, deliver, email_html
from ..schemas import EmailDraftBrief, EmailIn, EmailPreviewIn, EmailTemplateOut, EmailUpdate, NotificationOut

router = APIRouter(prefix="/admin", tags=["admin-emails"], dependencies=[Depends(require_admin)])


def _req(db: Session, request_id: int) -> ProductRequest:
    req = db.get(ProductRequest, request_id)
    if req is None:
        raise HTTPException(404, "Request not found")
    return req


def _draft(db: Session, notification_id: int) -> Notification:
    n = db.get(Notification, notification_id)
    if n is None:
        raise HTTPException(404, "Email not found")
    if n.status != "draft":
        raise HTTPException(400, "This email has already been sent or discarded")
    return n


def _check_attachments(db: Session, request_id: int | None, kinds: list[str]) -> None:
    try:
        build_attachments(db, request_id, kinds)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


def _queue(n: Notification, background: BackgroundTasks) -> None:
    n.status = "queued"
    background.add_task(deliver, n.id)


@router.get("/requests/{request_id}/email-templates", response_model=list[EmailTemplateOut])
def templates(request_id: int, db: Session = Depends(get_db)):
    return email_templates(_req(db, request_id))


@router.post("/requests/{request_id}/emails", response_model=NotificationOut)
def create_email(request_id: int, body: EmailIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    req = _req(db, request_id)
    _check_attachments(db, req.id, body.attachments)
    n = Notification(user_id=req.user_id, request_id=req.id, channel="email", to_address=req.user.email,
                     subject=body.subject, body=body.body, attachments=json.dumps(body.attachments), status="draft")
    db.add(n)
    db.flush()
    if body.send:
        _queue(n, background)
    db.commit()
    return NotificationOut.model_validate(n)


@router.patch("/notifications/{notification_id}", response_model=NotificationOut)
def update_email(notification_id: int, body: EmailUpdate, db: Session = Depends(get_db)):
    n = _draft(db, notification_id)
    if body.subject is not None:
        n.subject = body.subject
    if body.body is not None:
        n.body = body.body
    if body.attachments is not None:
        _check_attachments(db, n.request_id, body.attachments)
        n.attachments = json.dumps(body.attachments)
    db.commit()
    return NotificationOut.model_validate(n)


@router.post("/notifications/{notification_id}/send", response_model=NotificationOut)
def send_email(notification_id: int, background: BackgroundTasks, db: Session = Depends(get_db)):
    n = _draft(db, notification_id)
    _check_attachments(db, n.request_id, json.loads(n.attachments or "[]"))
    _queue(n, background)
    db.commit()
    return NotificationOut.model_validate(n)


@router.post("/notifications/{notification_id}/discard", response_model=NotificationOut)
def discard_email(notification_id: int, db: Session = Depends(get_db)):
    n = _draft(db, notification_id)
    n.status = "discarded"
    db.commit()
    return NotificationOut.model_validate(n)


@router.post("/emails/preview")
def preview_email(body: EmailPreviewIn):
    return {"html": email_html(body.body)}


@router.get("/email-drafts", response_model=list[EmailDraftBrief])
def email_drafts(db: Session = Depends(get_db)):
    rows = db.scalars(select(Notification).where(Notification.status == "draft", Notification.user_id.is_not(None))
                      .order_by(Notification.id)).all()
    out = []
    for n in rows:
        req = db.get(ProductRequest, n.request_id) if n.request_id else None
        if req is None:
            continue
        out.append(EmailDraftBrief(id=n.id, request_id=req.id, product_name=req.product_name,
                                   customer_name=req.user.name, subject=n.subject, created_at=n.created_at))
    return out
