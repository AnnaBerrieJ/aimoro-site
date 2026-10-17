"""Options PDF ("what you asked for vs what we found"), in the same style as the invoice.

Customer-safe: shows only the customer-facing title, photo, comparison rows, notes and BSD prices
of each option. Never supplier names, platforms, links, CNY prices, freight cost or margin.
"""
from fpdf import FPDF
from fpdf.fonts import FontFace
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .common import option_out, preview_title, report_fee_bsd, upload_path
from .invoice_pdf import (CONTACT_EMAIL, CONTACT_WHATSAPP, PAYMENT_METHODS, LIGHT, LOGO_PATH, NAVY, RED, SAND, SITE, SLATE, _date, _delivery_address,
                          _money)
from .models import ProductRequest, Quote

GREEN = (4, 120, 87)
AMBER = (180, 83, 9)
MATCH_STYLE = {"match": ("Match", GREEN), "close": ("Close", AMBER), "different": ("Different", RED)}
L = 18  # left margin (mm)


def _latin1(text: str) -> str:
    """Core PDF fonts are Latin-1 only; swap common typographic characters, drop the rest."""
    repl = {"’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-", "−": "-",
            "…": "...", "•": "-"}
    for a, b in repl.items():
        text = text.replace(a, b)
    return text.encode("latin-1", "replace").decode("latin-1").replace("?", "?")


class _Doc(FPDF):
    def __init__(self, request_id: int):
        super().__init__(format="Letter", unit="mm")
        self.request_id = request_id
        self.set_margins(L, 16, L)
        self.set_auto_page_break(auto=True, margin=24)
        self.alias_nb_pages()

    def footer(self):
        self.set_y(-18)
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.3)
        self.line(L, self.get_y(), self.w - L, self.get_y())
        self.ln(2.5)
        self.set_font("Helvetica", "", 8.5)
        self.set_text_color(*SLATE)
        self.cell(0, 4.5, _latin1(
            f"Questions? Email {CONTACT_EMAIL} or WhatsApp {CONTACT_WHATSAPP}."), align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 4.5, f"Page {self.page_no()} of {{nb}}", align="C")


def _ship_tbd(o) -> bool:
    """Shipping not priced yet (sent as 0): show "To be confirmed" instead of $0.00."""
    return not o.shipping_bsd


def _total_text(o) -> str:
    return _money(o.total_bsd) + (" + shipping" if _ship_tbd(o) else "")


def _locked_label(pdf: FPDF, cx: float, cy: float, text: str) -> None:
    """White pill over a blurred photo."""
    pdf.set_font("Helvetica", "B", 9)
    tw = pdf.get_string_width(text) + 10
    pdf.set_fill_color(255, 255, 255)
    pdf.set_draw_color(*RED)
    pdf.set_line_width(0.4)
    pdf.rect(cx - tw / 2, cy - 4.5, tw, 9, style="DF", round_corners=True, corner_radius=4.5)
    pdf.set_text_color(*NAVY)
    pdf.set_xy(cx - tw / 2, cy - 4.5)
    pdf.cell(tw, 9, text, align="C")


def _blurred_text(text: str) -> Image.Image:
    """Text rendered as an image and blurred, for details kept for the full report."""
    font = ImageFont.load_default(size=58)
    im = Image.new("RGBA", (1100, 100), (255, 255, 255, 0))
    ImageDraw.Draw(im).text((4, 18), text, fill=NAVY + (255,), font=font, stroke_width=3, stroke_fill=NAVY + (255,))
    return im.filter(ImageFilter.GaussianBlur(12))


def _blurred_word(text: str, colour) -> Image.Image:
    """A blurred match word (Match / Close / Different) for the preview."""
    font = ImageFont.load_default(size=58)
    im = Image.new("RGBA", (420, 100), (255, 255, 255, 0))
    ImageDraw.Draw(im).text((40, 18), text, fill=tuple(colour) + (255,), font=font, stroke_width=3,
                            stroke_fill=tuple(colour) + (255,))
    return im.filter(ImageFilter.GaussianBlur(12))


