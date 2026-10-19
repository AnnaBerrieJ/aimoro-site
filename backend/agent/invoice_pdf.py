"""Invoice PDF (fpdf2). Customer-safe: only BSD line items, never sourcing details."""
import os
from datetime import timedelta

from fpdf import FPDF

from .models import Invoice

BUSINESS_NAME = "AIMORO"
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "aimoroinfo@gmail.com")
SITE = "aimoro.co"
CONTACT_WHATSAPP = os.getenv("CONTACT_WHATSAPP", "+1 242-426-1965")
CONTACT_WHATSAPP_2 = os.getenv("CONTACT_WHATSAPP_2", "+1 281-673-6703")
CONTACT_WHATSAPP_ALL = " or ".join(n for n in (CONTACT_WHATSAPP, CONTACT_WHATSAPP_2) if n)
PAYMENT_METHODS = os.getenv("PAYMENT_METHODS", "PayPal, Zelle or RBC bank transfer")
PAYMENT_NOTE = os.getenv("INVOICE_PAYMENT_NOTE", "Payment details sent by WhatsApp.")
PAYMENT_DAYS = 7
LOGO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "aimoro-logo.png")

# Brand colours
RED = (196, 0, 0)
NAVY = (15, 23, 42)
SLATE = (71, 85, 105)
LIGHT = (241, 245, 249)
SAND = (245, 235, 221)
GREEN = (4, 120, 87)


def _money(x: float) -> str:
    return f"${x:,.2f}"


def _date(d) -> str:
    return f"{d:%B} {d.day}, {d.year}"


def _delivery_address(req, user) -> list[str]:
    """Address lines without repeating the island."""
    addr = (req.delivery_address or user.address or "").strip()
    lines = [addr] if addr else []
    if user.island and user.island.lower() not in addr.lower():
        lines.append(user.island)
    country = getattr(user, "country", None) or ""
    if country and country.lower() not in addr.lower():
        lines.append(country)
    return lines


def build_invoice_pdf(invoice: Invoice) -> bytes:
    quote = invoice.quote
    req = quote.request
    user = req.user
    paid = invoice.status == "paid"
    return _render_invoice(
        number=invoice.number, created_at=invoice.created_at, paid=paid, paid_at=invoice.paid_at,
        amount=invoice.amount_bsd, user=user,
        right_heading="DELIVER TO", right_lines=[user.name] + _delivery_address(req, user),
        order_title=f"{req.product_name} × {req.quantity}", order_sub=f"Request #{req.id}",
        rows=[
            ("Product cost", quote.product_cost_bsd),
            ("Shipping to your address", quote.shipping_bsd),
            ("Service fee", quote.service_fee_bsd),
        ],
        paid_text=f"We received your payment of {_money(invoice.amount_bsd)}. We will now order your item and keep you updated at {SITE}.",
        unpaid_closing="We order your item as soon as your payment is received.",
        footer_note="AIMORO's service is complete on delivery to the address above. ",
    )


def branding_invoice_due(project):
    return project.created_at + timedelta(days=PAYMENT_DAYS)


def build_branding_invoice_pdf(project) -> bytes:
    """Invoice for a branding package: same AIMORO layout, one line item, no delivery address."""
    user = project.user
    paid = project.paid_at is not None
    name = BRANDING_PACKAGE_NAMES.get(project.package, project.package.title())
    brief = [("Business", project.industry), ("About", project.description), ("Style", project.style_notes),
             ("Colours", project.colours), ("Examples", project.reference_url)]
    brief = [(k, " ".join((v or "").split())) for k, v in brief if (v or "").strip()]
    # Long briefs are shortened so the invoice always fits on one page.
    def cut(items, limit):
        return [(k, v if len(v) <= limit else v[:limit].rstrip() + "...") for k, v in items]
    attempts = [cut(brief, n) for n in (400, 220, 120, 70, 40)]
    attempts.append(cut(brief[:3], 40))  # last resort: the first few details only
    for notes in attempts:
        try:
            return _branding_invoice(project, user, paid, name, notes)
        except _TooLong:
            continue
    return _branding_invoice(project, user, paid, name, [], check=False)


class _TooLong(Exception):
    pass


