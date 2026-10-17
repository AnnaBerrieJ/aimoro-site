"""Email review: automatic customer emails become editable drafts; templates are filled per request."""
from test_agent import client, signup  # noqa: F401
import pytest

from test_options import make_listing


@pytest.fixture(scope="module")
def u():
    r = client.post("/auth/login", json={"email": "admin@aimoro.test", "password": "password123"})
    admin = ({"Authorization": f"Bearer {r.json()['token']}"} if r.status_code == 200
             else signup("admin@aimoro.test", "Ashley")[0])
    cust, _ = signup("email-cust@example.com", "Dana Pinder")
    return {"admin": admin, "cust": cust}


def test_email_review_flow(u, monkeypatch):
    monkeypatch.setenv("EMAIL_REVIEW", "on")
    rid = client.post("/requests", headers=u["cust"], json={
        "product_name": "Baggage scanner", "description": "Tunnel 24 x 16 in", "quantity": 1,
        "delivery_address": "Miami, Florida"}).json()["id"]
    # admin can add the "what they asked for" photo when the customer didn't upload one
    from test_options import png_bytes
    r = client.post(f"/requests/{rid}/photo", headers=u["admin"], files={"file": ("ref.png", png_bytes(), "image/png")})
    assert r.status_code == 200 and r.json()["has_photo"] is True
    l1 = make_listing(u, rid, 100, "Scanner A", "秘密 A")
    l2 = make_listing(u, rid, 140, "Scanner B", "秘密 B")
    base = {"freight_cost_bsd": 0, "freight_markup_pct": 0, "insurance_bsd": 0}
    r = client.post(f"/admin/requests/{rid}/proposal", headers=u["admin"],
                    json={"options": [{"listing_id": l, **base} for l in (l1, l2)]})
    assert r.status_code == 200, r.text

    view = client.get(f"/admin/requests/{rid}", headers=u["admin"]).json()
    drafts = [n for n in view["notifications"] if n["status"] == "draft"]
    assert len(drafts) == 1 and drafts[0]["subject"].startswith("Your options are ready")
    assert any(d["id"] == drafts[0]["id"] for d in client.get("/admin/email-drafts", headers=u["admin"]).json())

    # templates are filled with this request's options, never the secret listing titles
    t = {x["key"]: x for x in client.get(f"/admin/requests/{rid}/email-templates", headers=u["admin"]).json()}
    assert {"options_preview", "options_full", "quote", "custom"} <= set(t)
    pv = t["options_preview"]
    assert "Phase 1" in pv["subject"] and "Scanner A" in pv["body"] and "Scanner B" in pv["body"]
    assert "+ shipping" in pv["body"] and "Dana" in pv["body"] and "秘密" not in pv["body"]
    assert pv["attachments"] == ["options_preview"]

    # edit the automatic draft, attach the preview PDF, send it (email not configured -> skipped)
    d = drafts[0]["id"]
    r = client.patch(f"/admin/notifications/{d}", headers=u["admin"],
                     json={"subject": pv["subject"], "body": pv["body"], "attachments": ["options_preview"]})
    assert r.status_code == 200 and r.json()["attachments"] == ["options_preview"]
    assert client.patch(f"/admin/notifications/{d}", headers=u["admin"], json={"attachments": ["invoice"]}).status_code == 400
    assert client.post(f"/admin/notifications/{d}/send", headers=u["admin"]).status_code == 200
    sent = next(n for n in client.get(f"/admin/requests/{rid}", headers=u["admin"]).json()["notifications"] if n["id"] == d)
    assert sent["status"] == "skipped" and sent["subject"].startswith("Your AIMORO sourcing options")
    assert client.post(f"/admin/notifications/{d}/send", headers=u["admin"]).status_code == 400

    # compose a new email from a template, save as draft, then discard it
    r = client.post(f"/admin/requests/{rid}/emails", headers=u["admin"],
                    json={"subject": "Hello", "body": "Hi **Dana**\n\n* one\n* two", "attachments": ["options_full"]})
    assert r.status_code == 200 and r.json()["status"] == "draft"
    assert client.post(f"/admin/notifications/{r.json()['id']}/discard", headers=u["admin"]).json()["status"] == "discarded"

    html = client.post("/admin/emails/preview", headers=u["admin"], json={"body": "Hi **Dana**\n\n* one"}).json()["html"]
    assert "<strong>Dana</strong>" in html and "<li" in html and "email-logo.png" in html

    # customers cannot use these endpoints
    assert client.get(f"/admin/requests/{rid}/email-templates", headers=u["cust"]).status_code == 403


