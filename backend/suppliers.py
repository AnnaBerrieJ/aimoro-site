from fastapi import FastAPI

app = FastAPI()

# Supplier Database
suppliers = [
    {
        "id": 1,
        "name": "Shenzhen Tech Supplies",
        "country": "China",
        "product": "Wireless Headphones",
        "unit_price": 12.50,
        "minimum_order_quantity": 100,
        "rating": 4.7,
        "delivery_days": 14,
        "verified": True
    },
    {
        "id": 2,
        "name": "Saigon Electronics Co.",
        "country": "Vietnam",
        "product": "Wireless Headphones",
        "unit_price": 13.20,
        "minimum_order_quantity": 50,
        "rating": 4.5,
        "delivery_days": 10,
        "verified": True
    },
    {
        "id": 3,
        "name": "Global Audio Parts",
        "country": "India",
        "product": "Wireless Headphones",
        "unit_price": 10.80,
        "minimum_order_quantity": 300,
        "rating": 4.1,
        "delivery_days": 21,
        "verified": False
    }
]

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

# Supplier Risk Analysis
def calculate_risk_level(supplier):

    if supplier["verified"] is False:
        return "High"

    if supplier["delivery_days"] > 18:
        return "Medium"

    if supplier["rating"] < 4.3:
        return "Medium"

    return "Low"

# API Endpoint
@app.get("/suppliers")
def get_suppliers():

    results = []

    for supplier in suppliers:

        supplier_copy = supplier.copy()

        supplier_copy["aimoro_score"] = calculate_supplier_score(
            supplier
        )

        supplier_copy["risk_level"] = calculate_risk_level(
            supplier
        )

        results.append(supplier_copy)

    ranked_results = sorted(
        results,
        key=lambda x: x["aimoro_score"],
        reverse=True
    )

    return ranked_results