def _branding_invoice(project, user, paid, name, notes, check=True) -> bytes:
    return _render_invoice(
        notes=notes, check_fit=check,
        number=project.invoice_number or "", created_at=project.created_at, paid=paid, paid_at=project.paid_at,
        amount=project.price_bsd, user=user,
        right_heading="BRAND", right_lines=[project.business_name],
        order_title=f"{name} branding package", order_sub=f"Branding project #{project.id}",
        rows=[(f"{name} branding package", project.price_bsd,
               BRANDING_PACKAGE_ITEMS.get(project.package, []))],
        paid_text=f"We received your payment of {_money(project.price_bsd)}. We will now start your design and keep you updated at {SITE}.",
        unpaid_closing="We start your design as soon as your payment is received.",
        footer_note="",
    )


BRANDING_PACKAGE_NAMES = {"basic": "Basic", "standard": "Standard", "full": "Full"}
# Keep in step with the package cards on frontend-next/app/branding/page.tsx.
BRANDING_PACKAGE_ITEMS = {
    "basic": [
        "Logo design: main, icon and one-colour versions",
        "Logo sized for social media: 1:1, 4:5, 9:16 and 16:9",
        "Brand colours and fonts",
        "1 product mockup",
        "1 round of changes",
    ],
    "standard": [
        "Everything in Basic",
        "Mockups of your logo on up to 5 products",
        "Logo placement guide",
        "Social media kit: profile picture, cover and 3 post templates",
        "Business card design",
        "2 rounds of changes",
    ],
    "full": [
        "Everything in Standard",
        "Website design: a custom one-page HTML website",
        "Signage and marketing materials",
        "Packaging design",
        "Complete brand guide (PDF)",
        "Production-ready files for manufacturing",
        "Sourcing fee waived on your first order",
        "3 rounds of changes",
    ],
}


def _latin1(text) -> str:
    """The built-in PDF font only has Latin-1 characters: swap common typographic ones, drop the rest (e.g. emoji)."""
    t = str(text or "")
    for a, b in {"\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u2013": "-", "\u2014": "-",
                 "\u2026": "...", "\u2022": "\u00b7", "\u00a0": " "}.items():
        t = t.replace(a, b)
    return " ".join(t.encode("latin-1", "ignore").decode("latin-1").split(" ")).strip() if t else ""


