"""Customer endpoints: requests, quotes, invoices, payment."""
import os
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import payments
from ..auth import get_current_user
from ..common import (active_options, current_quote, get_request_for, is_expired, report_fee_bsd, report_unlocked,
                      save_photo, to_customer, upload_path)
from ..db import get_db
from ..invoice_pdf import build_invoice_pdf
from ..options_pdf import build_options_pdf
from ..models import Invoice, ProductRequest, User
from ..notify import add_event, notify_admins, notify_customer
from ..schemas import RequestIn, RequestOut

router = APIRouter(tags=["customer"])

CANCELLABLE = {"received", "sourcing", "quote_ready"}


@router.post("/requests", response_model=RequestOut)
def create_request(body: RequestIn, background: BackgroundTasks,
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = body.model_dump()
    data["delivery_address"] = data["delivery_address"].strip() or user.address
    if not data["delivery_address"]:
        raise HTTPException(400, "Please add a delivery address")
    req = ProductRequest(user_id=user.id, **data)
    db.add(req)
    db.flush()
    add_event(db, req, "created", "Request received. We're looking for the best supplier for you.")
    notify_admins(db, background, req, f"New request #{req.id}: {req.product_name}",
                  f"{user.name} ({', '.join(x for x in (user.island, user.country) if x)}) wants {req.quantity} x {req.product_name}.")
    db.commit()
    db.refresh(req)
    return to_customer(req)


@router.get("/requests", response_model=list[RequestOut])
def my_requests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(ProductRequest).where(ProductRequest.user_id == user.id).order_by(ProductRequest.id.desc())
    ).all()
    return [to_customer(r) for r in rows]


