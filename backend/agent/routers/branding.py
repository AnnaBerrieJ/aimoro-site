"""Branding packages: order, invoice, design rounds (proofs + changes) and final files.

Flow: awaiting_payment -> in_design -> proofs_ready <-> changes_requested -> approved -> completed.
Each package includes a number of change rounds; the customer can ask for changes while rounds are
left, otherwise extra changes are an add-on arranged with AIMORO.
"""
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import payments
from ..auth import admin_emails, get_current_user, require_admin
from ..common import UPLOAD_DIR, upload_path
from ..db import get_db
from ..invoice_pdf import BRANDING_PACKAGE_ITEMS, BRANDING_PACKAGE_NAMES, branding_invoice_due, build_branding_invoice_pdf
from ..models import BRANDING_STATUSES, BrandingEvent, BrandingFile, BrandingProject, Notification, User
from ..notify import CONTACT_EMAIL, SITE_URL, deliver
from ..schemas import (AdminBrandingOut, AdminBrandingUpdate, AdminEventOut, BrandingChangesIn, BrandingFileOut,
                       BrandingIn, BrandingOut, CustomerBrief, EventOut, NotificationOut)

router = APIRouter(tags=["branding"])
admin_router = APIRouter(prefix="/admin/branding", tags=["admin-branding"], dependencies=[Depends(require_admin)])

PACKAGES = {
    "basic": {"name": "Basic", "price": 200.0, "rounds": 1, "days": "5 business days"},
    "standard": {"name": "Standard", "price": 400.0, "rounds": 2, "days": "7 to 10 business days"},
    "full": {"name": "Full", "price": 600.0, "rounds": 3, "days": "10 to 14 business days"},
}
assert {k: v["name"] for k, v in PACKAGES.items()} == BRANDING_PACKAGE_NAMES
# What each package includes (same wording as the /branding page; shown on the invoice).
for _k, _v in PACKAGES.items():
    _v["items"] = BRANDING_PACKAGE_ITEMS[_k]

# Design files: logos, mockups, guides, source files. Checked by extension (browsers send
# unreliable content types for .ai/.eps/.psd).
ALLOWED_EXT = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
    ".gif": "image/gif", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".zip": "application/zip",
    ".ai": "application/postscript", ".eps": "application/postscript", ".psd": "image/vnd.adobe.photoshop",
    ".ttf": "font/ttf", ".otf": "font/otf",
}
MAX_FILE_BYTES = int(float(os.getenv("MAX_BRANDING_FILE_MB", "50")) * 1024 * 1024)
MAX_FILES_PER_UPLOAD = 20


# ---------- helpers ----------

def _now():
    return datetime.now(timezone.utc)


def _changes_left(p: BrandingProject) -> int:
    return max(0, p.rounds_included - p.changes_used)


def _base(p: BrandingProject) -> dict:
    return dict(
        id=p.id, package=p.package, package_name=PACKAGES[p.package]["name"], price_bsd=p.price_bsd,
        rounds_included=p.rounds_included, changes_used=p.changes_used, changes_left=_changes_left(p),
        proof_round=p.proof_round, business_name=p.business_name, industry=p.industry,
        description=p.description, style_notes=p.style_notes, colours=p.colours, reference_url=p.reference_url,
        status=p.status, invoice_number=p.invoice_number,
        invoice_due=branding_invoice_due(p) if p.paid_at is None else None,
        paid_at=p.paid_at, completed_at=p.completed_at, created_at=p.created_at, updated_at=p.updated_at,
    )


def to_customer(p: BrandingProject) -> BrandingOut:
    return BrandingOut(
        **_base(p),
        files=[BrandingFileOut.model_validate(f) for f in p.files],
        timeline=[EventOut.model_validate(e) for e in reversed(p.events) if e.customer_visible],
    )


