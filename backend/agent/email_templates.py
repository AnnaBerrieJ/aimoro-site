"""Ready-to-edit customer email templates, filled in with each request's details.

Bodies are plain text: a blank line starts a paragraph, "* " lines are bullets,
"1. " lines are a numbered list and **text** is bold (see notify.email_html).
"""
import os

from .common import active_options, delivery_address, option_out
from .models import ProductRequest
from .notify import CONTACT_WHATSAPP, SITE_URL

SENDER_NAME = os.getenv("EMAIL_SENDER_NAME", "Ashley")
PAYMENT_METHODS = os.getenv("PAYMENT_METHODS", "PayPal, Zelle or RBC bank transfer")


def _num(env: str, default: float) -> float:
    try:
        return float(os.getenv(env, default))
    except ValueError:
        return default


def _money(x: float) -> str:
    return f"${x:,.2f}"


def _date(d) -> str:
    return f"{d:%B} {d.day}, {d:%Y}" if d else ""


def _first_name(req: ProductRequest) -> str:
    name = (req.user.name or "").strip()
    return name.split(" ")[0] if name else "there"


def _signoff() -> str:
    return f"Kind regards,\n{SENDER_NAME}"


def _questions(valid_until: str = "") -> str:
    lead = f"The options in this report are valid until **{valid_until}**. " if valid_until else ""
    return (f"{lead}If you have any questions, please reply to this email or message us on WhatsApp "
            f"at {CONTACT_WHATSAPP}.")


def _option_lines(req: ProductRequest) -> tuple[list[str], str]:
    opts = active_options(req)
    lines = []
    for q in opts:
        o = option_out(req, q)
        price = _money(o.total_bsd) + (" + shipping" if not o.shipping_bsd else "")
        lines.append(f"* Option {o.option_number}: {o.title} ({price})")
    valid = _date(opts[0].expires_at) if opts else ""
    return lines, valid


def _latest_invoice(req: ProductRequest):
    invs = [q.invoice for q in req.quotes if getattr(q, "invoice", None) is not None]
    return sorted(invs, key=lambda i: i.id)[-1] if invs else None


def email_templates(req: ProductRequest) -> list[dict]:
    hi = f"Hello {_first_name(req)},"
    product = req.product_name
    link = f"{SITE_URL}/my-requests/{req.id}"
    hourly, phase2 = _num("SOURCING_FEE_HOURLY", 25), _num("PHASE2_FEE", 100)
    lines, valid = _option_lines(req)
    n = len(lines)
    count = f"{n} option{'s' if n != 1 else ''}"
    found = "\n".join(lines) if lines else "* (Send the options first, then reload this template.)"
    out = []

    out.append({"key": "options_preview", "label": "Phase 1: preview report",
                "subject": f"Your AIMORO sourcing options – Phase 1 ({product})",
                "attachments": ["options_preview"],
                "body": "\n\n".join([
                    hi,
                    f"Thank you for choosing AIMORO. Please find attached the Phase 1 sourcing report for your request, "
                    f"**{product}** (request #{req.id}). We found {count}:",
                    found,
                    "The report compares what you asked for with what we found, side by side, with pricing for every "
                    "option. This is a preview report, so model names, photos and some details are hidden until you "
                    "decide to proceed.",
                    f"**Sourcing fee waived**\nOur standard sourcing fee is {_money(hourly)} per hour. As a Friends and "
                    "Family courtesy, we have waived this fee for Phase 1.",
                    f"**Next step: Phase 2**\nIf you would like to proceed, a {_money(phase2)} fee gives you:",
                    "* The full report, with model names, photos and complete specifications for every option\n"
                    "* Continuation of the ordering process for the option you choose: confirming details with the "
                    "seller, final pricing and shipping arrangements",
                    f"Please note that the {_money(phase2)} Phase 2 fee is separate from the price of your order and is "
                    "not deducted from it.",
                    f"**Payment:** {PAYMENT_METHODS}. We will send the payment details by WhatsApp.",
                    _questions(valid), _signoff()])})

    out.append({"key": "options_full", "label": "Phase 2: full report",
                "subject": f"Your AIMORO full report – Phase 2 ({product})",
                "attachments": ["options_full"],
                "body": "\n\n".join([
                    hi,
                    f"Thank you for your payment. Your {_money(phase2)} Phase 2 fee has been received.",
                    f"Please find attached your full sourcing report for **{product}**. It now includes the model "
                    "names, clear photos and complete specifications for every option:",
                    found,
                    "**Next steps**",
                    "1. Choose your option: reply to this email or message us on WhatsApp.\n"
                    "2. We confirm the details with the seller.\n"
                    "3. We send your invoice.",
                    f"**Payment:** {PAYMENT_METHODS}. Please use your invoice number as the payment reference and send "
                    "us a screenshot of your payment confirmation.",
                    _questions(valid), _signoff()])})

    out.append({"key": "quote", "label": "Quote or options ready (short)",
                "subject": f"Your options are ready · {product}",
                "attachments": ["options_full"],
                "body": "\n\n".join([
                    hi, f"Good news: we found {count} for your request, **{product}**:", found,
                    f"Compare them side by side and choose one here: {link}",
                    _questions(valid), _signoff()])})

    inv = _latest_invoice(req)
    if inv is not None:
        out.append({"key": "invoice", "label": "Invoice",
                    "subject": f"Invoice {inv.number} · {product}",
                    "attachments": ["invoice"],
                    "body": "\n\n".join([
                        hi,
                        f"Thank you for choosing your option. Please find attached invoice **{inv.number}** for "
                        f"**{product}**, for a total of **{_money(inv.amount_bsd)} BSD**.",
                        f"**How to pay:** {PAYMENT_METHODS}. We will send the payment details by WhatsApp. Please "
                        "use the invoice number as the payment reference and send us a screenshot of your payment "
                        "confirmation.",
                        "As soon as your payment is confirmed, we place your order with the supplier.",
                        _questions(), _signoff()])})
        out.append({"key": "paid", "label": "Payment received",
                    "subject": f"Payment received · {product}",
                    "attachments": ["invoice"],
                    "body": "\n\n".join([
                        hi,
                        f"Thank you! We have received your payment for invoice **{inv.number}** "
                        f"({_money(inv.amount_bsd)} BSD).",
                        "We are now placing your order with the supplier. We will keep you updated at every step, and "
                        f"you can follow your order here: {link}",
                        _questions(), _signoff()])})

    ship = getattr(req, "shipment", None)
    if ship is not None:
        track = f"\nTracking number: {ship.tracking_number}" if ship.tracking_number else ""
        carrier = f" with {ship.carrier}" if ship.carrier else ""
        out.append({"key": "shipped", "label": "Order shipped",
                    "subject": f"Your order is on the way · {product}",
                    "attachments": [],
                    "body": "\n\n".join([
                        hi, f"Your order, **{product}**, has left China by {ship.method}{carrier}.{track}",
                        f"We will let you know as soon as it is delivered to {delivery_address(req)}.",
                        _questions(), _signoff()])})
        out.append({"key": "delivered", "label": "Order delivered",
                    "subject": f"Delivered · {product}",
                    "attachments": [],
                    "body": "\n\n".join([
                        hi, f"Your order, **{product}**, has been delivered to {delivery_address(req)}.",
                        "Thank you for shopping with AIMORO! We would love to help with your next order.",
                        _questions(), _signoff()])})

    out.append({"key": "custom", "label": "Blank email",
                "subject": f"Your AIMORO request · {product}", "attachments": [],
                "body": "\n\n".join([hi, "", _questions(), _signoff()])})
    return out
