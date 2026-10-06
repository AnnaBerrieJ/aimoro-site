import os
import sys
import tempfile

import pytest

TMP = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(TMP, "test.db")
os.environ["UPLOAD_DIR"] = os.path.join(TMP, "uploads")
os.environ["ADMIN_EMAILS"] = "admin@aimoro.test"
os.environ["DEFAULT_CNY_USD"] = "0.14"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402

import agent.fx as fx  # noqa: E402
fx.get_cny_usd = lambda: {"rate": 0.14, "source": "test"}
import agent.routers.admin as admin_router  # noqa: E402
admin_router.get_cny_usd = fx.get_cny_usd

from agent.pricing import QuoteInputs, calculate_quote  # noqa: E402
from main import app  # noqa: E402

client = TestClient(app)


def signup(email, name="Test"):
    r = client.post("/auth/signup", json={"email": email, "password": "password123", "name": name,
                                          "phone": "+1 242 555 0100", "island": "New Providence",
                                          "address": "1 Bay St, Nassau"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}, r.json()["user"]


@pytest.fixture(scope="module")
def users():
    admin_h, admin = signup("admin@aimoro.test", "Ashley")
    cust_h, cust = signup("kim@example.com", "Kim")
    other_h, _ = signup("other@example.com", "Other")
    assert admin["role"] == "admin" and cust["role"] == "customer"
    return {"admin": admin_h, "cust": cust_h, "other": other_h}


# ---------- pricing ----------

def test_quote_formula():
    b = calculate_quote(QuoteInputs(price_cny=100, quantity=2, china_shipping_cny=20, fx_cny_usd=0.14,
                                    freight_cost_bsd=30, freight_markup_pct=0.2, insurance_bsd=2,
                                    service_fee_pct=0.12, service_fee_min_bsd=15))
    assert b.product_cost_bsd == 30.80          # (200 + 20) * 0.14
    assert b.shipping_bsd == 38.00              # 30 + 6 markup + 2
    assert b.service_fee_bsd == 15.00           # 12% = 3.70 -> $15 minimum
    assert b.total_bsd == 83.80
    assert b.margin_bsd == 21.00                # 15 fee + 6 freight markup
    assert set(b.as_dict()) == {"product_cost_bsd", "shipping_bsd", "service_fee_bsd", "total_bsd", "margin_bsd"}


def test_percentage_service_fee_above_minimum():
    b = calculate_quote(QuoteInputs(price_cny=1000, quantity=1, china_shipping_cny=0, fx_cny_usd=0.14))
    assert b.service_fee_bsd == 16.80           # 12% of 140.00


def test_quote_rejects_bad_inputs():
    with pytest.raises(ValueError):
        calculate_quote(QuoteInputs(price_cny=1, quantity=0, china_shipping_cny=0, fx_cny_usd=0.14))


# ---------- full flow ----------

def test_full_flow_and_privacy(users):
    # customer submits
    r = client.post("/requests", headers=users["cust"], json={
        "product_name": "Rattan beach bag", "description": "Natural colour, 40cm",
        "reference_url": "https://example.com/bag", "quantity": 2, "target_price_bsd": 60,
        "delivery_address": "12 Queen St, Governor's Harbour, Eleuthera"})
    assert r.status_code == 200, r.text
    rid = r.json()["id"]
    assert r.json()["status"] == "received"
    assert r.json()["delivery_address"] == "12 Queen St, Governor's Harbour, Eleuthera"

    # photo upload
    r = client.post(f"/requests/{rid}/photo", headers=users["cust"],
                    files={"file": ("bag.png", b"\x89PNG\r\n\x1a\nfake", "image/png")})
    assert r.status_code == 200 and r.json()["has_photo"] is True
    assert client.get(f"/requests/{rid}/photo", headers=users["other"]).status_code == 404

    # other customers and anonymous users can't see it; customers can't use admin
    assert client.get(f"/requests/{rid}", headers=users["other"]).status_code == 404
    assert client.get("/requests").status_code == 401
    assert client.get("/admin/requests", headers=users["cust"]).status_code == 403

    # admin sources
    r = client.post(f"/admin/requests/{rid}/listings", headers=users["admin"], json={
        "platform": "taobao", "url": "https://item.taobao.com/item.htm?id=1", "title": "藤编包",
        "price_cny": 100, "china_shipping_cny": 20, "seller_rating": 4.8})
    assert r.status_code == 200, r.text
    lid = r.json()["id"]
    client.post(f"/admin/requests/{rid}/listings", headers=users["admin"], json={
        "platform": "aliexpress", "price_cny": 180})
    assert client.get(f"/requests/{rid}", headers=users["cust"]).json()["status"] == "sourcing"

    quote_body = {"listing_id": lid, "freight_cost_bsd": 30, "freight_markup_pct": 0.2,
                  "insurance_bsd": 2, "message": "Ships by air, ~8 days"}
    r = client.post(f"/admin/requests/{rid}/quote/preview", headers=users["admin"], json=quote_body)
    assert r.json()["total_bsd"] == 83.80
    r = client.post(f"/admin/requests/{rid}/quote", headers=users["admin"], json=quote_body)
    assert r.status_code == 200, r.text
    assert r.json()["margin_bsd"] == 21.00

    # customer view: quote visible, sourcing details never
    r = client.get(f"/requests/{rid}", headers=users["cust"])
    body = r.json()
    assert body["status"] == "quote_ready"
    assert body["quote"]["total_bsd"] == 83.80
    raw = r.text.lower()
    for secret in ["taobao", "aliexpress", "margin", "fx_cny", "price_cny", "listing", "freight_cost",
                   "admin_notes", "item.taobao"]:
        assert secret not in raw, f"customer response leaks {secret}"

    # admin sees listings and margin
    r = client.get(f"/admin/requests/{rid}", headers=users["admin"])
    assert len(r.json()["listings"]) == 2 and r.json()["quotes"][0]["margin_bsd"] == 21.00

    # only the owner can approve
    assert client.post(f"/requests/{rid}/approve", headers=users["other"]).status_code == 404
    r = client.post(f"/requests/{rid}/approve", headers=users["cust"])
    assert r.status_code == 200, r.text
    inv = r.json()["invoice"]
    assert inv["number"].startswith("AIM-") and inv["amount_bsd"] == 83.80 and inv["status"] == "sent"

    # can't re-quote after approval
    assert client.post(f"/admin/requests/{rid}/quote", headers=users["admin"], json=quote_body).status_code == 400

    # no customs or estimate wording anywhere the customer sees
    r = client.get(f"/requests/{rid}", headers=users["cust"])
    assert r.json()["quote"]["total_bsd"] == 83.80
    for word in ["customs", "duty", "vat", "estimate"]:
        assert word not in r.text.lower(), word

    # PDF
    r = client.get(f"/invoices/{inv['id']}/pdf", headers=users["cust"])
    assert r.status_code == 200 and r.content[:4] == b"%PDF"
    assert client.get(f"/invoices/{inv['id']}/pdf", headers=users["other"]).status_code == 404

    # no Stripe configured -> bank transfer; admin marks paid
    assert client.post(f"/invoices/{inv['id']}/checkout", headers=users["cust"]).status_code == 400
    assert client.get("/payments/config").json()["stripe_enabled"] is False
    r = client.post(f"/admin/invoices/{inv['id']}/mark-paid?reference=RBC-123", headers=users["admin"])
    assert r.json()["status"] == "paid"
    r = client.get(f"/requests/{rid}", headers=users["cust"])
    assert r.json()["status"] == "paid" and r.json()["invoice"]["status"] == "paid"

    # shipping update
    r = client.patch(f"/admin/requests/{rid}", headers=users["admin"],
                     json={"status": "shipped", "tracking_number": "DHL123"})
    assert r.json()["status"] == "shipped"
    assert client.get(f"/requests/{rid}", headers=users["cust"]).json()["tracking_number"] == "DHL123"
    assert client.post(f"/requests/{rid}/cancel", headers=users["cust"]).status_code == 400


def test_requote_supersedes_old_quote(users):
    rid = client.post("/requests", headers=users["cust"], json={"product_name": "Phone case"}).json()["id"]
    lid = client.post(f"/admin/requests/{rid}/listings", headers=users["admin"],
                      json={"platform": "pinduoduo", "price_cny": 15}).json()["id"]
    client.post(f"/admin/requests/{rid}/quote", headers=users["admin"], json={"listing_id": lid})
    client.post(f"/admin/requests/{rid}/quote", headers=users["admin"],
                json={"listing_id": lid, "freight_cost_bsd": 10})
    data = client.get(f"/admin/requests/{rid}", headers=users["admin"]).json()
    assert [q["status"] for q in data["quotes"]] == ["sent", "superseded"]
    assert client.get(f"/requests/{rid}", headers=users["cust"]).json()["quote"]["shipping_bsd"] == 10


def test_listing_from_other_request_rejected(users):
    a = client.post("/requests", headers=users["cust"], json={"product_name": "Item A"}).json()["id"]
    b = client.post("/requests", headers=users["cust"], json={"product_name": "Item B"}).json()["id"]
    lid = client.post(f"/admin/requests/{a}/listings", headers=users["admin"],
                      json={"platform": "1688", "price_cny": 5}).json()["id"]
    r = client.post(f"/admin/requests/{b}/quote", headers=users["admin"], json={"listing_id": lid})
    assert r.status_code == 400


def test_delivery_address_defaults_to_profile(users):
    r = client.post("/requests", headers=users["cust"], json={"product_name": "Desk lamp"})
    assert r.json()["delivery_address"] == "1 Bay St, Nassau"


def test_delivery_address_required(users):
    r = client.post("/auth/signup", json={"email": "noaddr@example.com", "password": "password123", "name": "N"})
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    assert client.post("/requests", headers=h, json={"product_name": "Desk lamp"}).status_code == 400


def test_auth_errors(users):
    assert client.post("/auth/signup", json={"email": "kim@example.com", "password": "password123",
                                             "name": "Dup"}).status_code == 409
    assert client.post("/auth/login", json={"email": "kim@example.com", "password": "wrong"}).status_code == 401
    assert client.post("/auth/login", json={"email": "KIM@example.com ", "password": "password123"}).status_code == 200
    assert client.get("/auth/me", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_old_endpoints_still_work():
    assert client.get("/").status_code == 200
    assert client.get("/suppliers").status_code == 200
