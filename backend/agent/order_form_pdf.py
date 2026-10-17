"""Order form PDF (fpdf2): AIMORO's internal record of one request, saved to its Drive folder.

Internal only (Ashley's records). It may show the supplier order number, but never CNY
prices, exchange rate, freight cost or margin. Same brand colours and logo as invoice_pdf.py.
"""
from datetime import datetime, timezone

from fpdf import FPDF

from .common import current_quote, delivery_address
from .invoice_pdf import LOGO_PATH, NAVY, RED, SLATE, LIGHT, SITE, CONTACT_EMAIL
from .models import ProductRequest

import os

STATUS_LABELS = {
    "received": "Received", "sourcing": "Sourcing", "quote_ready": "Quote ready", "paid": "Paid",
    "ordered": "Ordered", "shipped": "Shipped", "delivered": "Delivered", "cancelled": "Cancelled",
}


def ref(req: ProductRequest) -> str:
    return f"REQ-{req.id:04d}"


def _t(text) -> str:
    """fpdf's built-in Helvetica is Latin-1 only; customer text can contain anything."""
    s = "" if text is None else str(text)
    s = s.replace("\u2013", "-").replace("\u2014", "-").replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"')
    return s.encode("latin-1", "replace").decode("latin-1")


def _date(d) -> str:
    return f"{d:%B} {d.day}, {d.year}" if d else "-"


def _money(x) -> str:
    return f"${x:,.2f}" if x is not None else "-"


def build_order_form_pdf(req: ProductRequest) -> bytes:
    user = req.user
    q = current_quote(req)
    inv = q.invoice if q is not None else None
    ship = req.shipment

    pdf = FPDF(format="Letter", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=22)
    pdf.set_margins(18, 16, 18)
    pdf.add_page()
    L, W = 18, pdf.w - 36

    # Header: logo left, title right
    top = 16
    if os.path.exists(LOGO_PATH):
        pdf.image(LOGO_PATH, x=L, y=top, h=26)
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(*SLATE)
    pdf.set_xy(L + 30, top + 9)
    pdf.cell(70, 5, SITE)
    pdf.set_xy(L + 30, top + 14.5)
    pdf.cell(70, 5, CONTACT_EMAIL)

    rx = L + W - 75
    pdf.set_xy(rx, top + 1)
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*RED)
    pdf.cell(75, 10, "ORDER FORM", align="R")
    pdf.set_font("Helvetica", "", 9.5)
    for i, (label, value) in enumerate([
        ("Request no.", ref(req)),
        ("Received", _date(req.created_at)),
        ("Status", STATUS_LABELS.get(req.status, req.status)),
    ]):
        pdf.set_xy(rx, top + 13 + i * 5.2)
        pdf.set_text_color(*SLATE)
        pdf.cell(35, 5, label, align="R")
        pdf.set_text_color(*NAVY)
        pdf.cell(40, 5, _t(value), align="R")

    pdf.set_draw_color(*RED)
    pdf.set_line_width(0.8)
    pdf.line(L, top + 33, L + W, top + 33)
    pdf.set_y(top + 38)

    def section(title: str):
        pdf.ln(2)
        pdf.set_fill_color(*NAVY)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(W, 7, f"  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1.5)

    def row(label: str, value, bold: bool = False):
        pdf.set_font("Helvetica", "", 9.5)
        pdf.set_text_color(*SLATE)
        pdf.cell(48, 6, label)
        pdf.set_font("Helvetica", "B" if bold else "", 9.5)
        pdf.set_text_color(*NAVY)
        pdf.multi_cell(W - 48, 6, _t(value) or "-", new_x="LMARGIN", new_y="NEXT")

    section("CUSTOMER")
    row("Name", user.name, bold=True)
    row("Email", user.email)
    row("Phone / WhatsApp", user.phone)
    row("Island", user.island)
    row("Deliver to", delivery_address(req))

    section("ITEM REQUESTED")
    row("Product", f"{req.product_name} x {req.quantity}", bold=True)
    if req.description:
        row("Description", req.description)
    if req.reference_url:
        row("Reference link", req.reference_url)
    if req.target_price_bsd is not None:
        row("Target price", _money(req.target_price_bsd))
    row("Customer photo", "Saved in this folder" if req.photo_path else "None")

    section("QUOTE (BSD)")
    if q is None:
        row("Quote", "Not sent yet")
    else:
        n_opts = len([x for x in req.quotes if x.status == "sent"])
        row("Status", "Approved" if q.status == "approved" else f"Sent ({n_opts} option{'s' if n_opts != 1 else ''})")
        row("Product cost", _money(q.product_cost_bsd))
        row("Shipping to address", _money(q.shipping_bsd))
        row("Service fee", _money(q.service_fee_bsd))
        pdf.set_fill_color(*LIGHT)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*NAVY)
        pdf.cell(48, 7, "  Total", fill=True)
        pdf.set_text_color(*RED)
        pdf.cell(W - 48, 7, _money(q.total_bsd), fill=True, new_x="LMARGIN", new_y="NEXT")

    section("PAYMENT")
    if inv is None:
        row("Invoice", "Not issued yet")
    else:
        row("Invoice no.", inv.number, bold=True)
        row("Amount", _money(inv.amount_bsd))
        row("Status", "Paid" if inv.status == "paid" else inv.status.capitalize())
        if inv.paid_at:
            row("Paid on", _date(inv.paid_at))
        if inv.payment_ref:
            row("Payment reference", inv.payment_ref)
    if req.report_paid_at:
        row("Report fee paid", _date(req.report_paid_at))

    section("FULFILMENT")
    row("Supplier order no.", req.supplier_order_no or "-")
    row("Ordered on", _date(req.ordered_at))
    row("At warehouse", _date(req.warehouse_arrived_at))
    if ship is not None:
        row("Shipment", ship.reference)
        row("Carrier / tracking", f"{ship.carrier} {ship.tracking_number}".strip() or "-")
        row("ETA", ship.eta or "-")
        row("Delivered on", _date(ship.delivered_at))
    else:
        row("Shipment", "Not shipped yet")

    # Footer
    pdf.set_auto_page_break(False)
    pdf.set_y(-16)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*SLATE)
    now = datetime.now(timezone.utc)
    pdf.cell(W, 4, f"AIMORO internal record. Not for customers. Updated {_date(now)} {now:%H:%M} UTC.", align="C")
    return bytes(pdf.output())
