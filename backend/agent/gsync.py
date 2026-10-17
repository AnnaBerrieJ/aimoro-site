"""Mirror every request to Google Drive and the AIMORO Order Tracker sheet.

After any database commit that touches a request (new request, quote, approval, payment,
supplier order, warehouse photos, shipment status...), the request is synced in a
background thread:

  Drive:  AIMORO/Orders/<year>/REQ-0005 - <client> - <product>/
            REQ-0005 order form.pdf    (rewritten on every change)
            REQ-0005 options.pdf       (current options, full report)
            AIM-2026-0005 invoice.pdf  (rewritten when paid)
            Customer photo.jpg, Warehouse 12.jpg ...  (uploaded once)
  Sheet:  one row per request on the "Orders" tab, matched by Request ID in column A.
          Columns A to T are written; column U (Notes) is yours and never overwritten.

The database stays the source of truth. If Google is down or not configured, nothing
breaks: errors are logged and the next change syncs again. To backfill everything,
call POST /admin/gsync (admin only).

Setup (env vars): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
(get it once with scripts/google_auth.py), GDRIVE_ORDERS_FOLDER_ID, GSHEET_TRACKER_ID,
optional GSHEET_TRACKER_TAB (default "Orders").
"""
import json
import logging
import mimetypes
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import httpx
from sqlalchemy import event, select
from sqlalchemy.orm import Session

from .common import active_options, current_quote, upload_path
from .db import SessionLocal
from .models import ProductRequest, Quote, RequestEvent, Shipment, WarehousePhoto

log = logging.getLogger("aimoro.gsync")

DRIVE = "https://www.googleapis.com/drive/v3/files"
UPLOAD = "https://www.googleapis.com/upload/drive/v3/files"
SHEETS = "https://sheets.googleapis.com/v4/spreadsheets"
FOLDER_MIME = "application/vnd.google-apps.folder"
SKIP_KEY = "gsync_skip"      # set on the sync's own session so its commits don't re-trigger it
IDS_KEY = "gsync_ids"

