"""Timeline events and customer/admin notifications.

Email goes through Resend (https://resend.com) when RESEND_API_KEY and
EMAIL_FROM are set; otherwise each message is logged with status "skipped"
so nothing breaks in development. Sending happens in a background task so a
slow mail API never delays the page.

WhatsApp: the admin page builds a wa.me link with the same message text,
so Ashley can forward any update in one tap.
"""
import os

import httpx
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from .auth import admin_emails
from .db import SessionLocal
from .models import Notification, ProductRequest, RequestEvent

SITE_URL = os.getenv("SITE_URL", "http://localhost:3000").rstrip("/")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "aimoroinfo@gmail.com")


def add_event(db: Session, req: ProductRequest, kind: str, message: str, visible: bool = True) -> RequestEvent:
    ev = RequestEvent(request_id=req.id, kind=kind, message=message, customer_visible=visible)
    db.add(ev)
    return ev


def _request_link(req: ProductRequest) -> str:
    return f"{SITE_URL}/my-requests/{req.id}"


def _email_body(name: str, message: str, link: str) -> str:
    return (f"Hi {name},\n\n{message}\n\nView your request: {link}\n\n"
            f"Questions? Reply to this email or write to {CONTACT_EMAIL}.\n\n— AIMORO")


def notify_customer(db: Session, background: BackgroundTasks | None, req: ProductRequest,
                    subject: str, message: str) -> Notification:
    user = req.user
    n = Notification(
        user_id=user.id, request_id=req.id, channel="email", to_address=user.email,
        subject=f"{subject} · {req.product_name}",
        body=_email_body(user.name.split(" ")[0] or user.name, message, _request_link(req)),
    )
    db.add(n)
    db.flush()
    if background is not None:
        background.add_task(deliver, n.id)
    return n


def notify_admins(db: Session, background: BackgroundTasks | None, req: ProductRequest,
                  subject: str, message: str) -> None:
    for email in sorted(admin_emails()):
        n = Notification(
            request_id=req.id, channel="email", to_address=email, subject=subject,
            body=f"{message}\n\nOpen: {SITE_URL}/admin/requests/{req.id}",
        )
        db.add(n)
        db.flush()
        if background is not None:
            background.add_task(deliver, n.id)


def email_enabled() -> bool:
    return bool(os.getenv("RESEND_API_KEY") and os.getenv("EMAIL_FROM"))


def deliver(notification_id: int) -> None:
    """Runs after the response is sent. Never raises."""
    db = SessionLocal()
    try:
        n = db.get(Notification, notification_id)
        if n is None or n.status != "queued":
            return
        if not email_enabled():
            n.status = "skipped"
            n.error = "Email not configured (set RESEND_API_KEY and EMAIL_FROM)"
        else:
            try:
                resp = httpx.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}"},
                    json={"from": os.environ["EMAIL_FROM"], "to": [n.to_address],
                          "subject": n.subject, "text": n.body, "reply_to": CONTACT_EMAIL},
                    timeout=10,
                )
                resp.raise_for_status()
                n.status = "sent"
            except Exception as exc:  # noqa: BLE001
                n.status = "failed"
                n.error = str(exc)[:500]
        db.commit()
    finally:
        db.close()
