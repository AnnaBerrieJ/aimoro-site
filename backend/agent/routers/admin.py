"""Admin-only endpoints: request queue, sourcing listings, quote builder."""
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..common import parse_specs, report_fee_bsd, save_photo, to_customer, upload_path
from ..db import get_db
from ..fx import get_cny_usd
from ..models import PLATFORMS, REQUEST_STATUSES, Invoice, Notification, ProductRequest, Quote, SupplierListing, User
from ..pricing import QuoteInputs, calculate_quote
from ..schemas import (AdminEventOut, AdminQuoteOut, AdminRequestOut, AdminRequestUpdate, CustomerBrief,
                       InvoiceOut, ListingIn, ListingOut, NotificationOut, ProposalIn, QuoteBuildIn)
from .customer import mark_invoice_paid
from ..notify import add_event, notify_customer

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

QUOTE_VALID_DAYS = 7


def _listing_out(listing: SupplierListing, fx: float | None = None) -> ListingOut:
    out = ListingOut(
        id=listing.id, platform=listing.platform, url=listing.url, title=listing.title,
        currency=listing.currency or "CNY", price_cny=listing.price_cny, china_shipping_cny=listing.china_shipping_cny,
        seller_rating=listing.seller_rating, weight_kg=listing.weight_kg, notes=listing.notes,
        public_title=listing.public_title or "", preview_title=listing.preview_title or "", public_notes=listing.public_notes or "",
        specs=parse_specs(listing), is_chosen=listing.is_chosen, has_photo=bool(listing.photo_path),
        created_at=listing.created_at,
    )
    rate = 1.0 if listing.currency == "USD" else fx
    if rate:
        out.price_bsd_estimate = round((listing.price_cny + listing.china_shipping_cny) * rate, 2)
    return out


def _admin_view(req: ProductRequest, fx: float | None = None) -> AdminRequestOut:
    base = to_customer(req, as_admin=True).model_dump()
    return AdminRequestOut(
        **base,
        admin_notes=req.admin_notes,
        customer=CustomerBrief.model_validate(req.user),
        listings=[_listing_out(l, fx) for l in req.listings],
        quotes=[AdminQuoteOut.model_validate(x) for x in sorted(req.quotes, key=lambda x: x.id, reverse=True)],
        supplier_order_no=req.supplier_order_no,
        ordered_at=req.ordered_at,
        warehouse_arrived_at=req.warehouse_arrived_at,
        warehouse_notes=req.warehouse_notes,
        shipment_id=req.shipment_id,
        events=[AdminEventOut.model_validate(e) for e in reversed(req.events)],
        notifications=[NotificationOut.model_validate(n) for n in sorted(
            _notifications_for(req), key=lambda n: n.id, reverse=True)],
        fee_waived=bool(req.fee_waived),
        report_fee_ref=req.report_fee_ref,
        admin_unread=bool(req.admin_unread),
    )


def _notifications_for(req: ProductRequest):
    from sqlalchemy.orm import object_session
    db = object_session(req)
    return db.scalars(select(Notification).where(Notification.request_id == req.id)).all() if db else []


def _get_req(db: Session, request_id: int) -> ProductRequest:
    req = db.get(ProductRequest, request_id)
    if req is None:
        raise HTTPException(404, "Request not found")
    return req


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    counts = dict(db.execute(select(ProductRequest.status, func.count()).group_by(ProductRequest.status)).all())
    return {s: counts.get(s, 0) for s in REQUEST_STATUSES}


@router.get("/requests", response_model=list[AdminRequestOut])
def list_requests(status: str | None = Query(default=None), db: Session = Depends(get_db)):
    stmt = select(ProductRequest).order_by(ProductRequest.id.desc())
    if status:
        stmt = stmt.where(ProductRequest.status == status)
    return [_admin_view(r) for r in db.scalars(stmt).all()]


@router.get("/requests/{request_id}", response_model=AdminRequestOut)
def get_request(request_id: int, db: Session = Depends(get_db)):
    req = _get_req(db, request_id)
    if req.admin_unread:  # opening the request marks it as read
        req.admin_unread = False
        db.commit()
    return _admin_view(req, get_cny_usd()["rate"])


