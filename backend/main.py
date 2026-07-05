from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from suppliers import suppliers

# Create FastAPI app
app = FastAPI(title="Aimoro Smart Sourcing System")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Home Route
@app.get("/")
def home():
    return {
        "message": "Welcome to Aimoro Smart Sourcing System"
    }

# AI Supplier Scoring Function
def calculate_supplier_score(supplier):
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

def calculate_risk_level(supplier):
    risk_points = 0

    if supplier["rating"] < 4.3:
        risk_points += 1

    if supplier["delivery_days"] > 18:
        risk_points += 1

    if supplier["verified"] == False:
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

    if supplier["unit_price"] < 12:
        reasons.append("competitive pricing")

    if supplier["rating"] >= 4.5:
        reasons.append("strong customer rating")

    if supplier["delivery_days"] <= 14:
        reasons.append("fast delivery")

    if supplier["verified"]:
        reasons.append("verified supplier status")

    if supplier["minimum_order_quantity"] <= 100:
        reasons.append("low minimum order quantity")

    if len(reasons) == 0:
        return "This supplier may require further review before sourcing."

    return "Recommended because of " + ", ".join(reasons) + "."

# Suppliers Route
@app.get("/suppliers")
def get_suppliers(
    product: str = "",
    country: str = "",
    max_price: float = 999999,
    verified: bool = False
):
    results = []

    for supplier in suppliers:
        product_match = product.lower() in supplier["product"].lower()
        country_match = country.lower() in supplier["country"].lower()
        price_match = supplier["unit_price"] <= max_price
        verified_match = True if not verified else supplier["verified"] == True

        if product_match and country_match and price_match and verified_match:
            supplier_copy = supplier.copy()
            supplier_copy["aimoro_score"] = calculate_supplier_score(supplier)
            supplier_copy["risk_level"] = calculate_risk_level(supplier)
            supplier_copy["recommendation"] = generate_recommendation(supplier)
            results.append(supplier_copy)

    return sorted(
        results,
        key=lambda x: x["aimoro_score"],
        reverse=True
    )