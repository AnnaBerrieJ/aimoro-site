"""Google Drive / Sheets sync: the commit hook, the tracker row and the Drive upload plan.
No network: every Google call is replaced with a fake."""
from test_agent import client, signup  # noqa: F401  (also configures env + DB)
from test_operations import paid_request

import pytest

from agent import gsync
from agent.db import SessionLocal
from agent.models import ProductRequest
from agent.order_form_pdf import build_order_form_pdf


@pytest.fixture()
def google_on(monkeypatch):
    for k, v in {"GOOGLE_CLIENT_ID": "id", "GOOGLE_CLIENT_SECRET": "secret", "GOOGLE_REFRESH_TOKEN": "tok",
                 "GDRIVE_ORDERS_FOLDER_ID": "orders", "GSHEET_TRACKER_ID": "sheet"}.items():
        monkeypatch.setenv(k, v)
    submitted = []
    monkeypatch.setattr(gsync, "submit", lambda req_ids, ship_ids=(): submitted.append((set(req_ids), set(ship_ids))))
    return submitted


@pytest.fixture(scope="module")
def users():
    r = client.post("/auth/login", json={"email": "admin@aimoro.test", "password": "password123"})
    admin_h = ({"Authorization": f"Bearer {r.json()['token']}"} if r.status_code == 200
               else signup("admin@aimoro.test", "Ashley")[0])
    a_h, _ = signup("kim.gsync@example.com", "Kim Rolle")
    return {"admin": admin_h, "a": a_h}


def test_commit_hook_queues_changed_requests(google_on, users):
    rid = client.post("/requests", headers=users["a"], json={"product_name": "Rattan beach bag", "quantity": 2}).json()["id"]
    assert any(rid in reqs for reqs, _ in google_on)


def test_hook_is_silent_when_not_configured(monkeypatch, users):
    monkeypatch.delenv("GOOGLE_REFRESH_TOKEN", raising=False)
    called = []
    monkeypatch.setattr(gsync, "_executor", type("X", (), {"submit": lambda *a, **k: called.append(a)})())
    client.post("/requests", headers=users["a"], json={"product_name": "Sun hat"})
    assert called == []


def test_tracker_row_and_order_form(users):
    rid = paid_request(users, "a", "Rattan beach bag")
    client.post(f"/admin/requests/{rid}/order", headers=users["admin"], json={"supplier_order_no": "TB-1"})
    db = SessionLocal()
    try:
        req = db.get(ProductRequest, rid)
        row = gsync.tracker_row(req)
        assert len(row) == len(gsync.HEADERS) == 20
        assert row[0] == f"'REQ-{rid:04d}" and row[1] == "Kim Rolle" and row[5] == "ordered"
        assert row[8] == "approved" and row[10] == "paid" and row[11] == "'TB-1"
        pdf = build_order_form_pdf(req)
        assert pdf[:4] == b"%PDF" and b"CNY" not in pdf
    finally:
        db.close()


def test_sync_uploads_files_and_appends_sheet_row(google_on, monkeypatch, users):
    rid = paid_request(users, "a", "Phone stand")
    uploads, sheet_calls, created = [], [], []
    monkeypatch.setattr(gsync, "_year_folders", {})
    monkeypatch.setattr(gsync, "_list_children", lambda parent: [])
    monkeypatch.setattr(gsync, "_create_folder", lambda name, parent: created.append(name) or f"F{len(created)}")
    monkeypatch.setattr(gsync, "_upload", lambda name, content, mime, parent, file_id=None: uploads.append(name) or "x")

    class Resp:
        def __init__(self, data=None):
            self._d = data or {}

        def json(self):
            return self._d

    def fake_api(method, url, **kw):
        sheet_calls.append((method, url))
        return Resp({"values": [["Request ID"]]})

    monkeypatch.setattr(gsync, "_api", fake_api)
    db = SessionLocal()
    db.info[gsync.SKIP_KEY] = True
    try:
        req = db.get(ProductRequest, rid)
        req.drive_folder_id = None
        gsync.sync_request(db, req)
        assert created[0].isdigit()                       # year folder
        assert created[1].startswith(f"REQ-{rid:04d} ")    # request folder
        assert f"REQ-{rid:04d} order form.pdf" in uploads
        assert f"REQ-{rid:04d} options.pdf" in uploads
        assert any(u.endswith("invoice.pdf") for u in uploads)
        assert sheet_calls[-1][0] == "POST" and sheet_calls[-1][1].endswith(":append")
        assert db.get(ProductRequest, rid).drive_folder_id == "F2"
    finally:
        db.close()