def test_welcome_email_on_signup():
    from agent.db import SessionLocal
    from agent.models import Notification
    _, user = signup("welcome-me@example.com", "Rhonda Knowles")
    db = SessionLocal()
    try:
        n = db.query(Notification).filter(Notification.user_id == user["id"]).one()
        assert n.subject == "Welcome to AIMORO" and "Hello Rhonda" in n.body and "/my-requests/new" in n.body
        assert n.status == "skipped"  # sent straight away (email not configured in tests), never held as a draft
    finally:
        db.close()


def test_fee_waiver_and_warehouse_photos(u, monkeypatch):
    from test_options import png_bytes
    monkeypatch.setenv("EMAIL_REVIEW", "on")
    rid = client.post("/requests", headers=u["cust"], json={"product_name": "Rattan chair", "quantity": 1,
                                                          "delivery_address": "Nassau"}).json()["id"]
    l1 = make_listing(u, rid, 100, "Chair A", "椅子")
    base = {"freight_cost_bsd": 10, "freight_markup_pct": 0, "insurance_bsd": 0}
    client.post(f"/admin/requests/{rid}/proposal", headers=u["admin"], json={"options": [{"listing_id": l1, **base}]})

    # waiver off by default -> template asks for the fee; on -> "waived"
    t = {x["key"]: x for x in client.get(f"/admin/requests/{rid}/email-templates", headers=u["admin"]).json()}
    assert "Sourcing fee**" in t["options_preview"]["body"] and "waived" not in t["options_preview"]["body"]
    r = client.patch(f"/admin/requests/{rid}", headers=u["admin"], json={"fee_waived": True})
    assert r.status_code == 200 and r.json()["fee_waived"] is True
    t = {x["key"]: x for x in client.get(f"/admin/requests/{rid}/email-templates", headers=u["admin"]).json()}
    assert "Sourcing fee waived" in t["options_preview"]["body"]

    # warehouse photos only after payment
    img = {"files": ("w.png", png_bytes(), "image/png")}
    assert client.post(f"/admin/requests/{rid}/warehouse-photos", headers=u["admin"], files=img).status_code == 400
    client.post(f"/requests/{rid}/approve", headers=u["cust"])
    inv = client.get(f"/requests/{rid}", headers=u["cust"]).json()["invoice"]
    client.post(f"/admin/invoices/{inv['id']}/mark-paid?reference=test", headers=u["admin"])
    r = client.post(f"/admin/requests/{rid}/warehouse-photos", headers=u["admin"],
                    files=[("files", ("a.png", png_bytes(), "image/png")), ("files", ("b.png", png_bytes((10, 10, 10)), "image/png"))],
                    data={"caption": "Front and back"})
    assert r.status_code == 200, r.text
    cust_view = client.get(f"/requests/{rid}", headers=u["cust"]).json()
    photos = cust_view["warehouse_photos"]
    assert len(photos) == 2 and photos[0]["caption"] == "Front and back"
    assert any("China warehouse" in e["message"] for e in cust_view["timeline"])
    assert client.get(f"/requests/{rid}/warehouse-photos/{photos[0]['id']}", headers=u["cust"]).status_code == 200
    t = {x["key"] for x in client.get(f"/admin/requests/{rid}/email-templates", headers=u["admin"]).json()}
    assert "warehouse" in t
    # videos too (stored and streamed back as-is)
    r = client.post(f"/admin/requests/{rid}/warehouse-photos", headers=u["admin"],
                    files=[("files", ("check.mp4", b"\x00\x00\x00\x18ftypmp42" + b"0" * 2048, "video/mp4"))])
    assert r.status_code == 200, r.text
    media = client.get(f"/requests/{rid}", headers=u["cust"]).json()["warehouse_photos"]
    vid = [m for m in media if m["media_type"] == "video"]
    assert len(vid) == 1 and all(m["media_type"] == "image" for m in media if m is not vid[0])
    got = client.get(f"/requests/{rid}/warehouse-photos/{vid[0]['id']}", headers=u["cust"])
    assert got.status_code == 200 and got.headers["content-type"].startswith("video/mp4")
    assert client.post(f"/admin/requests/{rid}/warehouse-photos", headers=u["admin"],
                       files=[("files", ("x.txt", b"hi", "text/plain"))]).status_code == 400
    r = client.delete(f"/admin/warehouse-photos/{photos[0]['id']}", headers=u["admin"])
    assert r.status_code == 200 and len(r.json()["warehouse_photos"]) == 2