@router.get("/unread")
def unread_counts(db: Session = Depends(get_db)):
    """Badge counts for the admin menu: requests and branding projects with customer activity not yet opened."""
    from ..models import BrandingProject
    return {
        "requests": db.scalar(select(func.count()).select_from(ProductRequest).where(ProductRequest.admin_unread.is_(True))) or 0,
        "branding": db.scalar(select(func.count()).select_from(BrandingProject).where(BrandingProject.admin_unread.is_(True))) or 0,
    }


@router.patch("/requests/{request_id}", response_model=AdminRequestOut)
def update_request(request_id: int, body: AdminRequestUpdate, db: Session = Depends(get_db)):
    req = _get_req(db, request_id)
    if body.status is not None and body.status != req.status:
        if body.status not in REQUEST_STATUSES:
            raise HTTPException(400, f"Status must be one of: {', '.join(REQUEST_STATUSES)}")
        add_event(db, req, "status", f"Status changed from {req.status} to {body.status} by admin.", visible=False)
        req.status = body.status
    if body.admin_notes is not None:
        req.admin_notes = body.admin_notes
    if body.tracking_number is not None:
        req.tracking_number = body.tracking_number
    if body.fee_waived is not None and bool(req.fee_waived) != body.fee_waived:
        req.fee_waived = body.fee_waived
        add_event(db, req, "fee", "Friends and Family: sourcing fee waived." if body.fee_waived
                  else "Sourcing fee waiver removed.", visible=False)
    db.commit()
    return _admin_view(req)


@router.post("/requests/{request_id}/report-fee", response_model=AdminRequestOut)
def report_fee(request_id: int, background: BackgroundTasks, paid: bool = Query(default=True),
               reference: str = Query(default="", max_length=255), db: Session = Depends(get_db)):
    """Confirm (or undo) the report fee. Confirming unlocks the full report for the customer."""
    req = _get_req(db, request_id)
    if paid and req.report_paid_at is None:
        req.report_paid_at = datetime.now(timezone.utc)
        req.report_fee_ref = reference.strip() or None
        msg = ("Report fee received, thank you! Your full report is ready: model names, clear photos and the "
               "complete comparison for every option. Choose the option you want and we'll send your invoice.")
        add_event(db, req, "report", msg)
        n = notify_customer(db, background, req, "Your full report is ready", msg)
        if any(q.status == "sent" for q in req.quotes):
            n.attachments = json.dumps(["options_full"])
    elif not paid and req.report_paid_at is not None:
        req.report_paid_at = None
        req.report_fee_ref = None
        add_event(db, req, "report", "Report fee confirmation removed: the options are a preview again.",
                  visible=False)
    db.commit()
    return _admin_view(req)


@router.post("/requests/{request_id}/listings", response_model=ListingOut)
def add_listing(request_id: int, body: ListingIn, db: Session = Depends(get_db)):
    req = _get_req(db, request_id)
    if body.platform not in PLATFORMS:
        raise HTTPException(400, f"Platform must be one of: {', '.join(PLATFORMS)}")
    listing = SupplierListing(request_id=req.id)
    _apply_listing(listing, body)
    db.add(listing)
    if req.status == "received":
        req.status = "sourcing"
        add_event(db, req, "sourcing", "We've started sourcing your product and comparing suppliers.")
    db.commit()
    return _listing_out(listing)


@router.patch("/listings/{listing_id}", response_model=ListingOut)
def update_listing(listing_id: int, body: ListingIn, db: Session = Depends(get_db)):
    listing = db.get(SupplierListing, listing_id)
    if listing is None:
        raise HTTPException(404, "Listing not found")
    if body.platform not in PLATFORMS:
        raise HTTPException(400, f"Platform must be one of: {', '.join(PLATFORMS)}")
    _apply_listing(listing, body)
    db.commit()
    return _listing_out(listing)


def _apply_listing(listing: SupplierListing, body: ListingIn) -> None:
    data = body.model_dump(exclude={"specs"})
    for k, v in data.items():
        setattr(listing, k, v.strip() if isinstance(v, str) else v)
    rows = [r.model_dump() for r in body.specs if r.requested.strip() or r.found.strip()]
    listing.specs_json = json.dumps(rows) if rows else None


