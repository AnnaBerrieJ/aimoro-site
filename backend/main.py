import os
import json
import joblib
import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from suppliers import suppliers
from database import create_tables, save_supplier_to_db, get_saved_suppliers, delete_saved_supplier

app = FastAPI(title="Aimoro Smart Sourcing System")
create_tables()

# --- ML ranking model -------------------------------------------------
# Trained by backend/ml/train_model.py on backend/ml/supplier_training_data.csv.
# Falls back to the hand-tuned formula below if the model file isn't present
# (e.g. fresh clone before running the training script).
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "ml", "supplier_model.joblib")
METRICS_PATH = os.path.join(BASE_DIR, "ml", "model_metrics.json")

_model = None
_feature_importances = {}

try:
    _model = joblib.load(MODEL_PATH)
    with open(METRICS_PATH) as f:
        _feature_importances = json.load(f).get("feature_importances", {})
except FileNotFoundError:
    _model = None

# Comma-separated list of allowed origins, e.g. "http://localhost:8501,https://aimoro.com"
# Set ALLOWED_ORIGINS in your .env / deployment environment. Defaults to local dev only.
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:8501").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


def calculate_score_formula(supplier):
    """Original hand-tuned formula. Kept as a fallback if the ML model
    isn't trained/available yet, and as a baseline to compare the model
    against."""
    price_score = max(0, 100 - supplier["unit_price"] * 4)
    rating_score = supplier["rating"] * 20
    delivery_score = max(0, 100 - supplier["delivery_days"] * 3)
    verification_score = 100 if supplier["verified"] else 50

    final_score = (
        price_score * 0.35 +
        rating_score * 0.30 +
        delivery_score * 0.20 +
        verification_score * 0.15
    )

    return round(final_score, 2)


def calculate_supplier_score(supplier):
    """Scores a supplier using the trained GradientBoostingRegressor
    (see backend/ml/train_model.py). Falls back to the fixed formula if
    the model hasn't been trained yet."""
    if _model is None:
        return calculate_score_formula(supplier)

    row = pd.DataFrame([{
        "unit_price": supplier["unit_price"],
        "minimum_order_quantity": supplier["minimum_order_quantity"],
        "rating": supplier["rating"],
        "delivery_days": supplier["delivery_days"],
        "verified": int(supplier["verified"]),
        "platform": supplier["platform"],
        "country": supplier["country"],
    }])

    predicted = _model.predict(row)[0]
    return round(float(max(0, min(100, predicted))), 2)


def calculate_risk_level(supplier):
    risk_points = 0

    if supplier["rating"] < 4.3:
        risk_points += 1

    if supplier["delivery_days"] > 18:
        risk_points += 1

    if not supplier["verified"]:
        risk_points += 1

    if supplier["minimum_order_quantity"] > 250:
        risk_points += 1

    if risk_points <= 1:
        return "Low Risk"
    elif risk_points == 2:
        return "Medium Risk"
    else:
        return "High Risk"


def generate_recommendation(supplier):
    reasons = []

    if supplier["unit_price"] <= 12:
        reasons.append("competitive pricing")

    if supplier["rating"] >= 4.5:
        reasons.append("strong supplier rating")

    if supplier["delivery_days"] <= 14:
        reasons.append("fast delivery")

    if supplier["verified"]:
        reasons.append("verified supplier status")

    if supplier["minimum_order_quantity"] <= 100:
        reasons.append("low minimum order quantity")

    if not reasons:
        return "This supplier needs further review before sourcing."

    return "Recommended because of " + ", ".join(reasons) + "."


@app.get("/")
def home():
    return {
        "message": "Welcome to Aimoro Smart Sourcing System"
    }


@app.get("/model-info")
def model_info():
    """Exposes how the ranking model was evaluated and which factors
    drive supplier scores, so scores aren't a black box."""
    if _model is None:
        return {
            "status": "fallback_formula",
            "message": "ML model not found, using fixed-weight formula."
        }

    try:
        with open(METRICS_PATH) as f:
            metrics = json.load(f)
    except FileNotFoundError:
        metrics = {}

    return {
        "status": "ml_model",
        "metrics": metrics,
    }


@app.get("/suppliers")
def get_suppliers(
    product: str = Query(default=""),
    country: str = Query(default=""),
    max_price: float = Query(default=999999),
    verified: bool = Query(default=False)
):
    results = []

    for supplier in suppliers:
        product_match = product.lower() in supplier["product"].lower()
        country_match = country.lower() in supplier["country"].lower()
        price_match = supplier["unit_price"] <= max_price
        verified_match = supplier["verified"] if verified else True

        if product_match and country_match and price_match and verified_match:
            supplier_copy = supplier.copy()
            supplier_copy["aimoro_score"] = calculate_supplier_score(supplier)
            supplier_copy["risk_level"] = calculate_risk_level(supplier)
            supplier_copy["recommendation"] = generate_recommendation(supplier)
            results.append(supplier_copy)

    return sorted(results, key=lambda x: x["aimoro_score"], reverse=True)
@app.post("/save-supplier/{supplier_id}")
def save_supplier(supplier_id: int):
    for supplier in suppliers:
        if supplier["id"] == supplier_id:
            save_supplier_to_db(supplier)
            return {"message": "Supplier saved successfully"}

    return {"message": "Supplier not found"}


@app.get("/saved-suppliers")
def saved_suppliers():
    return get_saved_suppliers()

@app.delete("/saved-suppliers/{saved_id}")
def delete_supplier(saved_id: int):
    delete_saved_supplier(saved_id)
    return {"message": "Saved supplier deleted successfully"}