def _image_box(pdf: FPDF, path: str | None, x: float, y: float, w: float, h: float, label: str,
               fallback: str, blur: bool = False) -> None:
    """A labelled box with the image fitted inside (aspect kept), or fallback text."""
    pdf.set_xy(x, y)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(*SLATE)
    pdf.cell(w, 5, label.upper())
    top = y + 6
    pdf.set_fill_color(*LIGHT)
    pdf.rect(x, top, w, h, style="F")
    img = None
    if path:
        try:
            img = Image.open(upload_path(path))
            img = img.convert("RGB")
        except Exception:  # noqa: BLE001  missing or unreadable file -> show fallback
            img = None
    if img is not None:
        iw, ih = img.size
        scale = min((w - 4) / iw, (h - 4) / ih)
        dw, dh = iw * scale, ih * scale
        if blur:
            img = img.filter(ImageFilter.GaussianBlur(max(iw, ih) / 14))
        pdf.image(img, x=x + (w - dw) / 2, y=top + (h - dh) / 2, w=dw, h=dh)
        if blur:
            _locked_label(pdf, x + w / 2, top + h / 2, "Photo in the full report")
    else:
        pdf.set_xy(x + 5, top + h / 2 - 8)
        pdf.set_font("Helvetica", "", 9.5)
        pdf.set_text_color(*SLATE)
        pdf.multi_cell(w - 10, 4.8, _latin1(fallback), align="C")


def _header(pdf: FPDF, req: ProductRequest, opts: list[Quote], preview: bool = False) -> None:
    top = 16
    pdf.image(LOGO_PATH, x=L, y=top, h=40)
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(*SLATE)
    pdf.set_xy(L + 41, top + 12.5)
    pdf.cell(70, 5, SITE)
    pdf.set_xy(L + 41, top + 18)
    pdf.cell(70, 5, CONTACT_EMAIL)
    pdf.set_xy(L + 41, top + 23.5)
    pdf.cell(70, 5, f"WhatsApp {CONTACT_WHATSAPP}")

    W = pdf.w - 2 * L
    rx = L + W - 80
    pdf.set_xy(rx, top + 2)
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*RED)
    pdf.cell(80, 10, "YOUR OPTIONS" if len(opts) > 1 else "YOUR QUOTE", align="R")
    rows = [("Request no.", f"#{req.id}"), ("Date", _date(opts[0].created_at)),
            ("Valid until", _date(opts[0].expires_at))]
    if preview:
        rows.append(("Report", "Preview"))
    pdf.set_font("Helvetica", "", 9.5)
    for i, (k, v) in enumerate(rows):
        pdf.set_xy(rx, top + 13 + i * 5.2)
        pdf.set_text_color(*SLATE)
        pdf.cell(40, 5, k, align="R")
        pdf.set_text_color(*NAVY)
        pdf.cell(40, 5, v, align="R")
    y = top + 44
    pdf.set_draw_color(*RED)
    pdf.set_line_width(0.8)
    pdf.line(L, y, L + W, y)
    pdf.set_y(y + 6)


