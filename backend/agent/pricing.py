"""Quote formula for China -> Bahamas orders.

AIMORO's service ends when the order is delivered to the customer's address.

    Total = product (incl. shipping within China) + shipping to the address + service fee

All money is in BSD (pegged 1:1 to USD).
"""
from dataclasses import asdict, dataclass


@dataclass
class QuoteInputs:
    price_cny: float
    quantity: int
    china_shipping_cny: float
    fx_cny_usd: float
    freight_cost_bsd: float = 0.0
    freight_markup_pct: float = 0.0
    insurance_bsd: float = 0.0
    service_fee_pct: float = 0.12
    service_fee_min_bsd: float = 15.0


@dataclass
class QuoteBreakdown:
    product_cost_bsd: float
    shipping_bsd: float
    service_fee_bsd: float
    total_bsd: float
    margin_bsd: float

    def as_dict(self):
        return asdict(self)


def _r(x: float) -> float:
    return round(x + 1e-9, 2)


def calculate_quote(q: QuoteInputs) -> QuoteBreakdown:
    if q.quantity < 1:
        raise ValueError("quantity must be at least 1")
    if q.fx_cny_usd <= 0:
        raise ValueError("fx rate must be positive")

    product_cost = (q.price_cny * q.quantity + q.china_shipping_cny) * q.fx_cny_usd
    freight_markup = q.freight_cost_bsd * q.freight_markup_pct
    shipping = q.freight_cost_bsd + freight_markup + q.insurance_bsd
    service_fee = max(product_cost * q.service_fee_pct, q.service_fee_min_bsd)

    return QuoteBreakdown(
        product_cost_bsd=_r(product_cost),
        shipping_bsd=_r(shipping),
        service_fee_bsd=_r(service_fee),
        total_bsd=_r(product_cost + shipping + service_fee),
        margin_bsd=_r(service_fee + freight_markup),
    )
