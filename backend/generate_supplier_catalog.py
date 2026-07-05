"""
Generates the demo supplier catalog served by GET /suppliers
(backend/suppliers.py loads backend/supplier_catalog.json at import time).

This is separate from backend/ml/generate_dataset.py, which generates
*training* data for the ranking model. It reuses the same sampling
distributions (platform/country mix, verification correlations, price
and delivery patterns) so the catalog looks like data drawn from the
same population the model was trained on, and adds company names,
products, and platform URLs to make it a browsable catalog rather than
a labeled training set.

Re-run to regenerate backend/supplier_catalog.json:
    python backend/generate_supplier_catalog.py
"""

import json
import os

import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(BASE_DIR, "supplier_catalog.json")

RNG = np.random.default_rng(seed=7)

N_SUPPLIERS = 250

PLATFORMS = ["Alibaba", "AliExpress"]
PLATFORM_URLS = {
    "Alibaba": "https://www.alibaba.com/",
    "AliExpress": "https://www.aliexpress.com/",
}

CITIES = {
    "China": ["Shenzhen", "Guangzhou", "Yiwu", "Ningbo", "Dongguan", "Shanghai", "Wenzhou", "Xiamen", "Fuzhou", "Hangzhou"],
    "Vietnam": ["Hanoi", "Ho Chi Minh City", "Da Nang", "Hai Phong", "Bien Hoa"],
    "India": ["Mumbai", "Delhi", "Ahmedabad", "Jaipur", "Surat", "Tiruppur"],
    "Bangladesh": ["Dhaka", "Chittagong", "Gazipur", "Narayanganj"],
}
COUNTRIES = list(CITIES.keys())

PRODUCTS = [
    "Wireless Headphones", "Bluetooth Speaker", "Phone Case",
    "LED Strip Lights", "Fitness Tracker", "Kitchen Gadget",
    "Backpack", "Skincare Tool", "Pet Accessory", "Yoga Mat",
]
PRODUCT_KEYWORD = {
    "Wireless Headphones": "Audio",
    "Bluetooth Speaker": "Audio",
    "Phone Case": "Mobile Accessories",
    "LED Strip Lights": "Lighting",
    "Fitness Tracker": "Wearables",
    "Kitchen Gadget": "Kitchenware",
    "Backpack": "Bags",
    "Skincare Tool": "Beauty",
    "Pet Accessory": "Pet Supplies",
    "Yoga Mat": "Fitness Gear",
}
SUFFIXES = [
    "Factory", "Trading Co.", "Manufacturing", "Electronics Ltd",
    "Industries", "Export Co.", "Group", "Supply Co.",
    "Enterprises", "Trading Ltd",
]


def make_name(country, keyword, used_names):
    name = None
    for _ in range(20):
        city = RNG.choice(CITIES[country])
        suffix = RNG.choice(SUFFIXES)
        candidate = f"{city} {keyword} {suffix}"
        if candidate not in used_names:
            name = candidate
            break
        name = candidate

    if name in used_names:
        counter = 2
        base = name
        while f"{base} {counter}" in used_names:
            counter += 1
        name = f"{base} {counter}"

    used_names.add(name)
    return name


def generate_catalog(n=N_SUPPLIERS):
    platform = RNG.choice(PLATFORMS, size=n, p=[0.55, 0.45])
    country = RNG.choice(COUNTRIES, size=n, p=[0.6, 0.2, 0.12, 0.08])
    product = RNG.choice(PRODUCTS, size=n)

    # Same correlations as ml/generate_dataset.py: verified suppliers
    # cluster on Alibaba and in China, skew higher rating, and Alibaba
    # verified suppliers ship a bit slower (larger factories).
    verified_base_prob = np.where(platform == "Alibaba", 0.65, 0.35)
    verified_base_prob = np.where(country == "China", verified_base_prob + 0.1, verified_base_prob)
    verified = RNG.random(n) < np.clip(verified_base_prob, 0, 0.95)

    rating = np.clip(
        RNG.normal(loc=np.where(verified, 4.5, 4.0), scale=0.35, size=n), 3.0, 5.0
    ).round(2)

    unit_price = np.round(np.clip(RNG.lognormal(mean=2.0, sigma=0.6, size=n), 1.5, 80), 2)

    moq_base = RNG.integers(1, 500, size=n)
    moq = np.clip((moq_base * (1 + (30 - unit_price).clip(min=0) / 30)).astype(int), 1, 1000)

    delivery_days = np.clip(
        RNG.normal(loc=np.where((platform == "Alibaba") & verified, 16, 11), scale=4, size=n),
        3, 35
    ).astype(int)

    used_names = set()
    catalog = []
    for i in range(n):
        keyword = PRODUCT_KEYWORD[product[i]]
        name = make_name(country[i], keyword, used_names)
        catalog.append({
            "id": i + 1,
            "platform": platform[i],
            "name": name,
            "country": country[i],
            "product": product[i],
            "unit_price": float(unit_price[i]),
            "minimum_order_quantity": int(moq[i]),
            "rating": float(rating[i]),
            "delivery_days": int(delivery_days[i]),
            "verified": bool(verified[i]),
            "supplier_url": PLATFORM_URLS[platform[i]],
        })
    return catalog


def main():
    catalog = generate_catalog()
    with open(OUT_PATH, "w") as f:
        json.dump(catalog, f, indent=2)
    print(f"Wrote {len(catalog)} suppliers to {OUT_PATH}")


if __name__ == "__main__":
    main()