def to_admin(db: Session, p: BrandingProject) -> AdminBrandingOut:
    notes = db.scalars(select(Notification).where(Notification.branding_id == p.id)
                       .order_by(Notification.id.desc())).all()
    return AdminBrandingOut(
        **_base(p),
        files=[BrandingFileOut.model_validate(f) for f in p.files],
        timeline=[EventOut.model_validate(e) for e in reversed(p.events) if e.customer_visible],
        admin_notes=p.admin_notes, payment_ref=p.payment_ref, admin_unread=bool(p.admin_unread),
        customer=CustomerBrief.model_validate(p.user),
        events=[AdminEventOut.model_validate(e) for e in reversed(p.events)],
        notifications=[NotificationOut.model_validate(n) for n in notes],
    )


def add_event(db: Session, p: BrandingProject, kind: str, message: str, visible: bool = True) -> None:
    db.add(BrandingEvent(project_id=p.id, kind=kind, message=message, customer_visible=visible))


def _queue(db: Session, background: BackgroundTasks | None, n: Notification) -> None:
    db.add(n)
    db.flush()
    if background is not None:
        background.add_task(deliver, n.id)


def notify_customer(db: Session, background: BackgroundTasks | None, p: BrandingProject,
                    subject: str, message: str) -> None:
    user = p.user
    first = (user.name or "").split(" ")[0] or "there"
    body = (f"Hi {first},\n\n{message}\n\nView your project: {SITE_URL}/my-branding/{p.id}\n\n"
            f"Questions? Reply to this email or write to {CONTACT_EMAIL}.")
    _queue(db, background, Notification(user_id=user.id, branding_id=p.id, channel="email", to_address=user.email,
                                        subject=f"{subject} · {p.business_name}", body=body, status="queued"))


def notify_admins(db: Session, background: BackgroundTasks | None, p: BrandingProject,
                  subject: str, message: str) -> None:
    for email in sorted(admin_emails()):
        _queue(db, background, Notification(branding_id=p.id, channel="email", to_address=email, subject=subject,
                                            body=f"{message}\n\nOpen: {SITE_URL}/admin/branding/{p.id}",
                                            status="queued"))


def get_for(db: Session, project_id: int, user: User) -> BrandingProject:
    p = db.get(BrandingProject, project_id)
    # Same 404 for "missing" and "not yours" so ids can't be probed.
    if p is None or (p.user_id != user.id and user.role != "admin"):
        raise HTTPException(404, "Project not found")
    return p


def _require_owner(p: BrandingProject, user: User) -> None:
    if p.user_id != user.id:
        raise HTTPException(403, "Only the customer can do this")


async def _save_files(db: Session, p: BrandingProject, files: list[UploadFile], kind: str,
                      round_no: int | None = None) -> list[BrandingFile]:
    if not files:
        raise HTTPException(400, "Please choose at least one file")
    if len(files) > MAX_FILES_PER_UPLOAD:
        raise HTTPException(400, f"Upload up to {MAX_FILES_PER_UPLOAD} files at a time")
    for f in files:
        if os.path.splitext(f.filename or "")[1].lower() not in ALLOWED_EXT:
            raise HTTPException(400, f"{f.filename}: file type not supported. Use images, PDF, SVG, AI, EPS, PSD, "
                                     "fonts or ZIP.")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    saved = []
    for f in files:
        ext = os.path.splitext(f.filename or "")[1].lower()
        name = f"brand{p.id}_{kind}_{uuid.uuid4().hex}{ext}"
        dest = os.path.join(UPLOAD_DIR, name)
        size = 0
        with open(dest, "wb") as fh:
            while chunk := await f.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_FILE_BYTES:
                    fh.close()
                    os.remove(dest)
                    for s in saved:  # roll back this batch
                        try:
                            os.remove(upload_path(s.path))
                        except OSError:
                            pass
                    raise HTTPException(400, f"{f.filename}: files must be under {MAX_FILE_BYTES // (1024 * 1024)} MB")
                fh.write(chunk)
        bf = BrandingFile(project_id=p.id, kind=kind, round_no=round_no, path=name,
                          filename=os.path.basename(f.filename or name)[:255], content_type=ALLOWED_EXT[ext],
                          size_bytes=size)
        db.add(bf)
        saved.append(bf)
    db.flush()
    return saved


