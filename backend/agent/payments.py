"""Optional Stripe Checkout for invoices.

If STRIPE_SECRET_KEY is not set, invoices are paid by bank transfer and
Ashley marks them paid in the admin. With a key set, customers get a card
checkout; on return the app asks Stripe whether the session was paid.
"""
import os

import httpx

STRIPE_API = "https://api.stripe.com/v1"


def stripe_enabled() -> bool:
    return bool(os.getenv("STRIPE_SECRET_KEY"))


def _auth():
    return (os.environ["STRIPE_SECRET_KEY"], "")


def create_checkout_session(invoice_id: int, number: str, amount_bsd: float,
                            customer_email: str, success_url: str, cancel_url: str) -> dict:
    data = {
        "mode": "payment",
        "customer_email": customer_email,
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": str(invoice_id),
        "metadata[invoice_id]": str(invoice_id),
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": str(int(round(amount_bsd * 100))),
        "line_items[0][price_data][product_data][name]": f"AIMORO invoice {number}",
    }
    resp = httpx.post(f"{STRIPE_API}/checkout/sessions", data=data, auth=_auth(), timeout=15)
    resp.raise_for_status()
    return resp.json()


def get_checkout_session(session_id: str) -> dict:
    resp = httpx.get(f"{STRIPE_API}/checkout/sessions/{session_id}", auth=_auth(), timeout=15)
    resp.raise_for_status()
    return resp.json()