@router.get("/listings/{listing_id}/photo")
def get_listing_photo(listing_id: int, db: Session = Depends(get_db)):
    listing = db.get(SupplierListing, listing_id)
    if listing is None or not listing.photo_path:
        raise HTTPException(404, "No photo")
    return FileResponse(upload_path(listing.photo_path))


@router.post("/listings/{listing_id}/photo", response_model=ListingOut)
async def upload_listing_photo(listing_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """The product photo the customer sees for this option (e.g. a screenshot from the app)."""
    listing = db.get(SupplierListing, listing_id)
    if listing is None:
        raise HTTPException(404, "Listing not found")
    listing.photo_path = await save_photo(file, f"listing{listing.id}")
    db.commit()
    return _listing_out(listing)


@router.delete("/listings/{listing_id}")
def delete_listing(listing_id: int, db: Session = Depends(get_db)):
    listing = db.get(SupplierListing, listing_id)
    if listing is None:
        raise HTTPException(404, "Listing not found")
    if any(q.listing_id == listing_id for q in listing.request.quotes):
        raise HTTPException(400, "This listing is used in a quote and can't be deleted")
    db.delete(listing)
    db.commit()
    return {"deleted": listing_id}


@router.get("/fx")
def fx_rate():
    return get_cny_usd()


def _inputs(req: ProductRequest, body: QuoteBuildIn, db: Session) -> tuple[SupplierListing, QuoteInputs]:
    listing = db.get(SupplierListing, body.listing_id)
    if listing is None or listing.request_id != req.id:
        raise HTTPException(400, "Pick a listing from this request")
    # USD prices need no conversion (BSD is pegged 1:1 to USD).
    fx = 1.0 if listing.currency == "USD" else (body.fx_cny_usd or get_cny_usd()["rate"])
    return listing, QuoteInputs(
        price_cny=listing.price_cny,
        quantity=req.quantity,
        china_shipping_cny=listing.china_shipping_cny,
        fx_cny_usd=fx,
        freight_cost_bsd=body.freight_cost_bsd,
        freight_markup_pct=body.freight_markup_pct,
        insurance_bsd=body.insurance_bsd,
        service_fee_pct=body.service_fee_pct,
        service_fee_min_bsd=body.service_fee_min_bsd,
    )


@router.post("/requests/{request_id}/quote/preview")
def preview_quote(request_id: int, body: QuoteBuildIn, db: Session = Depends(get_db)):
    req = _get_req(db, request_id)
    _, inputs = _inputs(req, body, db)
    return {"fx_cny_usd": inputs.fx_cny_usd, **calculate_quote(inputs).as_dict()}


def _send_options(req: ProductRequest, options: list[QuoteBuildIn], message: str,
                  background: BackgroundTasks, db: Session) -> list[Quote]:
    if req.status not in {"received", "sourcing", "quote_ready"}:
        raise HTTPException(400, f"This request can't be quoted while its status is {req.status}")
    if any(q.status == "approved" for q in req.quotes):
        raise HTTPException(400, "The customer already approved a quote")
    ids = [o.listing_id for o in options]
    if len(set(ids)) != len(ids):
        raise HTTPException(400, "Each option must use a different listing")

    priced = [(_inputs(req, o, db)) for o in options]
    for old in req.quotes:
        if old.status == "sent":
            old.status = "superseded"
    chosen = set(ids)
    for l in req.listings:
        l.is_chosen = l.id in chosen

    proposal_no = max((q.proposal_no or 0 for q in req.quotes), default=0) + 1
    expires = datetime.now(timezone.utc) + timedelta(days=QUOTE_VALID_DAYS)
    quotes = []
    for n, (listing, inputs) in enumerate(priced, start=1):
        b = calculate_quote(inputs)
        q = Quote(
            request_id=req.id, listing_id=listing.id, proposal_no=proposal_no, option_number=n,
            fx_cny_usd=inputs.fx_cny_usd, freight_cost_bsd=inputs.freight_cost_bsd,
            freight_markup_pct=inputs.freight_markup_pct, insurance_bsd=inputs.insurance_bsd,
            service_fee_pct=inputs.service_fee_pct, service_fee_min_bsd=inputs.service_fee_min_bsd,
            margin_bsd=b.margin_bsd, product_cost_bsd=b.product_cost_bsd, shipping_bsd=b.shipping_bsd,
            service_fee_bsd=b.service_fee_bsd, total_bsd=b.total_bsd, message=message, expires_at=expires,
        )
        db.add(q)
        quotes.append(q)
    req.status = "quote_ready"

    fee = report_fee_bsd()
    if req.report_paid_at is not None:
        nxt = "Compare them side by side and choose one."
    else:
        nxt = (f"This is your preview report. To see the model names, photos and full comparison, and to choose "
               f"an option, pay the ${fee:,.0f} report fee; we send your full report as soon as it's confirmed.")
    if len(quotes) == 1:
        subject = "Your preview quote is ready" if req.report_paid_at is None else "Your quote is ready"
        msg = (f"We found a match for you: ${quotes[0].total_bsd:,.2f} BSD. {nxt} "
               f"It is valid for {QUOTE_VALID_DAYS} days.")
    else:
        low = min(q.total_bsd for q in quotes)
        subject = "Your preview report is ready" if req.report_paid_at is None else "Your options are ready"
        msg = (f"We found {len(quotes)} options for you, from ${low:,.2f} BSD. {nxt} "
               f"They are valid for {QUOTE_VALID_DAYS} days.")
    add_event(db, req, "quote", msg)
    n = notify_customer(db, background, req, subject, msg)
    n.attachments = json.dumps(["options_full" if req.report_paid_at is not None else "options_preview"])
    db.commit()
    return quotes


@router.post("/requests/{request_id}/quote", response_model=AdminQuoteOut)
def send_quote(request_id: int, body: QuoteBuildIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    """Send a single quote (one option)."""
    req = _get_req(db, request_id)
    q = _send_options(req, [body], body.message, background, db)[0]
    return AdminQuoteOut.model_validate(q)


@router.post("/requests/{request_id}/proposal/preview")
def preview_proposal(request_id: int, body: ProposalIn, db: Session = Depends(get_db)):
    req = _get_req(db, request_id)
    out = []
    for o in body.options:
        _, inputs = _inputs(req, o, db)
        out.append({"listing_id": o.listing_id, "fx_cny_usd": inputs.fx_cny_usd, **calculate_quote(inputs).as_dict()})
    return out


@router.post("/requests/{request_id}/proposal", response_model=list[AdminQuoteOut])
def send_proposal(request_id: int, body: ProposalIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    """Send 1-3 options side by side; the customer chooses one."""
    req = _get_req(db, request_id)
    quotes = _send_options(req, body.options, body.message, background, db)
    return [AdminQuoteOut.model_validate(q) for q in quotes]


@router.post("/invoices/{invoice_id}/mark-paid", response_model=InvoiceOut)
def admin_mark_paid(invoice_id: int, background: BackgroundTasks, reference: str = Query(default="bank transfer"),
                    db: Session = Depends(get_db)):
    inv = db.get(Invoice, invoice_id)
    if inv is None:
        raise HTTPException(404, "Invoice not found")
    if inv.status != "paid":
        mark_invoice_paid(db, background, inv, reference)
        db.commit()
    return InvoiceOut.model_validate(inv)


@router.get("/customers", response_model=list[CustomerBrief])
def customers(db: Session = Depends(get_db)):
    return db.scalars(select(User).where(User.role == "customer").order_by(User.id.desc())).all()


@router.post("/gsync")
def gsync_all(db: Session = Depends(get_db)):
    """Re-sync every request to Google Drive and the order tracker (runs in the background)."""
    from .. import gsync
    if not gsync.enabled():
        raise HTTPException(400, "Google sync is not configured (see backend/agent/gsync.py)")
    ids = list(db.scalars(select(ProductRequest.id).order_by(ProductRequest.id)))
    gsync.submit(ids)
    return {"queued": len(ids)}
