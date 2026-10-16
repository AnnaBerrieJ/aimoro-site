"""Timeline events and customer/admin notifications.

Email goes through Resend (https://resend.com) when RESEND_API_KEY and
EMAIL_FROM are set; otherwise each message is logged with status "skipped"
so nothing breaks in development. Sending happens in a background task so a
slow mail API never delays the page.

WhatsApp: the admin page builds a wa.me link with the same message text,
so Ashley can forward any update in one tap.
"""
import html
import os
import re

import httpx
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from .auth import admin_emails
from .db import SessionLocal
from .models import Notification, ProductRequest, RequestEvent

SITE_URL = os.getenv("SITE_URL", "http://localhost:3000").rstrip("/")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "aimoroinfo@gmail.com")
CONTACT_WHATSAPP = os.getenv("CONTACT_WHATSAPP", "+1 281-673-6703")
EMAIL_LOGO_URL = os.getenv("EMAIL_LOGO_URL", f"{SITE_URL}/email-logo.png")
SIGNATURE_TEXT = (f"AIMORO\n{SITE_URL.split('://')[-1]} | {CONTACT_EMAIL} | WhatsApp {CONTACT_WHATSAPP}\n"
                  "You tell us what you want. We find it and deliver it to your door.")


def add_event(db: Session, req: ProductRequest, kind: str, message: str, visible: bool = True) -> RequestEvent:
    ev = RequestEvent(request_id=req.id, kind=kind, message=message, customer_visible=visible)
    db.add(ev)
    return ev


def _request_link(req: ProductRequest) -> str:
    return f"{SITE_URL}/my-requests/{req.id}"


def _email_body(name: str, message: str, link: str) -> str:
    return (f"Hi {name},\n\n{message}\n\nView your request: {link}\n\n"
            f"Questions? Reply to this email or write to {CONTACT_EMAIL}.")


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


def email_html(body: str) -> str:
    """Branded HTML version of a plain-text notification, with the AIMORO signature footer."""
    text = html.escape(body)
    text = re.sub(r"(https?://[^\s<]+)", r'<a href="\1" style="color:#C40000;font-weight:bold;">\1</a>', text)
    paras = "".join(f'<p style="margin:0 0 14px;">{p.replace(chr(10), "<br>")}</p>' for p in text.split("\n\n"))
    wa = re.sub(r"\D", "", CONTACT_WHATSAPP)
    site = SITE_URL.split("://")[-1]
    return f"""<!doctype html><html><body style="margin:0;padding:0;background:#F1F5F9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
<tr><td style="height:5px;background:#C40000;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:28px 28px 8px;font-size:15px;line-height:22px;">{paras}</td></tr>
<tr><td style="padding:8px 28px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" style="border-top:1px solid #E2E8F0;padding-top:18px;width:100%;"><tr>
<td style="padding:18px 16px 0 0;vertical-align:middle;width:70px;"><a href="{SITE_URL}"><img src="{EMAIL_LOGO_URL}" width="64" height="70" alt="AIMORO" style="display:block;border:0;"></a></td>
<td style="padding:18px 0 0 14px;border-left:3px solid #C40000;vertical-align:middle;font-size:12px;line-height:18px;color:#475569;">
<div style="font-size:14px;font-weight:bold;color:#C40000;">AIMORO</div>
<a href="{SITE_URL}" style="color:#0F172A;text-decoration:none;font-weight:bold;">{site}</a> &nbsp;|&nbsp;
<a href="mailto:{CONTACT_EMAIL}" style="color:#475569;text-decoration:none;">{CONTACT_EMAIL}</a><br>
WhatsApp: <a href="https://wa.me/{wa}" style="color:#475569;text-decoration:none;">{CONTACT_WHATSAPP}</a><br>
<span style="color:#94A3B8;font-style:italic;">You tell us what you want. We find it and deliver it to your door.</span>
</td></tr></table>
</td></tr></table>
</td></tr></table></body></html>"""


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
                          "subject": n.subject, "text": f"{n.body}\n\n--\n{SIGNATURE_TEXT}",
                          "html": email_html(n.body), "reply_to": CONTACT_EMAIL},
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
