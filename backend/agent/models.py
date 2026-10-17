"""Tables for the sourcing-agent flow.

Privacy rule: supplier_listings and the cost/margin columns on quotes are
admin-only. Customer-facing schemas in schemas.py never include them.
"""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow():
    return datetime.now(timezone.utc)


REQUEST_STATUSES = [
    "received", "sourcing", "quote_ready", "paid",
    "ordered", "shipped", "delivered", "cancelled",
]
PLATFORMS = ["taobao", "pinduoduo", "1688", "alibaba", "aliexpress", "other"]
SHIPMENT_METHODS = ["courier", "air", "sea"]
# Forward-only order of shipment states. AIMORO's job ends at "delivered"
# (to the customer's address).
SHIPMENT_STATUSES = ["preparing", "in_transit", "delivered"]


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="customer")  # customer | admin
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(50), default="")
    country: Mapped[str | None] = mapped_column(String(40), nullable=True, default="Bahamas")
    island: Mapped[str] = mapped_column(String(100), default="New Providence")  # island / state / province
    address: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    requests: Mapped[list["ProductRequest"]] = relationship(back_populates="user")


class ProductRequest(Base):
    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    product_name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    reference_url: Mapped[str] = mapped_column(Text, default="")
    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_path: Mapped[str] = mapped_column(Text, default="")
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    target_price_bsd: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="received", index=True)
    admin_notes: Mapped[str] = mapped_column(Text, default="")
    tracking_number: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Phase 2: supplier order + China warehouse (admin-only details)
    supplier_order_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ordered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    warehouse_arrived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    warehouse_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    shipment_id: Mapped[int | None] = mapped_column(ForeignKey("shipments.id"), nullable=True, index=True)
    # Friends and Family: sourcing fee waived for this request (set by admin)
    fee_waived: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    # Report fee: the options stay blurred (preview) until Ashley confirms this payment,
    # then the customer sees the full report and can choose an option.
    report_paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    report_fee_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Google Drive folder holding this request's files (set by gsync.py)
    drive_folder_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    user: Mapped[User] = relationship(back_populates="requests")
    shipment: Mapped["Shipment | None"] = relationship(back_populates="requests")
    events: Mapped[list["RequestEvent"]] = relationship(
        back_populates="request", cascade="all, delete-orphan", order_by="RequestEvent.id")

    listings: Mapped[list["SupplierListing"]] = relationship(back_populates="request", cascade="all, delete-orphan")
    quotes: Mapped[list["Quote"]] = relationship(back_populates="request", cascade="all, delete-orphan")
    warehouse_photos: Mapped[list["WarehousePhoto"]] = relationship(
        back_populates="request", cascade="all, delete-orphan", order_by="WarehousePhoto.id")


class SupplierListing(Base):
    """A product Ashley found while sourcing. Admin-only."""
    __tablename__ = "supplier_listings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    platform: Mapped[str] = mapped_column(String(20))
    url: Mapped[str] = mapped_column(Text, default="")
    title: Mapped[str] = mapped_column(Text, default="")
    # Prices are in `currency` (CNY by default, or USD). Column names kept for compatibility.
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True, default="CNY")
    price_cny: Mapped[float] = mapped_column(Float)
    china_shipping_cny: Mapped[float] = mapped_column(Float, default=0)
    seller_rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    is_chosen: Mapped[bool] = mapped_column(Boolean, default=False)

    # Customer-facing presentation of this find (shown when it is sent as an option).
    # Everything above stays admin-only.
    public_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Short general description shown in the blurred preview, e.g. "Scanner A" (no model name).
    preview_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    public_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    specs_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # [{label, requested, found, match}]
    photo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    request: Mapped[ProductRequest] = relationship(back_populates="listings")


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    listing_id: Mapped[int | None] = mapped_column(ForeignKey("supplier_listings.id"), nullable=True)
    # Quotes sent together are one proposal; option_number is 1-3 within it.
    proposal_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    option_number: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Inputs (admin-only)
    fx_cny_usd: Mapped[float] = mapped_column(Float)
    freight_cost_bsd: Mapped[float] = mapped_column(Float, default=0)
    freight_markup_pct: Mapped[float] = mapped_column(Float, default=0)
    insurance_bsd: Mapped[float] = mapped_column(Float, default=0)
    service_fee_pct: Mapped[float] = mapped_column(Float, default=0.12)
    service_fee_min_bsd: Mapped[float] = mapped_column(Float, default=15)
    margin_bsd: Mapped[float] = mapped_column(Float, default=0)

    # Customer-visible line items (BSD). total = product + shipping + service fee.
    product_cost_bsd: Mapped[float] = mapped_column(Float)
    shipping_bsd: Mapped[float] = mapped_column(Float)
    service_fee_bsd: Mapped[float] = mapped_column(Float)
    total_bsd: Mapped[float] = mapped_column(Float)

    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="sent")  # sent | approved | expired | superseded
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    request: Mapped[ProductRequest] = relationship(back_populates="quotes")
    listing: Mapped["SupplierListing | None"] = relationship()
    invoice: Mapped["Invoice | None"] = relationship(back_populates="quote", uselist=False)


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quote_id: Mapped[int] = mapped_column(ForeignKey("quotes.id"), unique=True)
    number: Mapped[str] = mapped_column(String(30), unique=True)
    amount_bsd: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="sent")  # sent | paid | refunded
    payment_ref: Mapped[str] = mapped_column(String(255), default="")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    quote: Mapped[Quote] = relationship(back_populates="invoice")


class Shipment(Base):
    """One consolidated shipment China -> Bahamas, carrying one or more requests."""
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reference: Mapped[str] = mapped_column(String(30), unique=True)
    method: Mapped[str] = mapped_column(String(20), default="air")
    carrier: Mapped[str] = mapped_column(String(100), default="")
    tracking_number: Mapped[str] = mapped_column(String(100), default="")
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    freight_cost_bsd: Mapped[float | None] = mapped_column(Float, nullable=True)  # admin-only
    status: Mapped[str] = mapped_column(String(20), default="preparing", index=True)
    eta: Mapped[str] = mapped_column(String(20), default="")  # YYYY-MM-DD, optional
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    shipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    requests: Mapped[list[ProductRequest]] = relationship(back_populates="shipment")


class RequestEvent(Base):
    """Timeline entry. customer_visible=False entries are admin-only."""
    __tablename__ = "request_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    kind: Mapped[str] = mapped_column(String(40))
    message: Mapped[str] = mapped_column(Text)
    customer_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    request: Mapped[ProductRequest] = relationship(back_populates="events")


class Notification(Base):
    """Log of every customer/admin notification attempt."""
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    request_id: Mapped[int | None] = mapped_column(ForeignKey("requests.id"), nullable=True, index=True)
    channel: Mapped[str] = mapped_column(String(20), default="email")
    to_address: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    # draft (waiting for admin review) | queued | sent | skipped | failed | discarded
    status: Mapped[str] = mapped_column(String(20), default="queued")
    error: Mapped[str] = mapped_column(Text, default="")
    attachments: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list, e.g. ["invoice"]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class WarehousePhoto(Base):
    """Photos and videos taken at the China warehouse check, shown to the customer."""
    __tablename__ = "warehouse_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    path: Mapped[str] = mapped_column(Text)
    caption: Mapped[str] = mapped_column(String(200), default="")
    media_type: Mapped[str | None] = mapped_column(String(10), nullable=True, default="image")  # image | video
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    request: Mapped[ProductRequest] = relationship(back_populates="warehouse_photos")
