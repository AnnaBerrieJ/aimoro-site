"""Admin operations after payment: supplier orders, China warehouse, and
consolidated shipments. AIMORO's responsibility ends when an order is
delivered to the customer's address."""
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..db import get_db
from ..common import delivery_address
from ..models import SHIPMENT_METHODS, SHIPMENT_STATUSES, ProductRequest, Shipment
from ..notify import add_event, notify_customer
from ..schemas import (AdminRequestOut, AdminShipmentOut, OrderIn, ShipmentIn, ShipmentRequestBrief,
                       ShipmentStatusIn, WarehouseIn)
from .admin import _admin_view, _get_req

router = APIRouter(prefix="/admin", tags=["operations"], dependencies=[Depends(require_admin)])

METHOD_LABELS = {"courier": "express courier", "air": "air freight", "sea": "sea freight"}


def _now():
    return datetime.now(timezone.utc)


# ---------- supplier order + warehouse ----------

@router.post("/requests/{request_id}/order", response_model=AdminRequestOut)
def record_order(request_id: int, body: OrderIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    req = _get_req(db, request_id)
    if req.status != "paid":
        raise HTTPException(400, "Only paid requests can be ordered")
    req.supplier_order_no = body.supplier_order_no.strip()
    req.ordered_at = _now()
    req.status = "ordered"
    add_event(db, req, "supplier_order", f"Supplier order {req.supplier_order_no}. {body.note}".strip(), visible=False)
    msg = "We've ordered your item from the supplier. Next it goes to our China warehouse for a quality check."
    add_event(db, req, "ordered", msg)
    notify_customer(db, background, req, "Order placed", msg)
    db.commit()
    return _admin_view(req)


@router.post("/requests/{request_id}/warehouse", response_model=AdminRequestOut)
def warehouse_arrival(request_id: int, body: WarehouseIn, db: Session = Depends(get_db)):
    req = _get_req(db, request_id)
    if req.status != "ordered":
        raise HTTPException(400, "Only ordered requests can arrive at the warehouse")
    req.warehouse_arrived_at = _now()
    req.warehouse_notes = body.notes.strip()
    add_event(db, req, "warehouse", "Your item arrived at our China warehouse and passed our check.")
    if req.warehouse_notes:
        add_event(db, req, "warehouse_notes", f"Warehouse check: {req.warehouse_notes}", visible=False)
    db.commit()
    return _admin_view(req)


# ---------- shipments ----------

def _shipment_out(s: Shipment) -> AdminShipmentOut:
    fields = {k: getattr(s, k) for k in AdminShipmentOut.model_fields if k != "requests"}
    out = AdminShipmentOut(**fields)
    out.requests = [ShipmentRequestBrief(
        id=r.id, product_name=r.product_name, quantity=r.quantity, status=r.status,
        customer_name=r.user.name, customer_island=r.user.island, delivery_address=delivery_address(r),
        warehouse_arrived=r.warehouse_arrived_at is not None,
    ) for r in sorted(s.requests, key=lambda r: r.id)]
    return out


def _get_shipment(db: Session, shipment_id: int) -> Shipment:
    s = db.get(Shipment, shipment_id)
    if s is None:
        raise HTTPException(404, "Shipment not found")
    return s


def _check_fields(body: ShipmentIn):
    if body.method not in SHIPMENT_METHODS:
        raise HTTPException(400, f"method must be one of {SHIPMENT_METHODS}")
    if body.eta:
        try:
            datetime.strptime(body.eta, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(400, "eta must be YYYY-MM-DD")


@router.get("/ready-to-ship", response_model=list[ShipmentRequestBrief])
def ready_to_ship(db: Session = Depends(get_db)):
    rows = db.scalars(select(ProductRequest).where(
        ProductRequest.status == "ordered", ProductRequest.shipment_id.is_(None)).order_by(ProductRequest.id)).all()
    return [ShipmentRequestBrief(
        id=r.id, product_name=r.product_name, quantity=r.quantity, status=r.status,
        customer_name=r.user.name, customer_island=r.user.island, delivery_address=delivery_address(r),
        warehouse_arrived=r.warehouse_arrived_at is not None) for r in rows]


@router.get("/shipments", response_model=list[AdminShipmentOut])
def list_shipments(db: Session = Depends(get_db)):
    return [_shipment_out(s) for s in db.scalars(select(Shipment).order_by(Shipment.id.desc())).all()]


@router.post("/shipments", response_model=AdminShipmentOut)
def create_shipment(body: ShipmentIn, db: Session = Depends(get_db)):
    _check_fields(body)
    s = Shipment(reference="pending", **body.model_dump())
    db.add(s)
    db.flush()
    s.reference = f"SHP-{_now():%Y}-{s.id:04d}"
    db.commit()
    return _shipment_out(s)


@router.get("/shipments/{shipment_id}", response_model=AdminShipmentOut)
def get_shipment(shipment_id: int, db: Session = Depends(get_db)):
    return _shipment_out(_get_shipment(db, shipment_id))


@router.patch("/shipments/{shipment_id}", response_model=AdminShipmentOut)
def update_shipment(shipment_id: int, body: ShipmentIn, db: Session = Depends(get_db)):
    s = _get_shipment(db, shipment_id)
    _check_fields(body)
    for k, v in body.model_dump().items():
        setattr(s, k, v)
    db.commit()
    return _shipment_out(s)


@router.post("/shipments/{shipment_id}/requests/{request_id}", response_model=AdminShipmentOut)
def add_to_shipment(shipment_id: int, request_id: int, db: Session = Depends(get_db)):
    s = _get_shipment(db, shipment_id)
    req = _get_req(db, request_id)
    if s.status != "preparing":
        raise HTTPException(400, "Items can only be added while the shipment is preparing")
    if req.status != "ordered":
        raise HTTPException(400, "Only ordered requests can be added to a shipment")
    if req.shipment_id not in (None, s.id):
        raise HTTPException(400, "This request is already in another shipment")
    req.shipment_id = s.id
    add_event(db, req, "consolidated", f"Added to shipment {s.reference}.", visible=False)
    db.commit()
    db.refresh(s)
    return _shipment_out(s)


@router.delete("/shipments/{shipment_id}/requests/{request_id}", response_model=AdminShipmentOut)
def remove_from_shipment(shipment_id: int, request_id: int, db: Session = Depends(get_db)):
    s = _get_shipment(db, shipment_id)
    req = _get_req(db, request_id)
    if s.status != "preparing":
        raise HTTPException(400, "Items can only be removed while the shipment is preparing")
    if req.shipment_id != s.id:
        raise HTTPException(400, "This request isn't in this shipment")
    req.shipment_id = None
    add_event(db, req, "unconsolidated", f"Removed from shipment {s.reference}.", visible=False)
    db.commit()
    db.refresh(s)
    return _shipment_out(s)


@router.post("/shipments/{shipment_id}/status", response_model=AdminShipmentOut)
def advance_shipment(shipment_id: int, body: ShipmentStatusIn, background: BackgroundTasks,
                     db: Session = Depends(get_db)):
    s = _get_shipment(db, shipment_id)
    if body.status not in SHIPMENT_STATUSES:
        raise HTTPException(400, f"status must be one of {SHIPMENT_STATUSES}")
    cur, new = SHIPMENT_STATUSES.index(s.status), SHIPMENT_STATUSES.index(body.status)
    if new != cur + 1:
        nxt = SHIPMENT_STATUSES[cur + 1] if cur + 1 < len(SHIPMENT_STATUSES) else None
        raise HTTPException(400, f"Next step is {nxt}" if nxt else "Shipment is already delivered")
    if not s.requests:
        raise HTTPException(400, "Add at least one request to the shipment first")

    how = METHOD_LABELS.get(s.method, s.method)
    track = f" Tracking: {s.carrier} {s.tracking_number}".rstrip() + "." if s.tracking_number else ""
    eta = f" Estimated arrival {s.eta}." if s.eta else ""

    s.status = body.status
    if body.status == "in_transit":
        s.shipped_at = _now()
    else:  # delivered
        s.delivered_at = _now()

    for req in s.requests:
        if s.tracking_number:
            req.tracking_number = f"{s.carrier} {s.tracking_number}".strip()
        if body.status == "in_transit":
            req.status = "shipped"
            subject = "Your order has shipped"
            msg = f"Your order left China by {how}.{track}{eta}"
        else:
            req.status = "delivered"
            subject = "Delivered"
            msg = f"Delivered to {delivery_address(req) or 'your address'}. Thank you for shopping with AIMORO!"
        add_event(db, req, f"shipment_{body.status}", msg)
        notify_customer(db, background, req, subject, msg)
    db.commit()
    return _shipment_out(s)