@router.get("/requests/{request_id}", response_model=RequestOut)
def get_request(request_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return to_customer(get_request_for(db, request_id, user), as_admin=user.role == "admin")


@router.post("/requests/{request_id}/photo", response_model=RequestOut)
async def upload_photo(request_id: int, file: UploadFile = File(...),
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = get_request_for(db, request_id, user)
    req.photo_path = await save_photo(file, f"req{req.id}")
    db.commit()
    return to_customer(req)


@router.get("/requests/{request_id}/photo")
def get_photo(request_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = get_request_for(db, request_id, user)
    if not req.photo_path:
        raise HTTPException(404, "No photo")
    return FileResponse(upload_path(req.photo_path))


@router.get("/requests/{request_id}/warehouse-photos/{photo_id}")
def get_warehouse_photo(request_id: int, photo_id: int, user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    req = get_request_for(db, request_id, user)
    photo = next((p for p in req.warehouse_photos if p.id == photo_id), None)
    if photo is None:
        raise HTTPException(404, "Photo not found")
    return FileResponse(upload_path(photo.path))


@router.get("/requests/{request_id}/options/{quote_id}/photo")
def option_photo(request_id: int, quote_id: int, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    """Photo of a found product. Customers only see photos of options actually sent to them."""
    req = get_request_for(db, request_id, user)
    quote = next((q for q in req.quotes if q.id == quote_id), None)
    visible = quote is not None and (user.role == "admin" or (
        quote.status in ("sent", "approved") and report_unlocked(req)))
    if not visible or not quote.listing or not quote.listing.photo_path:
        raise HTTPException(404, "No photo")
    return FileResponse(upload_path(quote.listing.photo_path))


@router.get("/requests/{request_id}/options.pdf")
def options_pdf(request_id: int, preview: bool = Query(default=False),
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """preview=true: blurred photos and details. Customers only get the full report once the
    report fee is paid."""
    req = get_request_for(db, request_id, user)
    opts = active_options(req)
    if not opts:
        raise HTTPException(404, "There are no options to show yet")
    if user.role != "admin" and not report_unlocked(req):
        preview = True
    pdf = build_options_pdf(req, opts, preview=preview)
    suffix = "-preview" if preview else ""
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="AIMORO-options-request-{req.id}{suffix}.pdf"'})


@router.post("/requests/{request_id}/cancel", response_model=RequestOut)
def cancel_request(request_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = get_request_for(db, request_id, user)
    if req.status not in CANCELLABLE:
        raise HTTPException(400, "This request can no longer be cancelled")
    req.status = "cancelled"
    add_event(db, req, "cancelled", "You cancelled this request.")
    db.commit()
    return to_customer(req)


@router.post("/requests/{request_id}/approve", response_model=RequestOut)
def approve_quote(request_id: int, quote_id: int | None = Query(default=None),
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Approve the quote, or choose one of several options (pass quote_id)."""
    req = get_request_for(db, request_id, user)
    if req.user_id != user.id:
        raise HTTPException(403, "Only the customer can approve their quote")
    opts = active_options(req)
    if any(q.status == "approved" for q in opts):
        return to_customer(req)
    if not opts or req.status != "quote_ready":
        raise HTTPException(400, "There is no quote to approve")
    if not report_unlocked(req):
        raise HTTPException(400, f"Your full report unlocks once the ${report_fee_bsd():,.0f} report fee is "
                                 "confirmed. You can choose your option after that.")
    if quote_id is None:
        if len(opts) > 1:
            raise HTTPException(400, "Please choose one of the options")
        quote = opts[0]
    else:
        quote = next((q for q in opts if q.id == quote_id), None)
        if quote is None:
            raise HTTPException(400, "That option is no longer available")
    if is_expired(quote):
        raise HTTPException(400, "This quote has expired. We'll send you an updated one.")

    quote.status = "approved"
    for other in opts:
        if other is not quote:
            other.status = "superseded"
    invoice = Invoice(quote_id=quote.id, number="pending", amount_bsd=quote.total_bsd)
    db.add(invoice)
    db.flush()
    invoice.number = f"AIM-{datetime.now(timezone.utc):%Y}-{invoice.id:04d}"
    chosen = f"You chose option {quote.option_number}. " if len(opts) > 1 else "You approved the quote. "
    add_event(db, req, "approved", f"{chosen}Invoice {invoice.number} is ready to pay.")
    db.commit()
    db.refresh(req)
    return to_customer(req)


def _invoice_for(db: Session, invoice_id: int, user: User) -> Invoice:
    inv = db.get(Invoice, invoice_id)
    if inv is None or (inv.quote.request.user_id != user.id and user.role != "admin"):
        raise HTTPException(404, "Invoice not found")
    return inv


@router.get("/invoices/{invoice_id}/pdf")
def invoice_pdf(invoice_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inv = _invoice_for(db, invoice_id, user)
    return Response(
        content=build_invoice_pdf(inv),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{inv.number}.pdf"'},
    )


@router.get("/payments/config")
def payment_config():
    return {
        "stripe_enabled": payments.stripe_enabled(),
        "bank_instructions": os.getenv(
            "BANK_TRANSFER_INSTRUCTIONS",
            "Payment details sent by WhatsApp. "
            "Use your invoice number as the payment reference.",
        ),
    }


@router.post("/invoices/{invoice_id}/checkout")
def start_checkout(invoice_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inv = _invoice_for(db, invoice_id, user)
    if inv.status == "paid":
        raise HTTPException(400, "This invoice has already been paid")
    if not payments.stripe_enabled():
        raise HTTPException(400, "Card payments aren't available yet. Please pay by bank transfer.")
    site = os.getenv("SITE_URL", "http://localhost:3000").rstrip("/")
    req_id = inv.quote.request_id
    session = payments.create_checkout_session(
        invoice_id=inv.id,
        number=inv.number,
        amount_bsd=inv.amount_bsd,
        customer_email=inv.quote.request.user.email,
        success_url=f"{site}/my-requests/{req_id}?paid={inv.id}&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{site}/my-requests/{req_id}",
    )
    return {"url": session["url"]}


@router.post("/invoices/{invoice_id}/confirm", response_model=RequestOut)
def confirm_payment(invoice_id: int, background: BackgroundTasks, session_id: str = Query(...),
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inv = _invoice_for(db, invoice_id, user)
    req = inv.quote.request
    if inv.status != "paid":
        if not payments.stripe_enabled():
            raise HTTPException(400, "Card payments aren't available yet")
        session = payments.get_checkout_session(session_id)
        if session.get("payment_status") != "paid" or session.get("client_reference_id") != str(inv.id):
            raise HTTPException(400, "Your payment hasn't gone through yet")
        mark_invoice_paid(db, background, inv, f"stripe:{session_id}")
        db.commit()
    return to_customer(req)


def mark_invoice_paid(db: Session, background: BackgroundTasks | None, inv: Invoice, ref: str) -> None:
    inv.status = "paid"
    inv.payment_ref = ref
    inv.paid_at = datetime.now(timezone.utc)
    req = inv.quote.request
    if req.status == "quote_ready":
        req.status = "paid"
    msg = f"Payment received for invoice {inv.number}. We'll place your order with the supplier next."
    add_event(db, req, "paid", msg)
    notify_customer(db, background, req, "Payment received", msg)