def mark_paid(db: Session, background: BackgroundTasks | None, p: BrandingProject, ref: str) -> None:
    p.paid_at = _now()
    p.payment_ref = ref
    if p.status == "awaiting_payment":
        p.status = "in_design"
    msg = (f"Payment received for invoice {p.invoice_number}. We're starting on your design and will send "
           "your first proofs here for you to review.")
    add_event(db, p, "paid", msg)
    notify_customer(db, background, p, "Payment received", msg)


# ---------- customer ----------

@router.get("/branding/packages")
def packages():
    return [{"key": k, **v} for k, v in PACKAGES.items()]


@router.post("/branding", response_model=BrandingOut)
def create_project(body: BrandingIn, background: BackgroundTasks,
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pkg = PACKAGES[body.package]
    p = BrandingProject(user_id=user.id, price_bsd=pkg["price"], rounds_included=pkg["rounds"], admin_unread=True,
                        **{k: (v.strip() if isinstance(v, str) else v) for k, v in body.model_dump().items()})
    db.add(p)
    db.flush()
    p.invoice_number = f"AIM-{_now():%Y}-B{p.id:04d}"
    add_event(db, p, "created", f"Branding request received. Invoice {p.invoice_number} is ready to pay; "
                                "we start your design once payment is received.")
    notify_customer(db, background, p, "Your branding request",
                    f"Thanks for choosing the {pkg['name']} branding package. Your invoice {p.invoice_number} for "
                    f"${p.price_bsd:,.2f} is ready in your account. We start your design as soon as your payment "
                    "is received.")
    notify_admins(db, background, p, f"New branding order #{p.id}: {pkg['name']} for {p.business_name}",
                  f"{user.name} ordered the {pkg['name']} package (${p.price_bsd:,.2f}) for {p.business_name}.")
    db.commit()
    db.refresh(p)
    return to_customer(p)


@router.get("/branding", response_model=list[BrandingOut])
def my_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(BrandingProject).where(BrandingProject.user_id == user.id)
                      .order_by(BrandingProject.id.desc())).all()
    return [to_customer(p) for p in rows]


