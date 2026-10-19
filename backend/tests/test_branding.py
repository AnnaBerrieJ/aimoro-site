"""Branding packages: order -> invoice -> paid -> proofs -> changes -> approve -> final files."""
import io

import pytest

from test_agent import client, signup


@pytest.fixture(scope="module")
def people():
    admin_h = client.post("/auth/login", json={"email": "admin@aimoro.test", "password": "password123"})
    if admin_h.status_code == 200:
        admin = {"Authorization": f"Bearer {admin_h.json()['token']}"}
    else:
        admin, _ = signup("admin@aimoro.test", "Ashley")
    cust, _ = signup("brand-cust@example.com", "Dee Knowles")
    other, _ = signup("brand-other@example.com", "Other")
    return {"admin": admin, "cust": cust, "other": other}


def _png(name="logo.png"):
    return ("files", (name, io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"0" * 100), "image/png"))


def test_packages_list():
    r = client.get("/branding/packages")
    assert r.status_code == 200
    by_key = {p["key"]: p for p in r.json()}
    assert by_key["basic"]["price"] == 200 and by_key["standard"]["rounds"] == 2 and by_key["full"]["price"] == 600


def test_full_branding_flow(people):
    c, a, o = people["cust"], people["admin"], people["other"]
    r = client.post("/branding", headers=c, json={
        "package": "basic", "business_name": "Island Bites", "industry": "Food truck",
        "description": "Conch fritters and drinks", "style_notes": "Bright, fun", "colours": "Teal and yellow"})
    assert r.status_code == 200, r.text
    p = r.json()
    pid = p["id"]
    assert p["status"] == "awaiting_payment" and p["price_bsd"] == 200 and p["rounds_included"] == 1
    assert p["invoice_number"].startswith("AIM-") and "-B" in p["invoice_number"]
    assert p["invoice_due"] is not None

    # privacy: other customers can't see it; admin notes are not in the customer view
    assert client.get(f"/branding/{pid}", headers=o).status_code == 404
    assert "admin_notes" not in p

    # customer adds a reference file
    r = client.post(f"/branding/{pid}/files", headers=c, files=[_png("idea.png")])
    assert r.status_code == 200, r.text
    ref = r.json()["files"][0]
    assert ref["kind"] == "reference" and ref["filename"] == "idea.png"
    assert client.get(f"/branding/{pid}/files/{ref['id']}", headers=c).status_code == 200
    assert client.get(f"/branding/{pid}/files/{ref['id']}", headers=o).status_code == 404

    # bad file type rejected
    r = client.post(f"/branding/{pid}/files", headers=c,
                    files=[("files", ("run.exe", io.BytesIO(b"MZ"), "application/octet-stream"))])
    assert r.status_code == 400

    # invoice PDF
    r = client.get(f"/branding/{pid}/invoice.pdf", headers=c)
    assert r.status_code == 200 and r.content[:4] == b"%PDF"

    # can't send proofs before payment; customer can't use admin routes
    assert client.post(f"/admin/branding/{pid}/proofs", headers=a, files=[_png()]).status_code == 400
    assert client.post(f"/admin/branding/{pid}/mark-paid", headers=c).status_code == 403

    r = client.post(f"/admin/branding/{pid}/mark-paid?reference=RBC-55", headers=a)
    assert r.status_code == 200 and r.json()["status"] == "in_design" and r.json()["payment_ref"] == "RBC-55"
    assert client.post(f"/branding/{pid}/cancel", headers=c).status_code == 400  # paid: no online cancel

    # approving before proofs fails
    assert client.post(f"/branding/{pid}/approve", headers=c).status_code == 400

    # proof set 1
    r = client.post(f"/admin/branding/{pid}/proofs", headers=a, files=[_png("proof1.png")],
                    data={"message": "Two directions to compare"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "proofs_ready" and r.json()["proof_round"] == 1

    # one change round included
    r = client.post(f"/branding/{pid}/changes", headers=c, json={"feedback": "Make the teal darker"})
    assert r.status_code == 200 and r.json()["status"] == "changes_requested" and r.json()["changes_left"] == 0
    assert client.post(f"/branding/{pid}/changes", headers=c, json={"feedback": "again"}).status_code == 400

    r = client.post(f"/admin/branding/{pid}/proofs", headers=a, files=[_png("proof2.png")])
    assert r.json()["proof_round"] == 2 and r.json()["status"] == "proofs_ready"

    # no rounds left: changes refused with the add-on message
    r = client.post(f"/branding/{pid}/changes", headers=c, json={"feedback": "One more tweak"})
    assert r.status_code == 400 and "add-on" in r.json()["detail"]

    # finals only after approval
    assert client.post(f"/admin/branding/{pid}/finals", headers=a, files=[_png()]).status_code == 400
    r = client.post(f"/branding/{pid}/approve", headers=c)
    assert r.status_code == 200 and r.json()["status"] == "approved"

    r = client.post(f"/admin/branding/{pid}/finals", headers=a,
                    files=[_png("logo-final.png"), ("files", ("logo.svg", io.BytesIO(b"<svg/>"), "image/svg+xml"))])
    assert r.status_code == 200 and r.json()["status"] == "completed"

    r = client.get(f"/branding/{pid}", headers=c)
    kinds = sorted(f["kind"] for f in r.json()["files"])
    assert kinds == ["final", "final", "proof", "proof", "reference"]
    svg = next(f for f in r.json()["files"] if f["filename"] == "logo.svg")
    d = client.get(f"/branding/{pid}/files/{svg['id']}", headers=c)
    assert d.status_code == 200 and "attachment" in d.headers["content-disposition"]

    # timeline + admin view
    msgs = [e["message"] for e in r.json()["timeline"]]
    assert any("final brand files" in m for m in msgs)
    r = client.get(f"/admin/branding/{pid}", headers=a)
    assert r.status_code == 200 and r.json()["customer"]["name"] == "Dee Knowles"
    assert len(r.json()["notifications"]) >= 4

    # paid invoice PDF still renders
    assert client.get(f"/branding/{pid}/invoice.pdf", headers=c).content[:4] == b"%PDF"


def test_cancel_and_lists(people):
    c, a = people["cust"], people["admin"]
    r = client.post("/branding", headers=c, json={"package": "full", "business_name": "Nassau Gym"})
    pid = r.json()["id"]
    assert r.json()["rounds_included"] == 3
    assert client.post(f"/branding/{pid}/cancel", headers=c).json()["status"] == "cancelled"
    assert client.post(f"/admin/branding/{pid}/mark-paid", headers=a).status_code == 400
    assert any(p["id"] == pid for p in client.get("/branding", headers=c).json())
    assert any(p["id"] == pid for p in client.get("/admin/branding?status=cancelled", headers=a).json())
    s = client.get("/admin/branding/summary", headers=a).json()
    assert s["cancelled"] >= 1 and "in_design" in s


def test_bad_package_rejected(people):
    r = client.post("/branding", headers=people["cust"], json={"package": "gold", "business_name": "X Co"})
    assert r.status_code == 422