def _request_summary(pdf: FPDF, req: ProductRequest) -> None:
    W = pdf.w - pdf.l_margin - pdf.r_margin  # narrower when a photo sits on the right
    y = pdf.get_y()
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(*SLATE)
    pdf.cell(W, 5, "WHAT YOU ASKED FOR", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*NAVY)
    pdf.multi_cell(W, 6.5, _latin1(f"{req.product_name} × {req.quantity}"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    lines = []
    if req.description:
        lines.append(req.description.strip())
    if req.target_price_bsd is not None:
        lines.append(f"Budget: {_money(req.target_price_bsd)}")
    if req.user and req.user.name:
        lines.append(f"Prepared for: {req.user.name}")
    addr = ", ".join(_delivery_address(req, req.user))
    if addr:
        lines.append(f"Deliver to: {addr}")
    for line in lines:
        pdf.set_text_color(*NAVY if line is lines[0] and req.description else SLATE)
        pdf.multi_cell(W, 5, _latin1(line), align="L", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)


def _option(pdf: FPDF, req: ProductRequest, q: Quote, single: bool, photo_h: float = 62,
            preview: bool = False) -> None:
    W = pdf.w - 2 * L
    o = option_out(req, q)
    if len(o.specs) > 8:  # long comparisons: smaller photos so the option fits on one page
        photo_h = min(photo_h, 40 if (o.notes and not preview) else 46)

    # Title bar
    pdf.set_fill_color(*NAVY)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 11.5)
    label = "Our match" if single else f"Option {o.option_number}"
    title = preview_title(q) if preview else o.title
    head = f"  {label}" if preview and title == label else f"  {label}:  {title}"
    pdf.cell(W - 60, 10, _latin1(head)[:80], fill=True)
    pdf.cell(60, 10, f"{_total_text(o)}  ", align="R", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Side-by-side photos
    y = pdf.get_y()
    gap = 8
    bw = (W - gap) / 2
    bh = photo_h
    if y + bh + 6 > pdf.h - 24:
        pdf.add_page()
        y = pdf.get_y()
    _image_box(pdf, req.photo_path, L, y, bw, bh, "You asked for",
               req.description or req.product_name)
    _image_box(pdf, q.listing.photo_path if q.listing else None, L + bw + gap, y, bw, bh, "We found",
               "Photo not available", blur=preview)
    pdf.set_xy(L, y + bh + 10)

    # Comparison table
    if o.specs:
        pdf.set_font("Helvetica", "", 9.5)
        pdf.set_draw_color(226, 232, 240)
        pdf.set_line_width(0.3)
        head = FontFace(emphasis="BOLD", color=(255, 255, 255), fill_color=NAVY)
        with pdf.table(col_widths=(36, 58, 60, 26), line_height=5.2, headings_style=head,
                       borders_layout="HORIZONTAL_LINES", text_align=("LEFT", "LEFT", "LEFT", "CENTER"),
                       padding=1.4) as table:
            table.row(["Detail", "You asked for", "We found", "Match"])
            for i, s in enumerate(o.specs):
                word, colour = MATCH_STYLE.get(s.match, ("", NAVY))
                row = table.row()
                row.cell(_latin1(s.label), style=FontFace(emphasis="BOLD", color=NAVY))
                row.cell(_latin1(s.requested or "-"), style=FontFace(color=NAVY))
                if preview:  # what we found and how well it matches stay hidden until the report fee
                    row.cell(img=_blurred_text(_latin1(s.found or "-")), img_fill_width=True)
                    row.cell(img=_blurred_word("Match", SLATE), img_fill_width=True)  # same for every row: no hint
                else:
                    row.cell(_latin1(s.found or "-"), style=FontFace(color=NAVY))
                    row.cell(word, style=FontFace(emphasis="BOLD", color=colour))
        pdf.ln(4)

    # Notes (left) and price breakdown (right), side by side
    if pdf.get_y() + 32 > pdf.h - 24:
        pdf.add_page()
    y = pdf.get_y()
    price_w = 88
    bx = L + W - price_w
    if o.notes and not preview:
        pdf.set_xy(L, y)
        pdf.set_font("Helvetica", "B", 9.5)
        pdf.set_text_color(*NAVY)
        pdf.cell(W - price_w - 8, 5.5, "About this option" if preview else "Notes from AIMORO",
                 new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9.5)
        pdf.set_text_color(*SLATE)
        pdf.multi_cell(W - price_w - 8, 5, _latin1(o.notes), align="L", new_x="LMARGIN", new_y="NEXT")
    notes_bottom = pdf.get_y()
    pdf.set_y(y)
    pdf.set_draw_color(226, 232, 240)
    for label, amount in [("Product cost", o.product_cost_bsd), ("Shipping to your address", o.shipping_bsd),
                          ("Service fee", o.service_fee_bsd)]:
        pdf.set_x(bx)
        pdf.set_font("Helvetica", "", 9.5)
        pdf.set_text_color(*NAVY)
        pdf.cell(price_w - 30, 7, label, border="B")
        shown = "To be confirmed" if label.startswith("Shipping") and _ship_tbd(o) else _money(amount)
        pdf.cell(30, 7, shown, border="B", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(bx)
    pdf.set_fill_color(*LIGHT)
    pdf.set_font("Helvetica", "B", 10.5)
    pdf.cell(price_w - 30, 9, " Total before shipping" if _ship_tbd(o) else " Total (BSD)", fill=True)
    pdf.set_text_color(*RED)
    pdf.cell(30, 9, _money(o.total_bsd) + " ", align="R", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_y(max(pdf.get_y(), notes_bottom))


def _at_a_glance(pdf: FPDF, req: ProductRequest, opts: list[Quote], preview: bool = False) -> None:
    """Page-1 summary so the customer can compare the options against each other."""
    W = pdf.w - 2 * L
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(*SLATE)
    pdf.cell(W, 5, "YOUR OPTIONS AT A GLANCE", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)
    head = FontFace(emphasis="BOLD", color=(255, 255, 255), fill_color=NAVY)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_draw_color(226, 232, 240)
    with pdf.table(col_widths=(20, 66, 50, 44), line_height=7, headings_style=head,
                   borders_layout="HORIZONTAL_LINES", text_align=("LEFT", "LEFT", "LEFT", "RIGHT"),
                   padding=1.6) as table:
        table.row(["Option", "Product", "Matches your request", "Total (BSD)"])
        for q in opts:
            o = option_out(req, q)
            if preview:
                fit, colour = "In the full report", SLATE
            elif o.specs:
                n = sum(1 for sp in o.specs if sp.match == "match")
                close = sum(1 for sp in o.specs if sp.match == "close")
                fit = f"{n} of {len(o.specs)} match" + (f", {close} close" if close else "")
                colour = GREEN if n == len(o.specs) else AMBER if n else RED
            else:
                fit, colour = "-", SLATE
            row = table.row()
            row.cell(f"Option {o.option_number}", style=FontFace(emphasis="BOLD", color=NAVY))
            row.cell(_latin1(preview_title(q) if preview else o.title), style=FontFace(color=NAVY))
            row.cell(fit, style=FontFace(emphasis="BOLD", color=colour))
            row.cell(_total_text(o), style=FontFace(emphasis="BOLD", color=RED))
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(*SLATE)
    pdf.multi_cell(W, 5, _latin1(
        "This is a preview: it shows what you asked for and the price of each option. What we found, how well "
        f"it matches, the model names and photos are in the full report, which we send as soon as the "
        f"{_money(report_fee_bsd())} report fee is confirmed." if preview else
        "Each option is shown on its own page, with photos side by side and a detailed comparison."),
        align="L", new_x="LMARGIN", new_y="NEXT")
    message = (opts[0].message or "").strip()
    if message:
        pdf.ln(5)
        y = pdf.get_y()
        pdf.set_fill_color(*LIGHT)
        pdf.set_font("Helvetica", "", 10)
        lines = len(pdf.multi_cell(W - 12, 5.2, _latin1(message), align="L", dry_run=True, output="LINES"))
        h = 13 + lines * 5.2
        pdf.rect(L, y, W, h, style="F")
        pdf.set_fill_color(*RED)
        pdf.rect(L, y, 1.4, h, style="F")
        pdf.set_xy(L + 6, y + 4)
        pdf.set_font("Helvetica", "B", 9.5)
        pdf.set_text_color(*NAVY)
        pdf.cell(W - 12, 5, "A note from AIMORO", new_x="LMARGIN", new_y="NEXT")
        pdf.set_x(L + 6)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(W - 12, 5.2, _latin1(message), align="L", new_x="LMARGIN", new_y="NEXT")
        pdf.set_y(y + h)


def _photo_thumb(pdf: FPDF, path: str | None, x: float, y: float, w: float, h: float) -> bool:
    if not path:
        return False
    try:
        img = Image.open(upload_path(path)).convert("RGB")
    except Exception:  # noqa: BLE001
        return False
    iw, ih = img.size
    scale = min(w / iw, h / ih)
    pdf.image(img, x=x + w - iw * scale, y=y, w=iw * scale, h=ih * scale)
    return True


def _closing(pdf: FPDF, opts: list[Quote], single: bool, preview: bool = False) -> None:
    """Sand call-to-action box: on page 1 for several options, after the quote for one."""
    W = pdf.w - 2 * L
    if preview:
        fee = _money(report_fee_bsd())
        text = _latin1(
            f"To see the full report and choose your option, pay the {fee} report fee by {PAYMENT_METHODS}; we "
            f"send the payment details by WhatsApp. Reply by email or WhatsApp, or visit {SITE}, by "
            f"{_date(opts[0].expires_at)}. As soon as it's confirmed, we send your full report. Then you choose "
            f"your option and we send your invoice. The report fee is separate from the price of your order. "
            "Prices are in BSD (equal to US dollars)"
            + (" and shipping will be confirmed before you pay." if any(_ship_tbd(q) for q in opts) else
               " and include delivery to your door."))
        return _sand_box(pdf, W, "Ready for your full report?", text)
    text = _latin1(
        ("Choose your option" if not single else "Approve your quote") +
        f" at {SITE}, or reply by email or WhatsApp, by {_date(opts[0].expires_at)}. "
        + ("Once you confirm, we'll send your invoice and the full report. " if preview else
           "We'll send your invoice right away. ")
        + ("Prices are in BSD (equal to US dollars). Shipping will be confirmed before you pay. "
           if any(_ship_tbd(q) for q in opts) else
           "Prices are in BSD (equal to US dollars) and include delivery. ")
        + f"You can pay by {PAYMENT_METHODS}; we send the payment details by WhatsApp.")
    _sand_box(pdf, W, "Ready to order?" if not single else "Happy with it?", text)


def _sand_box(pdf: FPDF, W: float, heading: str, text: str) -> None:
    pdf.set_font("Helvetica", "", 9.5)
    lines = len(pdf.multi_cell(W - 12, 5, text, dry_run=True, output="LINES"))
    h = 14 + lines * 5
    if pdf.get_y() + 6 + h > pdf.h - 24:
        pdf.add_page()
    pdf.ln(6)
    y = pdf.get_y()
    pdf.set_fill_color(*SAND)
    pdf.rect(L, y, W, h, style="F")
    pdf.set_xy(L + 6, y + 4)
    pdf.set_font("Helvetica", "B", 10.5)
    pdf.set_text_color(*NAVY)
    pdf.cell(W - 12, 5.5, heading)
    pdf.set_xy(L + 6, y + 10)
    pdf.set_font("Helvetica", "", 9.5)
    pdf.multi_cell(W - 12, 5, text, align="L")
    pdf.set_y(y + h)


def build_options_pdf(req: ProductRequest, opts: list[Quote], preview: bool = False) -> bytes:
    """preview=True blurs the found photos and some details, for sharing before the customer confirms."""
    pdf = _Doc(req.id)
    pdf.add_page()
    _header(pdf, req, opts, preview)
    single = len(opts) == 1
    if single:
        _request_summary(pdf, req)
        _option(pdf, req, opts[0], single=True, photo_h=50, preview=preview)
        _closing(pdf, opts, single=True, preview=preview)
    else:
        top = pdf.get_y()
        has_thumb = _photo_thumb(pdf, req.photo_path, pdf.w - L - 45, top, 45, 38)
        if has_thumb:
            pdf.set_right_margin(L + 52)
        _request_summary(pdf, req)
        pdf.set_right_margin(L)
        pdf.set_y(max(pdf.get_y(), top + (42 if has_thumb else 0)))
        _at_a_glance(pdf, req, opts, preview)
        _closing(pdf, opts, single=False, preview=preview)
        for q in opts:
            pdf.add_page()
            _option(pdf, req, q, single=False, preview=preview)

    return bytes(pdf.output())
