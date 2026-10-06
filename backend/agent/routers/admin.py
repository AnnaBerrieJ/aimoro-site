"""Admin-only endpoints: request queue, sourcing listings, quote builder."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..common import to_customer
from ..db import get_db
from ..fx import get_cny_usd
from ..models import PLATFORMS, REQUEST_STATUSES, Invoice, Notification, ProductRequest, Quote, SupplierListing, User
from ..pricing import QuoteInputs, calculate_quote
from ..schemas import (AdminEventOut, AdminQuoteOut, AdminRequestOut, AdminRequestUpdate, CustomerBrief,
                       InvoiceOut, ListingIn, ListingOut, NotificationOut, QuoteBuildIn)
from .customer import mark_invoice_paid
from ..notify import add_event, notify_customer

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

QUOTE_VALID_DAYS = 7


def _listing_out(listing: SupplierListing, fx: float | None = None) -> ListingOut:
    out = ListingOut.model_validate(listing)
    if fx:
        out.price_bsd_estimate = round((listing.price_cny + listing.china_shipping_cny) * fx, 2)
    return out


def _admin_view(req: ProductRequest, fx: float | None = None) -> AdminRequestOut:
    base = to_customer(req).model_dump()
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
    return _admin_view(_get_req(db, request_id), get_cny_usd()["rate"])


@router.patch("/requests/{request_id}", response_model=AdminRequestOut)
def update_request(request_id: int, body: AdminRequestUpdate, db: Session = Depends(get_db)):
    req = _get_req(db, request_id)
    if body.status is not None and body.status != req.status:
        if body.status not in REQUEST_STATUSES:
            raise HTTPException(400, f"status must be one of {REQUEST_STATUSES}")
        add_event(db, req, "status", f"Status changed from {req.status} to {body.status} by admin.", visible=False)
        req.status = body.status
    if body.admin_notes is not None:
        req.admin_notes = body.admin_notes
    if body.tracking_number is not None:
        req.tracking_number = body.tracking_number
    db.commit()
    return _admin_view(req)


@router.post("/requests/{request_id}/listings", response_model=ListingOut)
def add_listing(request_id: int, body: ListingIn, db: Session = Depends(get_db)):
    req = _get_req(db, request_id)
    if body.platform not in PLATFORMS:
        raise HTTPException(400, f"platform must be one of {PLATFORMS}")
    listing = SupplierListing(request_id=req.id, **body.model_dump())
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
        raise HTTPException(400, f"platform must be one of {PLATFORMS}")
    for k, v in body.model_dump().items():
        setattr(listing, k, v)
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
    fx = body.fx_cny_usd or get_cny_usd()["rate"]
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


@router.post("/requests/{request_id}/quote", response_model=AdminQuoteOut)
def send_quote(request_id: int, body: QuoteBuildIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    req = _get_req(db, request_id)
    if req.status not in {"received", "sourcing", "quote_ready"}:
        raise HTTPException(400, f"Can't quote a request that is {req.status}")
    if any(q.status == "approved" for q in req.quotes):
        raise HTTPException(400, "The customer already approved a quote")
    listing, inputs = _inputs(req, body, db)
    b = calculate_quote(inputs)

    for old in req.quotes:
        if old.status == "sent":
            old.status = "superseded"
    for l in req.listings:
        l.is_chosen = l.id == listing.id

    quote = Quote(
        request_id=req.id,
        listing_id=listing.id,
        fx_cny_usd=inputs.fx_cny_usd,
        freight_cost_bsd=inputs.freight_cost_bsd,
        freight_markup_pct=inputs.freight_markup_pct,
        insurance_bsd=inputs.insurance_bsd,
        service_fee_pct=inputs.service_fee_pct,
        service_fee_min_bsd=inputs.service_fee_min_bsd,
        margin_bsd=b.margin_bsd,
        product_cost_bsd=b.product_cost_bsd,
        shipping_bsd=b.shipping_bsd,
        service_fee_bsd=b.service_fee_bsd,
        total_bsd=b.total_bsd,
        message=body.message,
        expires_at=datetime.now(timezone.utc) + timedelta(days=QUOTE_VALID_DAYS),
    )
    db.add(quote)
    req.status = "quote_ready"
    msg = f"Your quote is ready: ${b.total_bsd:,.2f} BSD all-in, valid for {QUOTE_VALID_DAYS} days."
    add_event(db, req, "quote", msg)
    notify_customer(db, background, req, "Your quote is ready", msg)
    db.commit()
    return AdminQuoteOut.model_validate(quote)


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
