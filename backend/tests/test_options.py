"""Side-by-side options: listing photos/specs, 1-3 options per proposal, customer chooses one."""
import io

from PIL import Image

from test_agent import client, signup  # noqa: F401  (also configures env + DB)

import pytest


def png_bytes(color=(200, 150, 90)):
    buf = io.BytesIO()
    Image.new("RGB", (120, 90), color).save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture(scope="module")
def u():
    r = client.post("/auth/login", json={"email": "admin@aimoro.test", "password": "password123"})
    admin = ({"Authorization": f"Bearer {r.json()['token']}"} if r.status_code == 200
             else signup("admin@aimoro.test", "Ashley")[0])
    cust, _ = signup("opt-cust@example.com", "Dana Pinder")
    other, _ = signup("opt-other@example.com", "Other Person")
    return {"admin": admin, "cust": cust, "other": other}


SPECS = [
    {"label": "Colour", "requested": "Natural", "found": "Natural beige", "match": "match"},
    {"label": "Size", "requested": "About 40 cm", "found": "38 x 30 cm", "match": "close"},
]


def make_listing(u, rid, price, title, secret_title):
    r = client.post(f"/admin/requests/{rid}/listings", headers=u["admin"], json={
        "platform": "taobao", "url": "https://item.taobao.com/item.htm?id=999", "title": secret_title,
        "price_cny": price, "china_shipping_cny": 10, "notes": "seller is slow to reply",
        "public_title": title, "public_notes": "Lined inside with a zip pocket.", "specs": SPECS})
    assert r.status_code == 200, r.text
    lid = r.json()["id"]
    r = client.post(f"/admin/listings/{lid}/photo", headers=u["admin"],
                    files={"file": ("p.png", png_bytes(), "image/png")})
    assert r.status_code == 200 and r.json()["has_photo"] is True
    assert r.json()["specs"][1]["match"] == "close"
    assert client.get(f"/admin/listings/{lid}/photo", headers=u["admin"]).status_code == 200
    assert client.get(f"/admin/listings/{lid}/photo", headers=u["cust"]).status_code == 403
    return lid


