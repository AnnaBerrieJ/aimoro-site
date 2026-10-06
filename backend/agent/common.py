"""Shared helpers: ownership checks and customer-safe serialization."""
import os
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import ProductRequest, Quote, User
from .schemas import CustomerQuoteOut, CustomerShipmentOut, EventOut, InvoiceOut, RequestOut

UPLOAD_DIR = os.getenv(
    "UPLOAD_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"),
)


def aware(dt: datetime) -> datetime:
    """SQLite drops tzinfo; treat stored datetimes as UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def is_expired(quote: Quote) -> bool:
    return aware(quote.expires_at) < datetime.now(timezone.utc)


def current_quote(req: ProductRequest) -> Quote | None:
    """The quote the customer should see: approved first, else newest sent."""
    approved = [q for q in req.quotes if q.status == "approved"]
    if approved:
        return approved[-1]
    sent = sorted((q for q in req.quotes if q.status == "sent"), key=lambda q: q.id)
    return sent[-1] if sent else None


def get_request_for(db: Session, request_id: int, user: User) -> ProductRequest:
    req = db.get(ProductRequest, request_id)
    # Same 404 for "missing" and "not yours" so ids can't be probed.
    if req is None or (req.user_id != user.id and user.role != "admin"):
        raise HTTPException(404, "Request not found")
    return req


def delivery_address(req: ProductRequest) -> str:
    """Where AIMORO delivers: the request's own address, else the profile address."""
    return (req.delivery_address or req.user.address or "").strip()


def to_customer(req: ProductRequest) -> RequestOut:
    q = current_quote(req)
    quote_out = None
    if q is not None:
        quote_out = CustomerQuoteOut.model_validate(q)
        if q.status == "sent" and is_expired(q):
            quote_out.status = "expired"
    invoice_out = InvoiceOut.model_validate(q.invoice) if q is not None and q.invoice else None
    return RequestOut(
        id=req.id,
        product_name=req.product_name,
        description=req.description,
        reference_url=req.reference_url,
        delivery_address=delivery_address(req),
        has_photo=bool(req.photo_path),
        quantity=req.quantity,
        target_price_bsd=req.target_price_bsd,
        status=req.status,
        tracking_number=req.tracking_number,
        created_at=req.created_at,
        updated_at=req.updated_at,
        quote=quote_out,
        invoice=invoice_out,
        shipment=CustomerShipmentOut.model_validate(req.shipment) if req.shipment else None,
        timeline=[EventOut.model_validate(e) for e in req.events if e.customer_visible],
    )