@router.get("/branding/{project_id}", response_model=BrandingOut)
def get_project(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return to_customer(get_for(db, project_id, user))


@router.post("/branding/{project_id}/files", response_model=BrandingOut)
async def upload_references(project_id: int, files: list[UploadFile] = File(...),
                            user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = get_for(db, project_id, user)
    _require_owner(p, user)
    if p.status in ("completed", "cancelled"):
        raise HTTPException(400, "This project is closed")
    saved = await _save_files(db, p, files, "reference")
    p.admin_unread = True
    add_event(db, p, "reference", f"You added {len(saved)} reference file{'s' if len(saved) != 1 else ''}.")
    db.commit()
    db.refresh(p)
    return to_customer(p)


@router.get("/branding/{project_id}/files/{file_id}")
def download_file(project_id: int, file_id: int, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    p = get_for(db, project_id, user)
    f = next((x for x in p.files if x.id == file_id), None)
    if f is None or not os.path.exists(upload_path(f.path)):
        raise HTTPException(404, "File not found")
    # Always a download (attachment), so an uploaded SVG can't run in the site's origin.
    return FileResponse(upload_path(f.path), media_type=f.content_type, filename=f.filename)


@router.get("/branding/{project_id}/invoice.pdf")
def invoice_pdf(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = get_for(db, project_id, user)
    return Response(content=build_branding_invoice_pdf(p), media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{p.invoice_number}.pdf"'})


@router.post("/branding/{project_id}/approve", response_model=BrandingOut)
def approve_proofs(project_id: int, background: BackgroundTasks,
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = get_for(db, project_id, user)
    _require_owner(p, user)
    if p.status != "proofs_ready":
        raise HTTPException(400, "There are no proofs waiting for your approval")
    p.status = "approved"
    p.admin_unread = True
    add_event(db, p, "approved", f"You approved proof set {p.proof_round}. We're preparing your final files.")
    notify_admins(db, background, p, f"Branding #{p.id} approved: {p.business_name}",
                  f"{p.user.name} approved proof set {p.proof_round}. Upload the final files next.")
    db.commit()
    return to_customer(p)


@router.post("/branding/{project_id}/changes", response_model=BrandingOut)
def request_changes(project_id: int, body: BrandingChangesIn, background: BackgroundTasks,
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = get_for(db, project_id, user)
    _require_owner(p, user)
    if p.status != "proofs_ready":
        raise HTTPException(400, "You can ask for changes once your proofs are ready")
    if _changes_left(p) <= 0:
        raise HTTPException(400, "You've used all the change rounds in your package. Extra changes are "
                                 "available as an add-on: message us and we'll arrange it.")
    p.changes_used += 1
    p.admin_unread = True
    p.status = "changes_requested"
    feedback = body.feedback.strip()
    add_event(db, p, "changes", f"You asked for changes (round {p.changes_used} of {p.rounds_included}): {feedback}")
    notify_admins(db, background, p, f"Branding #{p.id} changes requested: {p.business_name}",
                  f"{p.user.name} asked for changes (round {p.changes_used} of {p.rounds_included}):\n\n{feedback}")
    db.commit()
    return to_customer(p)


@router.post("/branding/{project_id}/cancel", response_model=BrandingOut)
def cancel_project(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = get_for(db, project_id, user)
    _require_owner(p, user)
    if p.status != "awaiting_payment":
        raise HTTPException(400, "This project can no longer be cancelled online. Please message us.")
    p.status = "cancelled"
    p.admin_unread = True
    add_event(db, p, "cancelled", "You cancelled this branding request.")
    db.commit()
    return to_customer(p)


@router.post("/branding/{project_id}/checkout")
def start_checkout(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = get_for(db, project_id, user)
    if p.paid_at is not None:
        raise HTTPException(400, "This invoice has already been paid")
    if not payments.stripe_enabled():
        raise HTTPException(400, "Card payments aren't available yet. Please pay by bank transfer.")
    site = os.getenv("SITE_URL", "http://localhost:3000").rstrip("/")
    session = payments.create_checkout_session(
        invoice_id=p.id, number=p.invoice_number, amount_bsd=p.price_bsd, customer_email=p.user.email,
        success_url=f"{site}/my-branding/{p.id}?paid=1&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{site}/my-branding/{p.id}", reference=f"branding-{p.id}",
    )
    return {"url": session["url"]}


@router.post("/branding/{project_id}/confirm", response_model=BrandingOut)
def confirm_payment(project_id: int, background: BackgroundTasks, session_id: str = Query(...),
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = get_for(db, project_id, user)
    if p.paid_at is None:
        if not payments.stripe_enabled():
            raise HTTPException(400, "Card payments aren't available yet")
        session = payments.get_checkout_session(session_id)
        if session.get("payment_status") != "paid" or session.get("client_reference_id") != f"branding-{p.id}":
            raise HTTPException(400, "Your payment hasn't gone through yet")
        mark_paid(db, background, p, f"stripe:{session_id}")
        p.admin_unread = True
        db.commit()
    return to_customer(p)


# ---------- admin ----------

@admin_router.get("/summary")
def admin_summary(db: Session = Depends(get_db)):
    rows = db.execute(select(BrandingProject.status, func.count()).group_by(BrandingProject.status)).all()
    return {s: 0 for s in BRANDING_STATUSES} | {s: n for s, n in rows}


@admin_router.get("", response_model=list[AdminBrandingOut])
def admin_list(status: str | None = Query(default=None), db: Session = Depends(get_db)):
    q = select(BrandingProject).order_by(BrandingProject.id.desc())
    if status:
        q = q.where(BrandingProject.status == status)
    return [to_admin(db, p) for p in db.scalars(q).all()]


def _get(db: Session, project_id: int) -> BrandingProject:
    p = db.get(BrandingProject, project_id)
    if p is None:
        raise HTTPException(404, "Project not found")
    return p


@admin_router.get("/{project_id}", response_model=AdminBrandingOut)
def admin_get(project_id: int, db: Session = Depends(get_db)):
    p = _get(db, project_id)
    if p.admin_unread:  # opening the project marks it as read
        p.admin_unread = False
        db.commit()
    return to_admin(db, p)


@admin_router.patch("/{project_id}", response_model=AdminBrandingOut)
def admin_update(project_id: int, body: AdminBrandingUpdate, db: Session = Depends(get_db)):
    p = _get(db, project_id)
    if body.admin_notes is not None:
        p.admin_notes = body.admin_notes
    if body.status is not None:
        if body.status not in BRANDING_STATUSES:
            raise HTTPException(400, "Unknown status")
        if body.status != p.status:
            add_event(db, p, "status", f"Status changed from {p.status} to {body.status}.", visible=False)
            p.status = body.status
    db.commit()
    return to_admin(db, p)


@admin_router.post("/{project_id}/mark-paid", response_model=AdminBrandingOut)
def admin_mark_paid(project_id: int, background: BackgroundTasks,
                    reference: str = Query(default="bank transfer"), db: Session = Depends(get_db)):
    p = _get(db, project_id)
    if p.status == "cancelled":
        raise HTTPException(400, "This project was cancelled")
    if p.paid_at is None:
        mark_paid(db, background, p, reference.strip() or "bank transfer")
        db.commit()
    return to_admin(db, p)


@admin_router.post("/{project_id}/proofs", response_model=AdminBrandingOut)
async def admin_send_proofs(project_id: int, background: BackgroundTasks, files: list[UploadFile] = File(...),
                            message: str = Form(default=""), db: Session = Depends(get_db)):
    p = _get(db, project_id)
    if p.status not in ("in_design", "changes_requested", "proofs_ready"):
        raise HTTPException(400, "Proofs can be sent once the invoice is paid, or after the customer asks for changes")
    if p.status != "proofs_ready":
        p.proof_round += 1
    await _save_files(db, p, files, "proof", round_no=p.proof_round)
    p.status = "proofs_ready"
    left = _changes_left(p)
    note = message.strip()
    msg = (f"Proof set {p.proof_round} is ready for you to review. Approve it, or ask for changes "
           f"({left} change round{'s' if left != 1 else ''} left in your package).")
    add_event(db, p, "proofs", msg + (f" Note from AIMORO: {note}" if note else ""))
    notify_customer(db, background, p, "Your design proofs are ready", msg + (f"\n\n{note}" if note else ""))
    db.commit()
    return to_admin(db, p)


@admin_router.post("/{project_id}/finals", response_model=AdminBrandingOut)
async def admin_deliver_finals(project_id: int, background: BackgroundTasks, files: list[UploadFile] = File(...),
                               message: str = Form(default=""), db: Session = Depends(get_db)):
    p = _get(db, project_id)
    if p.status not in ("approved", "completed"):
        raise HTTPException(400, "Final files can be delivered once the customer approves the proofs")
    await _save_files(db, p, files, "final")
    first_delivery = p.status != "completed"
    p.status = "completed"
    p.completed_at = p.completed_at or _now()
    note = message.strip()
    if first_delivery:
        msg = "Your final brand files are ready to download. Thank you for choosing AIMORO!"
        subject = "Your final brand files are ready"
    else:
        msg = "We added more final files to your project."
        subject = "More brand files added"
    add_event(db, p, "final", msg + (f" Note from AIMORO: {note}" if note else ""))
    notify_customer(db, background, p, subject, msg + (f"\n\n{note}" if note else ""))
    db.commit()
    return to_admin(db, p)


@admin_router.delete("/files/{file_id}", response_model=AdminBrandingOut)
def admin_delete_file(file_id: int, db: Session = Depends(get_db)):
    f = db.get(BrandingFile, file_id)
    if f is None:
        raise HTTPException(404, "File not found")
    p = f.project
    try:
        os.remove(upload_path(f.path))
    except OSError:
        pass
    db.delete(f)
    add_event(db, p, "file_removed", f"Removed file {f.filename}.", visible=False)
    db.commit()
    db.refresh(p)
    return to_admin(db, p)
