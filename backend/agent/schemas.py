"""Request/response models.

Customer-facing models (RequestOut, CustomerQuoteOut, InvoiceOut) must never
include supplier listings, CNY prices, FX rate, freight cost or margin.
"""
from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SignupIn(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str = Field(min_length=1)
    phone: str = ""
    island: str = "New Providence"
    address: str = ""

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Enter a valid email")
        return v


class LoginIn(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    role: str
    name: str
    phone: str
    island: str
    address: str


class TokenOut(BaseModel):
    token: str
    user: UserOut


class RequestIn(BaseModel):
    product_name: str = Field(min_length=2, max_length=255)
    description: str = ""
    reference_url: str = ""
    delivery_address: str = ""  # blank = use the address on the customer's profile
    quantity: int = Field(default=1, ge=1, le=100000)
    target_price_bsd: float | None = Field(default=None, ge=0)


class CustomerQuoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_cost_bsd: float
    shipping_bsd: float
    service_fee_bsd: float
    total_bsd: float
    message: str
    status: str
    created_at: datetime
    expires_at: datetime


class SpecRow(BaseModel):
    """One line of the side-by-side comparison: what the customer asked for vs what we found."""
    label: str = Field(min_length=1, max_length=60)
    requested: str = Field(default="", max_length=200)
    found: str = Field(default="", max_length=200)
    match: Literal["match", "close", "different"] = "match"


class CustomerOptionOut(BaseModel):
    """A found product as the customer sees it. Never includes supplier, platform, link or CNY price."""
    id: int  # the quote id; used to choose this option
    option_number: int
    title: str
    notes: str
    specs: list[SpecRow]
    has_photo: bool
    product_cost_bsd: float
    shipping_bsd: float
    service_fee_bsd: float
    total_bsd: float
    status: str
    expires_at: datetime


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    number: str
    amount_bsd: float
    status: str
    paid_at: datetime | None
    created_at: datetime


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    kind: str
    message: str
    created_at: datetime


class CustomerShipmentOut(BaseModel):
    """Shipment as the customer sees it: no freight cost, weight or notes."""
    model_config = ConfigDict(from_attributes=True)
    reference: str
    method: str
    carrier: str
    tracking_number: str
    status: str
    eta: str
    shipped_at: datetime | None
    delivered_at: datetime | None


class RequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_name: str
    description: str
    reference_url: str
    delivery_address: str = ""
    has_photo: bool = False
    quantity: int
    target_price_bsd: float | None
    status: str
    tracking_number: str
    created_at: datetime
    updated_at: datetime
    quote: CustomerQuoteOut | None = None
    invoice: InvoiceOut | None = None
    shipment: CustomerShipmentOut | None = None
    options: list[CustomerOptionOut] = []
    timeline: list[EventOut] = []


# ---------- admin ----------

class ListingIn(BaseModel):
    platform: str
    url: str = ""
    title: str = ""
    price_cny: float = Field(ge=0)
    china_shipping_cny: float = Field(default=0, ge=0)
    seller_rating: float | None = Field(default=None, ge=0, le=5)
    weight_kg: float | None = Field(default=None, ge=0)
    notes: str = ""
    # customer-facing
    public_title: str = Field(default="", max_length=120)
    public_notes: str = Field(default="", max_length=600)
    specs: list[SpecRow] = Field(default=[], max_length=12)


class ListingOut(ListingIn):
    id: int
    is_chosen: bool
    has_photo: bool = False
    price_bsd_estimate: float | None = None
    created_at: datetime


class QuoteBuildIn(BaseModel):
    listing_id: int
    fx_cny_usd: float | None = Field(default=None, gt=0)
    freight_cost_bsd: float = Field(default=0, ge=0)
    freight_markup_pct: float = Field(default=0, ge=0, le=2)
    insurance_bsd: float = Field(default=0, ge=0)
    service_fee_pct: float = Field(default=0.12, ge=0, le=1)
    service_fee_min_bsd: float = Field(default=15, ge=0)
    message: str = ""


class ProposalIn(BaseModel):
    """1-3 options sent together. Each option is priced like a single quote."""
    options: list["QuoteBuildIn"] = Field(min_length=1, max_length=3)
    message: str = ""


class AdminQuoteOut(CustomerQuoteOut):
    listing_id: int | None
    proposal_no: int | None = None
    option_number: int | None = None
    fx_cny_usd: float
    freight_cost_bsd: float
    freight_markup_pct: float
    insurance_bsd: float
    service_fee_pct: float
    service_fee_min_bsd: float
    margin_bsd: float


class CustomerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    phone: str
    island: str
    address: str


class AdminEventOut(EventOut):
    customer_visible: bool


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    to_address: str
    subject: str
    body: str
    status: str
    error: str
    created_at: datetime


class AdminRequestOut(RequestOut):
    admin_notes: str
    customer: CustomerBrief
    listings: list[ListingOut] = []
    quotes: list[AdminQuoteOut] = []
    supplier_order_no: str | None = None
    ordered_at: datetime | None = None
    warehouse_arrived_at: datetime | None = None
    warehouse_notes: str | None = None
    shipment_id: int | None = None
    events: list[AdminEventOut] = []
    notifications: list[NotificationOut] = []


class OrderIn(BaseModel):
    supplier_order_no: str = Field(min_length=1, max_length=100)
    note: str = ""


class WarehouseIn(BaseModel):
    notes: str = ""


class ShipmentIn(BaseModel):
    method: str = "air"
    carrier: str = ""
    tracking_number: str = ""
    weight_kg: float | None = Field(default=None, ge=0)
    freight_cost_bsd: float | None = Field(default=None, ge=0)
    eta: str = ""
    notes: str = ""


class ShipmentStatusIn(BaseModel):
    status: str


class ShipmentRequestBrief(BaseModel):
    id: int
    product_name: str
    quantity: int
    status: str
    customer_name: str
    customer_island: str
    delivery_address: str
    warehouse_arrived: bool


class AdminShipmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reference: str
    method: str
    carrier: str
    tracking_number: str
    weight_kg: float | None
    freight_cost_bsd: float | None
    status: str
    eta: str
    notes: str
    created_at: datetime
    shipped_at: datetime | None
    delivered_at: datetime | None
    requests: list[ShipmentRequestBrief] = []


class AdminRequestUpdate(BaseModel):
    status: str | None = None
    admin_notes: str | None = None
    tracking_number: str | None = None


ProposalIn.model_rebuild()