HEADERS = ["Request ID", "Client", "Island", "Product", "Qty", "Status", "Created", "Quote total (BSD)",
           "Quote status", "Invoice no.", "Invoice status", "Supplier PO", "Ordered", "At warehouse",
           "Shipment", "Carrier", "Tracking no.", "ETA", "Delivered", "Drive folder"]


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def enabled() -> bool:
    return all(_env(k) for k in ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"))


def drive_enabled() -> bool:
    return enabled() and bool(_env("GDRIVE_ORDERS_FOLDER_ID"))


def sheet_enabled() -> bool:
    return enabled() and bool(_env("GSHEET_TRACKER_ID"))


# ---------------------------------------------------------------- Google API plumbing

_token_lock = threading.Lock()
_token = {"value": "", "expires": 0.0}


def _access_token(force: bool = False) -> str:
    with _token_lock:
        if force or time.time() > _token["expires"] - 60:
            r = httpx.post("https://oauth2.googleapis.com/token", data={
                "grant_type": "refresh_token",
                "client_id": _env("GOOGLE_CLIENT_ID"),
                "client_secret": _env("GOOGLE_CLIENT_SECRET"),
                "refresh_token": _env("GOOGLE_REFRESH_TOKEN"),
            }, timeout=30)
            r.raise_for_status()
            data = r.json()
            _token["value"] = data["access_token"]
            _token["expires"] = time.time() + int(data.get("expires_in", 3600))
        return _token["value"]


def _api(method: str, url: str, **kw) -> httpx.Response:
    extra_headers = kw.pop("headers", {})
    timeout = kw.pop("timeout", 120)
    for attempt in (1, 2):
        headers = {**extra_headers, "Authorization": f"Bearer {_access_token(force=attempt == 2)}"}
        r = httpx.request(method, url, headers=headers, timeout=timeout, **kw)
        if r.status_code != 401:
            break
    if r.status_code >= 400:
        raise RuntimeError(f"Google API {method} {url.split('?')[0]} -> {r.status_code}: {r.text[:300]}")
    return r


def _q(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def _list_children(parent: str) -> list[dict]:
    files, token = [], None
    while True:
        params = {"q": f"'{parent}' in parents and trashed = false", "pageSize": 200,
                  "fields": "nextPageToken, files(id, name, mimeType)"}
        if token:
            params["pageToken"] = token
        data = _api("GET", DRIVE, params=params).json()
        files += data.get("files", [])
        token = data.get("nextPageToken")
        if not token:
            return files


def _create_folder(name: str, parent: str) -> str:
    r = _api("POST", DRIVE, params={"fields": "id"},
             json={"name": name, "mimeType": FOLDER_MIME, "parents": [parent]})
    return r.json()["id"]


def _upload(name: str, content, mime: str, parent: str, file_id: str | None = None) -> str:
    """Resumable upload (works for any size; video files stream from disk).
    With file_id, replaces that file's content and keeps its link."""
    if file_id:
        start = _api("PATCH", f"{UPLOAD}/{file_id}", params={"uploadType": "resumable", "fields": "id"},
                     json={"name": name}, headers={"X-Upload-Content-Type": mime})
    else:
        start = _api("POST", UPLOAD, params={"uploadType": "resumable", "fields": "id"},
                     json={"name": name, "parents": [parent]}, headers={"X-Upload-Content-Type": mime})
    r = httpx.put(start.headers["Location"], content=content, headers={"Content-Type": mime}, timeout=600)
    if r.status_code >= 400:
        raise RuntimeError(f"Drive upload of {name} -> {r.status_code}: {r.text[:300]}")
    return r.json()["id"]


def _is_live_folder(folder_id: str) -> bool:
    try:
        meta = _api("GET", f"{DRIVE}/{folder_id}", params={"fields": "id, trashed"}).json()
        return not meta.get("trashed")
    except RuntimeError:
        return False


# ---------------------------------------------------------------- Drive

_year_folders: dict[int, str] = {}


def _year_folder(year: int) -> str:
    if year not in _year_folders:
        root = _env("GDRIVE_ORDERS_FOLDER_ID")
        found = [f for f in _list_children(root) if f["mimeType"] == FOLDER_MIME and f["name"] == str(year)]
        _year_folders[year] = found[0]["id"] if found else _create_folder(str(year), root)
    return _year_folders[year]


def ref(req: ProductRequest) -> str:
    return f"REQ-{req.id:04d}"


def folder_name(req: ProductRequest) -> str:
    client = (req.user.name or req.user.email).strip()
    return f"{ref(req)} \u2013 {client} \u2013 {req.product_name.strip()}"[:200]


def ensure_folder(db: Session, req: ProductRequest) -> str:
    if req.drive_folder_id and _is_live_folder(req.drive_folder_id):
        return req.drive_folder_id
    parent = _year_folder(req.created_at.year)
    # Reuse a folder made earlier (by hand or a previous run) that starts with the request ID.
    existing = [f for f in _list_children(parent)
                if f["mimeType"] == FOLDER_MIME and f["name"].startswith(ref(req))]
    req.drive_folder_id = existing[0]["id"] if existing else _create_folder(folder_name(req), parent)
    db.commit()
    return req.drive_folder_id


def folder_url(folder_id: str) -> str:
    return f"https://drive.google.com/drive/folders/{folder_id}"


def sync_drive(db: Session, req: ProductRequest) -> str:
    from .invoice_pdf import build_invoice_pdf
    from .options_pdf import build_options_pdf
    from .order_form_pdf import build_order_form_pdf

    folder = ensure_folder(db, req)
    have = {f["name"]: f["id"] for f in _list_children(folder)}

    def put_pdf(name: str, data: bytes):
        _upload(name, data, "application/pdf", folder, have.get(name))

    def put_file_once(name: str, stored: str):
        path = upload_path(stored)
        if name in have or not os.path.exists(path):
            return
        mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
        with open(path, "rb") as fh:
            _upload(name, fh, mime, folder)

    put_pdf(f"{ref(req)} order form.pdf", build_order_form_pdf(req))

    opts = active_options(req)
    if opts:
        put_pdf(f"{ref(req)} options.pdf", build_options_pdf(req, opts, preview=False))

    q = current_quote(req)
    if q is not None and q.invoice is not None:
        put_pdf(f"{q.invoice.number} invoice.pdf", build_invoice_pdf(q.invoice))

    if req.photo_path:
        put_file_once(f"Customer photo{os.path.splitext(req.photo_path)[1]}", req.photo_path)
    for p in req.warehouse_photos:
        put_file_once(f"Warehouse {p.id}{os.path.splitext(p.path)[1]}", p.path)
    return folder


# ---------------------------------------------------------------- Sheet

def _d(dt) -> str:
    return dt.strftime("%Y-%m-%d") if dt else ""


def tracker_row(req: ProductRequest) -> list:
    """Columns A to T of the tracker. Text that looks like a number or date gets a leading '."""
    q = current_quote(req)
    inv = q.invoice if q is not None else None
    ship = req.shipment
    sent = [x for x in req.quotes if x.status == "sent"]
    if q is None:
        quote_status = ""
    elif q.status == "approved":
        quote_status = "approved"
    else:
        quote_status = f"{len(sent)} options sent" if len(sent) > 1 else q.status
    folder = (f'=HYPERLINK("{folder_url(req.drive_folder_id)}","Open folder")'
              if req.drive_folder_id else "")

    def txt(v) -> str:
        return f"'{v}" if v else ""

    return [
        txt(ref(req)), req.user.name, req.user.island, req.product_name, req.quantity, req.status,
        _d(req.created_at), q.total_bsd if q is not None else "", quote_status,
        txt(inv.number if inv else ""), inv.status if inv else "",
        txt(req.supplier_order_no or ""), _d(req.ordered_at), _d(req.warehouse_arrived_at),
        txt(ship.reference if ship else ""), ship.carrier if ship else "",
        txt(ship.tracking_number if ship else ""), (ship.eta or "") if ship else "",
        _d(ship.delivered_at) if ship else "", folder,
    ]


def sync_sheet(req: ProductRequest) -> None:
    sheet, tab = _env("GSHEET_TRACKER_ID"), _env("GSHEET_TRACKER_TAB", "Orders")
    rng = f"'{tab}'!A:A"
    col_a = _api("GET", f"{SHEETS}/{sheet}/values/{rng}").json().get("values", [])
    row_no = next((i + 1 for i, v in enumerate(col_a) if v and v[0].strip() == ref(req)), None)
    body = {"values": [tracker_row(req)]}
    params = {"valueInputOption": "USER_ENTERED"}
    if row_no:
        _api("PUT", f"{SHEETS}/{sheet}/values/'{tab}'!A{row_no}:T{row_no}", params=params, json=body)
    else:
        _api("POST", f"{SHEETS}/{sheet}/values/'{tab}'!A:T:append",
             params={**params, "insertDataOption": "INSERT_ROWS"}, json=body)


# ---------------------------------------------------------------- Orchestration

def sync_request(db: Session, req: ProductRequest) -> None:
    if drive_enabled():
        sync_drive(db, req)
    if sheet_enabled():
        sync_sheet(req)


_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="gsync")  # one at a time: no duplicate rows


def _run(request_ids: set[int], shipment_ids: set[int]) -> None:
    db = SessionLocal()
    db.info[SKIP_KEY] = True
    try:
        ids = set(request_ids)
        if shipment_ids:
            ids |= set(db.scalars(select(ProductRequest.id).where(ProductRequest.shipment_id.in_(shipment_ids))))
        for rid in sorted(ids):
            req = db.get(ProductRequest, rid)
            if req is None:
                continue
            try:
                sync_request(db, req)
            except Exception:  # noqa: BLE001  never let Google break the site
                db.rollback()
                log.exception("Google sync failed for request %s", rid)
    finally:
        db.close()


def submit(request_ids, shipment_ids=()) -> None:
    if enabled() and (request_ids or shipment_ids):
        _executor.submit(_run, set(request_ids), set(shipment_ids))


def _after_flush(session: Session, _ctx) -> None:
    if session.info.get(SKIP_KEY) or not enabled():
        return
    ids = session.info.setdefault(IDS_KEY, {"req": set(), "ship": set()})
    for obj in list(session.new) + list(session.dirty):
        if isinstance(obj, ProductRequest):
            ids["req"].add(obj.id)
        elif isinstance(obj, (RequestEvent, WarehousePhoto, Quote)):
            ids["req"].add(obj.request_id)
        elif isinstance(obj, Shipment):
            ids["ship"].add(obj.id)


def _after_commit(session: Session) -> None:
    ids = session.info.pop(IDS_KEY, None)
    if ids:
        submit(ids["req"] - {None}, ids["ship"] - {None})


def _after_rollback(session: Session) -> None:
    session.info.pop(IDS_KEY, None)


def install() -> None:
    """Hook the sync into every session. Call once at startup."""
    if not event.contains(SessionLocal, "after_flush", _after_flush):
        event.listen(SessionLocal, "after_flush", _after_flush)
        event.listen(SessionLocal, "after_commit", _after_commit)
        event.listen(SessionLocal, "after_soft_rollback", lambda s, _t: _after_rollback(s))
    log.info("Google sync %s (drive=%s, sheet=%s)", "on" if enabled() else "off",
             drive_enabled(), sheet_enabled())
