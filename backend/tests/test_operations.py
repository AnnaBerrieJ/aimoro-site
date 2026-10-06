"""Phase 2: supplier orders, warehouse, consolidated shipments (ending at delivery),
timeline and notifications. Shares the app/DB set up in test_agent.py."""
from test_agent import client, signup  # noqa: F401  (also configures env + DB)

import pytest

QUOTE = {"freight_cost_bsd": 30, "freight_markup_pct": 0.2, "insurance_bsd": 2}


@pytest.fixture(scope="module")
def ops_users():
    # admin@aimoro.test may already exist from test_agent; log in instead
    r = client.post("/auth/login", json={"email": "admin@aimoro.test", "password": "password123"})
    admin_h = ({"Authorization": f"Bearer {r.json()['token']}"} if r.status_code == 200
               else signup("admin@aimoro.test", "Ashley")[0])
    a_h, _ = signup("tanya@example.com", "Tanya Smith")
    b_h, _ = signup("marco@example.com", "Marco Knowles")
    return {"admin": admin_h, "a": a_h, "b": b_h}


def paid_request(users, who, name):
    rid = client.post("/requests", headers=users[who], json={"product_name": name, "quantity": 2}).json()["id"]
    lid = client.post(f"/admin/requests/{rid}/listings", headers=users["admin"],
                      json={"platform": "taobao", "price_cny": 100, "china_shipping_cny": 20,
                            "url": "https://item.taobao.com/x"}).json()["id"]
    client.post(f"/admin/requests/{rid}/quote", headers=users["admin"], json={"listing_id": lid, **QUOTE})
    inv = client.post(f"/requests/{rid}/approve", headers=users[who]).json()["invoice"]
    client.post(f"/admin/invoices/{inv['id']}/mark-paid?reference=RBC-1", headers=users["admin"])
    return rid