def _render_invoice(*, number, created_at, paid, paid_at, amount, user, right_heading, right_lines,
                    order_title, order_sub, rows, paid_text, unpaid_closing, footer_note,
                    notes=None, check_fit=False) -> bytes:
    pdf = FPDF(format="Letter", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_margins(18, 16, 18)
    pdf.add_page()
    W = pdf.w - 36  # content width
    L = 18

    # --- Header: logo left, invoice details right ---
    top = 16
    if os.path.exists(LOGO_PATH):
        pdf.image(LOGO_PATH, x=L, y=top, h=30)
    # The logo already carries the AIMORO wordmark; contact details sit beside it.
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(*SLATE)
    pdf.set_xy(L + 34, top + 11)
    pdf.cell(70, 5, SITE)
    pdf.set_xy(L + 34, top + 16.5)
    pdf.cell(70, 5, CONTACT_EMAIL)

    right_x = L + W - 70
    pdf.set_xy(right_x, top + 2)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(*RED)
    pdf.cell(70, 10, "INVOICE", align="R")
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(*NAVY)
    due = created_at + timedelta(days=PAYMENT_DAYS)
    for i, (label, value) in enumerate([
        ("Invoice no.", number),
        ("Date", _date(created_at)),
        ("Paid on" if paid else "Due by", _date(paid_at) if paid and paid_at else _date(due)),
    ]):
        pdf.set_xy(right_x, top + 13 + i * 5.2)
        pdf.set_text_color(*SLATE)
        pdf.cell(30, 5, label, align="R")
        pdf.set_text_color(*NAVY)
        pdf.cell(40, 5, value, align="R")

    # status pill
    pill = "PAID" if paid else "UNPAID"
    pdf.set_font("Helvetica", "B", 8.5)
    pw = pdf.get_string_width(pill) + 8
    pdf.set_xy(L + W - pw, top + 30)
    pdf.set_fill_color(*(GREEN if paid else RED))
    pdf.set_text_color(255, 255, 255)
    pdf.cell(pw, 6, pill, align="C", fill=True)

    # red rule
    y = top + 42
    pdf.set_draw_color(*RED)
    pdf.set_line_width(0.8)
    pdf.line(L, y, L + W, y)

    # --- Bill to / second column ---
    y += 7
    col = W / 2
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(*SLATE)
    pdf.set_xy(L, y)
    pdf.cell(col, 5, "BILL TO")
    pdf.set_xy(L + col, y)
    pdf.cell(col, 5, right_heading)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*NAVY)
    left_lines = [_latin1(t) for t in (user.name, user.email, user.phone)]
    right_lines = [_latin1(t) for t in right_lines]
    order_title = _latin1(order_title)
    yl = yr = y + 6
    for line in [t for t in left_lines if t]:
        pdf.set_xy(L, yl)
        pdf.multi_cell(col - 6, 5, line)
        yl = pdf.get_y()
    for line in [t for t in right_lines if t]:
        pdf.set_xy(L + col, yr)
        pdf.multi_cell(col, 5, line)
        yr = pdf.get_y()
    y = max(yl, yr) + 8

    # --- Order line ---
    pdf.set_xy(L, y)
    pdf.set_font("Helvetica", "B", 11)
    pdf.multi_cell(W, 6, order_title)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*SLATE)
    pdf.set_x(L)
    pdf.cell(W, 5, order_sub)
    y = pdf.get_y() + 9

    # --- Line items table ---
    pdf.set_xy(L, y)
    pdf.set_fill_color(*NAVY)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9.5)
    pdf.cell(W - 40, 9, "  Description", fill=True)
    pdf.cell(40, 9, "Amount (BSD)  ", align="R", fill=True, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_draw_color(226, 232, 240)
    pdf.set_line_width(0.3)
    for label, value, *extra in rows:
        details = extra[0] if extra else []
        pdf.set_text_color(*NAVY)
        if not details:
            pdf.cell(W - 40, 10, f"  {label}", border="B")
            pdf.cell(40, 10, f"{_money(value)}  ", border="B", align="R", new_x="LMARGIN", new_y="NEXT")
            continue
        # Line item with what it includes listed underneath.
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(W - 40, 9, f"  {label}")
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(40, 9, f"{_money(value)}  ", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(*SLATE)
        for d in details:
            pdf.set_x(L)
            pdf.cell(W - 40, 4.6, f"      \u00b7  {d}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2.5)
        pdf.line(L, pdf.get_y(), L + W, pdf.get_y())
        pdf.set_font("Helvetica", "", 10)

    pdf.set_fill_color(*LIGHT)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(W - 40, 12, "  Total due" if not paid else "  Total paid", fill=True)
    pdf.set_text_color(*RED)
    pdf.cell(40, 12, f"{_money(amount)}  ", align="R", fill=True, new_x="LMARGIN", new_y="NEXT")

    # --- Notes: the customer's own details from their request ---
    if notes:
        pdf.ln(6)
        pdf.set_x(L)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.set_text_color(*SLATE)
        pdf.cell(W, 5, "NOTES", new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(*NAVY)
        for label, value in notes:
            pdf.set_x(L)
            pdf.set_font("Helvetica", "B", 9)
            pdf.write(4.8, f"{_latin1(label)}: ")
            pdf.set_font("Helvetica", "", 9)
            pdf.write(4.8, _latin1(value))
            pdf.ln(5.2)
        y = pdf.get_y() + 6
    else:
        y = pdf.get_y() + 10

    # --- How to pay / paid box ---
    if check_fit and (y + 26 > pdf.h - 31 or pdf.page_no() > 1):
        raise _TooLong()
    pdf.set_xy(L, y)
    pdf.set_fill_color(*SAND)
    box_h = 26
    pdf.rect(L, y, W, box_h, style="F")
    pdf.set_xy(L + 6, y + 5)
    pdf.set_text_color(*NAVY)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(W - 12, 6, "Payment received. Thank you!" if paid else "How to pay")
    pdf.set_xy(L + 6, y + 12)
    pdf.set_font("Helvetica", "", 10)
    if paid:
        text = paid_text
    else:
        text = (f"{PAYMENT_NOTE} Please pay by {_date(due)} and use {number} as your payment reference. "
                f"{unpaid_closing}")
    pdf.multi_cell(W - 12, 5, text, align="L")

    # --- Footer (fixed at the bottom; no page break) ---
    pdf.set_auto_page_break(False)
    pdf.set_y(-30)
    pdf.set_draw_color(226, 232, 240)
    pdf.line(L, pdf.get_y(), L + W, pdf.get_y())
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*SLATE)
    pdf.multi_cell(W, 4.5, (
        f"Questions about this invoice? Email {CONTACT_EMAIL} and include your invoice number.\n"
        f"{footer_note}"
        "Amounts are in Bahamian dollars (BSD), pegged 1:1 to USD."
    ), align="C")
    return bytes(pdf.output())