def test_three_options_side_by_side(u):
    rid = client.post("/requests", headers=u["cust"], json={
        "product_name": "Rattan beach bag", "description": "Natural colour, about 40 cm", "quantity": 2,
        "delivery_address": "8 Shirley St, Nassau"}).json()["id"]
    client.post(f"/requests/{rid}/photo", headers=u["cust"], files={"file": ("me.png", png_bytes((90, 90, 200)), "image/png")})
    l1 = make_listing(u, rid, 100, "Natural rattan tote", "藤编包 秘密卖家")
    l2 = make_listing(u, rid, 140, "Premium woven bag", "高级草编包")
    l3 = make_listing(u, rid, 80, "Budget straw bag", "便宜草包")

    base = {"freight_cost_bsd": 30, "freight_markup_pct": 0.2, "insurance_bsd": 2}
    # validation
    assert client.post(f"/admin/requests/{rid}/proposal", headers=u["admin"],
                       json={"options": [{"listing_id": l1, **base}, {"listing_id": l1, **base}]}).status_code == 400
    assert client.post(f"/admin/requests/{rid}/proposal", headers=u["admin"],
                       json={"options": [{"listing_id": x, **base} for x in (l1, l2, l3, l1)]}).status_code == 422

    prev = client.post(f"/admin/requests/{rid}/proposal/preview", headers=u["admin"],
                       json={"options": [{"listing_id": x, **base} for x in (l1, l2, l3)]})
    assert [p["listing_id"] for p in prev.json()] == [l1, l2, l3]

    r = client.post(f"/admin/requests/{rid}/proposal", headers=u["admin"],
                    json={"options": [{"listing_id": x, **base} for x in (l1, l2, l3)], "message": "Three good finds"})
    assert r.status_code == 200, r.text
    quotes = r.json()
    assert [q["option_number"] for q in quotes] == [1, 2, 3]

    # preview: before the report fee, what we found, match status, notes and photos are withheld
    r = client.get(f"/requests/{rid}", headers=u["cust"])
    body = r.json()
    assert body["status"] == "quote_ready" and body["report_unlocked"] is False and body["report_fee_bsd"] == 100
    locked = body["options"]
    assert [o["title"] for o in locked] == ["Option 1", "Option 2", "Option 3"]
    assert all(o["locked"] and not o["has_photo"] and o["notes"] == "" for o in locked)
    assert all(sp["found"] == "" and sp["requested"] for sp in locked[0]["specs"])
    raw = r.text
    for secret in ["Natural rattan tote", "Premium woven bag", "Lined inside"] + [sp["found"] for sp in SPECS if sp["found"]]:
        assert secret not in raw, f"preview leaks {secret}"
    assert client.get(f"/requests/{rid}/options/{locked[0]['id']}/photo", headers=u["cust"]).status_code == 404
    pv = client.get(f"/requests/{rid}/options.pdf", headers=u["cust"])
    assert pv.status_code == 200 and "preview" in pv.headers["content-disposition"]  # forced preview
    assert client.post(f"/requests/{rid}/approve?quote_id={locked[1]['id']}", headers=u["cust"]).status_code == 400
    notes = client.get(f"/admin/requests/{rid}", headers=u["admin"]).json()["notifications"]
    assert any(n["subject"].startswith("Your preview report is ready") for n in notes)

    # report fee confirmed -> full report
    r = client.post(f"/admin/requests/{rid}/report-fee?reference=PayPal%20123", headers=u["admin"])
    assert r.status_code == 200 and r.json()["report_fee_ref"] == "PayPal 123"
    assert any(n["subject"].startswith("Your full report is ready") and n["attachments"] == ["options_full"]
               for n in r.json()["notifications"])
    r = client.get(f"/requests/{rid}", headers=u["cust"])
    body = r.json()
    assert body["report_unlocked"] is True
    opts = body["options"]
    assert [o["title"] for o in opts] == ["Natural rattan tote", "Premium woven bag", "Budget straw bag"]
    assert opts[0]["specs"][0] == SPECS[0] and opts[0]["has_photo"] is True
    assert opts[0]["notes"] == "Lined inside with a zip pocket."
    raw = r.text.lower()
    for secret in ["taobao", "item.taobao", "秘密", "藤编", "price_cny", "slow to reply", "margin", "listing_id"]:
        assert secret not in raw, f"customer response leaks {secret}"

    # photos: owner yes, other customer no
    qid2 = opts[1]["id"]
    assert client.get(f"/requests/{rid}/options/{qid2}/photo", headers=u["cust"]).status_code == 200
    assert client.get(f"/requests/{rid}/options/{qid2}/photo", headers=u["other"]).status_code == 404

    # PDF
    r = client.get(f"/requests/{rid}/options.pdf", headers=u["cust"])
    assert r.status_code == 200 and r.content[:4] == b"%PDF"
    assert client.get(f"/requests/{rid}/options.pdf", headers=u["other"]).status_code == 404
    pv = client.get(f"/requests/{rid}/options.pdf?preview=true", headers=u["cust"])
    assert pv.status_code == 200 and pv.content[:4] == b"%PDF"
    assert "preview" in pv.headers["content-disposition"]

    # must choose when there are several
    assert client.post(f"/requests/{rid}/approve", headers=u["cust"]).status_code == 400
    r = client.post(f"/requests/{rid}/approve?quote_id={qid2}", headers=u["cust"])
    assert r.status_code == 200, r.text
    b = r.json()
    assert [o["id"] for o in b["options"]] == [qid2] and b["options"][0]["status"] == "approved"
    assert b["invoice"]["amount_bsd"] == opts[1]["total_bsd"]
    assert b["timeline"][-1]["message"].startswith("You chose option 2.")
    # the other options are gone; their photos are no longer visible to the customer
    assert client.get(f"/requests/{rid}/options/{opts[0]['id']}/photo", headers=u["cust"]).status_code == 404
    # single-option PDF after approval still works
    assert client.get(f"/requests/{rid}/options.pdf", headers=u["cust"]).content[:4] == b"%PDF"


def test_single_quote_still_works(u):
    rid = client.post("/requests", headers=u["cust"], json={"product_name": "Desk lamp"}).json()["id"]
    lid = client.post(f"/admin/requests/{rid}/listings", headers=u["admin"],
                      json={"platform": "1688", "price_cny": 50}).json()["id"]
    client.post(f"/admin/requests/{rid}/quote", headers=u["admin"], json={"listing_id": lid})
    client.post(f"/admin/requests/{rid}/report-fee", headers=u["admin"])
    b = client.get(f"/requests/{rid}", headers=u["cust"]).json()
    assert len(b["options"]) == 1 and b["options"][0]["title"] == "Desk lamp"  # falls back to their wording
    assert b["options"][0]["has_photo"] is False
    assert client.post(f"/requests/{rid}/approve", headers=u["cust"]).status_code == 200
