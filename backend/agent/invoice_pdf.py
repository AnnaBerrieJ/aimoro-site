"""Invoice PDF generation (fpdf2). Customer-safe: only BSD line items."""
from fpdf import FPDF

from .models import Invoice

import os

BUSINESS_NAME = "AIMORO"
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "aimoroinfo@gmail.com")


def _money(x: float) -> str:
    return f"${x:,.2f}"


def build_invoice_pdf(invoice: Invoice) -> bytes:
    quote = invoice.quote
    req = quote.request
    user = req.user

    pdf = FPDF(format="Letter")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 10, BUSINESS_NAME, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 5, "Sourcing and shipping from China to The Bahamas", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5, f"aimoro.co  |  {CONTACT_EMAIL}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, f"Invoice {invoice.number}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 5, f"Date: {invoice.created_at:%B %d, %Y}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5, f"Status: {invoice.status.upper()}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 5, "Bill to", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    for line in [user.name, user.email, user.phone, req.delivery_address or user.address, user.island]:
        if line:
            pdf.multi_cell(0, 5, line, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 10)
    pdf.multi_cell(0, 5, f"Order: {req.product_name} (quantity {req.quantity}), request #{req.id}",
                   new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    rows = [
        ("Product cost (incl. shipping within China)", quote.product_cost_bsd),
        ("International shipping to your address", quote.shipping_bsd),
        ("Service fee", quote.service_fee_bsd),
    ]
    pdf.set_font("Helvetica", "", 10)
    for label, amount in rows:
        pdf.cell(140, 7, label, border="B")
        pdf.cell(0, 7, _money(amount), border="B", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(140, 9, "Total due (BSD)")
    pdf.cell(0, 9, _money(invoice.amount_bsd), align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    pdf.set_font("Helvetica", "", 8)
    pdf.multi_cell(0, 4, "AIMORO's service is complete on delivery to the address above. BSD is pegged 1:1 to USD.")
    return bytes(pdf.output())