def test_order_to_delivery_with_consolidation(ops_users):
    u = ops_users
    r1 = paid_request(u, "a", "Beach umbrella")
    r2 = paid_request(u, "b", "Phone stand")

    # can't ship before ordering
    ship = client.post("/admin/shipments", headers=u["admin"], json={"method": "air", "carrier": "DHL"}).json()
    assert ship["reference"].startswith("SHP-") and ship["status"] == "preparing"
    sid = ship["id"]
    assert client.post(f"/admin/shipments/{sid}/requests/{r1}", headers=u["admin"]).status_code == 400

    # supplier order + warehouse
    r = client.post(f"/admin/requests/{r1}/order", headers=u["admin"], json={"supplier_order_no": "TB-998877"})
    assert r.status_code == 200 and r.json()["status"] == "ordered" and r.json()["supplier_order_no"] == "TB-998877"
    assert client.post(f"/admin/requests/{r1}/order", headers=u["admin"],
                       json={"supplier_order_no": "again"}).status_code == 400
    client.post(f"/admin/requests/{r2}/order", headers=u["admin"], json={"supplier_order_no": "PDD-1"})
    r = client.post(f"/admin/requests/{r1}/warehouse", headers=u["admin"], json={"notes": "Colour correct, no damage"})
    assert r.json()["warehouse_arrived_at"] is not None

    ready = {x["id"] for x in client.get("/admin/ready-to-ship", headers=u["admin"]).json()}
    assert {r1, r2} <= ready

    # consolidate two customers' orders into one shipment
    client.post(f"/admin/shipments/{sid}/requests/{r1}", headers=u["admin"])
    r = client.post(f"/admin/shipments/{sid}/requests/{r2}", headers=u["admin"])
    assert {x["id"] for x in r.json()["requests"]} == {r1, r2}
    assert r1 not in {x["id"] for x in client.get("/admin/ready-to-ship", headers=u["admin"]).json()}
    other = client.post("/admin/shipments", headers=u["admin"], json={"method": "sea"}).json()["id"]
    assert client.post(f"/admin/shipments/{other}/requests/{r1}", headers=u["admin"]).status_code == 400

    client.patch(f"/admin/shipments/{sid}", headers=u["admin"], json={
        "method": "air", "carrier": "DHL", "tracking_number": "1234567890", "weight_kg": 6.5,
        "freight_cost_bsd": 85, "eta": "2026-10-20", "notes": "two boxes"})
    assert client.patch(f"/admin/shipments/{sid}", headers=u["admin"],
                        json={"method": "boat"}).status_code == 400

    # steps must go in order
    assert client.post(f"/admin/shipments/{sid}/status", headers=u["admin"],
                       json={"status": "delivered"}).status_code == 400
    r = client.post(f"/admin/shipments/{sid}/status", headers=u["admin"], json={"status": "in_transit"})
    assert r.status_code == 200, r.text
    assert r.json()["requests"][0]["delivery_address"] == "1 Bay St, Nassau"
    # locked once shipped
    assert client.delete(f"/admin/shipments/{sid}/requests/{r2}", headers=u["admin"]).status_code == 400

    c = client.get(f"/requests/{r1}", headers=u["a"])
    body = c.json()
    assert body["status"] == "shipped"
    assert body["shipment"]["tracking_number"] == "1234567890" and body["shipment"]["eta"] == "2026-10-20"
    raw = c.text.lower()
    for secret in ["tb-998877", "freight_cost", "two boxes", "weight_kg", "colour correct", "supplier order"]:
        assert secret not in raw, f"customer response leaks {secret}"
    kinds = [e["kind"] for e in body["timeline"]]
    assert kinds[:2] == ["created", "sourcing"] and "ordered" in kinds and "warehouse" in kinds
    assert kinds[-1] == "shipment_in_transit"
    # other customer can't see it
    assert client.get(f"/requests/{r1}", headers=u["b"]).status_code == 404

    # straight from in transit to delivered: our side ends at delivery
    r = client.post(f"/admin/shipments/{sid}/status", headers=u["admin"], json={"status": "delivered"})
    assert r.status_code == 200, r.text
    assert client.post(f"/admin/shipments/{sid}/status", headers=u["admin"],
                       json={"status": "delivered"}).status_code == 400

    for rid, h in [(r1, u["a"]), (r2, u["b"])]:
        b = client.get(f"/requests/{rid}", headers=h).json()
        assert b["status"] == "delivered" and b["shipment"]["delivered_at"]
        assert "settlement" not in b
        assert b["timeline"][-1]["message"].startswith("Delivered to 1 Bay St, Nassau")
        assert "customs" not in str(b).lower()

    # notifications were logged (email not configured in tests -> skipped)
    admin_view = client.get(f"/admin/requests/{r1}", headers=u["admin"]).json()
    subjects = [n["subject"] for n in admin_view["notifications"]]
    for s in ["Your quote is ready", "Payment received", "Order placed", "Your order has shipped", "Delivered"]:
        assert any(x.startswith(s) for x in subjects), f"missing notification: {s}"
    assert all(n["status"] == "skipped" for n in admin_view["notifications"])
    assert any(not e["customer_visible"] for e in admin_view["events"])  # private events kept for admin


def test_new_request_notifies_admin(ops_users):
    rid = client.post("/requests", headers=ops_users["a"], json={"product_name": "Sun hat"}).json()["id"]
    notes = client.get(f"/admin/requests/{rid}", headers=ops_users["admin"]).json()["notifications"]
    assert any(n["to_address"] == "admin@aimoro.test" and "New request" in n["subject"] for n in notes)


def test_customers_cannot_use_operations(ops_users):
    assert client.get("/admin/shipments", headers=ops_users["a"]).status_code == 403
    assert client.post("/admin/shipments", headers=ops_users["a"], json={}).status_code == 403


def test_add_missing_columns_migration(tmp_path):
    """An old database without the Phase 2 columns gets them added on startup."""
    import sqlite3
    from sqlalchemy import create_engine, inspect
    import agent.db as dbmod

    path = tmp_path / "old.db"
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE requests (id INTEGER PRIMARY KEY, user_id INTEGER, product_name TEXT)")
    con.commit(); con.close()
    old_engine = dbmod.engine
    dbmod.engine = create_engine(f"sqlite:///{path}")
    try:
        dbmod._add_missing_columns()
        cols = {c["name"] for c in inspect(dbmod.engine).get_columns("requests")}
        assert {"shipment_id", "supplier_order_no", "warehouse_arrived_at"} <= cols
    finally:
        dbmod.engine = old_engine
