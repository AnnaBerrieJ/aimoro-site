"""Shared helpers: ownership checks and customer-safe serialization."""
import json
import os
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from .models import ProductRequest, Quote, SupplierListing, User
from .schemas import (CustomerOptionOut, CustomerQuoteOut, CustomerShipmentOut, EventOut, InvoiceOut,
                      RequestOut, SpecRow, WarehousePhotoOut)

UPLOAD_DIR = os.getenv(
    "UPLOAD_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"),
)


def aware(dt: datetime) -> datetime:
    """SQLite drops tzinfo; treat stored datetimes as UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def is_expired(quote: Quote) -> bool:
    return aware(quote.expires_at) < datetime.now(timezone.utc)


ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_PHOTO_BYTES = 8 * 1024 * 1024


async def save_photo(file: UploadFile, prefix: str) -> str:
    """Validate and store an uploaded image; returns the stored file name."""
    ext = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if ext is None:
        raise HTTPException(400, "Photo must be a JPG, PNG or WebP file")
    data = await file.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(400, "Photo must be under 8 MB")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    name = f"{prefix}_{uuid.uuid4().hex}{ext}"
    with open(os.path.join(UPLOAD_DIR, name), "wb") as fh:
        fh.write(data)
    return name


ALLOWED_VIDEO_TYPES = {"video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm", "video/x-m4v": ".m4v"}
MAX_VIDEO_BYTES = int(float(os.getenv("MAX_VIDEO_MB", "100")) * 1024 * 1024)


async def save_media(file: UploadFile, prefix: str) -> tuple[str, str]:
    """Store an uploaded photo or video. Returns (stored file name, "image" or "video").
    Videos are written in chunks so large files never sit in memory."""
    ctype = file.content_type or ""
    if ctype in ALLOWED_IMAGE_TYPES:
        return await save_photo(file, prefix), "image"
    ext = ALLOWED_VIDEO_TYPES.get(ctype)
    if ext is None:
        raise HTTPException(400, "Files must be photos (JPG, PNG, WebP) or videos (MP4, MOV, WebM)")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    name = f"{prefix}_{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, name)
    size = 0
    with open(dest, "wb") as fh:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_VIDEO_BYTES:
                fh.close()
                os.remove(dest)
                raise HTTPException(400, f"Videos must be under {MAX_VIDEO_BYTES // (1024 * 1024)} MB")
            fh.write(chunk)
    return name, "video"


def upload_path(name: str) -> str:
    return os.path.join(UPLOAD_DIR, os.path.basename(name))


def parse_specs(listing: SupplierListing | None) -> list[SpecRow]:
    if listing is None or not listing.specs_json:
        return []
    try:
        return [SpecRow(**row) for row in json.loads(listing.specs_json)]
    except (ValueError, TypeError):
        return []


def active_options(req: ProductRequest) -> list[Quote]:
    """The options the customer is looking at: the approved one, else the latest sent proposal."""
    approved = [q for q in req.quotes if q.status == "approved"]
    if approved:
        return approved[-1:]
    sent = [q for q in req.quotes if q.status == "sent"]
    return sorted(sent, key=lambda q: (q.option_number or 1, q.id))


def current_quote(req: ProductRequest) -> Quote | None:
    """The single quote shown in summaries: the approved one, else option 1 of the latest proposal."""
    opts = active_options(req)
    return opts[0] if opts else None


def option_out(req: ProductRequest, q: Quote) -> CustomerOptionOut:
    listing = q.listing
    status = "expired" if q.status == "sent" and is_expired(q) else q.status
    return CustomerOptionOut(
        id=q.id,
        option_number=q.option_number or 1,
        # Fall back to the customer's own wording, never the supplier's listing title.
        title=((listing.public_title if listing else None) or req.product_name).strip(),
        notes=((listing.public_notes if listing else None) or "").strip(),
        specs=parse_specs(listing),
        has_photo=bool(listing and listing.photo_path),
        product_cost_bsd=q.product_cost_bsd,
        shipping_bsd=q.shipping_bsd,
        service_fee_bsd=q.service_fee_bsd,
        total_bsd=q.total_bsd,
        status=status,
        expires_at=q.expires_at,
    )


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
        options=[option_out(req, o) for o in active_options(req)],
        timeline=[EventOut.model_validate(e) for e in req.events if e.customer_visible],
        warehouse_photos=[WarehousePhotoOut.model_validate(p) for p in req.warehouse_photos],
    )
