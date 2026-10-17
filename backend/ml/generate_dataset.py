"""
Generates a synthetic supplier dataset to train the Aimoro ranking model.

Why synthetic data: Aimoro doesn't yet have enough real transaction/outcome
history to learn from. This script encodes domain assumptions about what
makes a "good" supplier (price, rating, delivery speed, verification,
MOQ, and platform) into a labeled dataset, with realistic noise and
feature correlations, so a model can learn a ranking function instead of
using fixed hand-picked weights.

Once Aimoro has real user behavior (saves, clicks, completed orders,
disputes), replace `label_quality()` with real outcome labels and
retrain on that instead.
"""

import os

import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RNG = np.random.default_rng(seed=42)

PLATFORMS = ["Alibaba", "AliExpress"]
COUNTRIES = ["China", "Vietnam", "India", "Bangladesh"]
PRODUCTS = [
    "Wireless Headphones", "Bluetooth Speaker", "Phone Case",
    "LED Strip Lights", "Fitness Tracker", "Kitchen Gadget",
    "Backpack", "Skincare Tool", "Pet Accessory", "Yoga Mat",
]

N_ROWS = 600


def sample_suppliers(n=N_ROWS):
    platform = RNG.choice(PLATFORMS, size=n, p=[0.55, 0.45])
    country = RNG.choice(COUNTRIES, size=n, p=[0.6, 0.2, 0.12, 0.08])
    product = RNG.choice(PRODUCTS, size=n)

    # Verified suppliers tend to cluster on Alibaba and in China (reflects
    # real platform verification programs), not purely random.
    verified_base_prob = np.where(platform == "Alibaba", 0.65, 0.35)
    verified_base_prob = np.where(country == "China", verified_base_prob + 0.1, verified_base_prob)
    verified = RNG.random(n) < np.clip(verified_base_prob, 0, 0.95)

    # Rating: verified suppliers skew higher, with noise
    rating = np.clip(
        RNG.normal(loc=np.where(verified, 4.5, 4.0), scale=0.35, size=n), 3.0, 5.0
    ).round(2)

    # Unit price: lognormal, roughly $2-$60
    unit_price = np.round(np.clip(RNG.lognormal(mean=2.0, sigma=0.6, size=n), 1.5, 80), 2)

    # MOQ: correlated with lower price (cheaper unit price -> higher MOQ often required)
    moq_base = RNG.integers(1, 500, size=n)
    moq = np.clip((moq_base * (1 + (30 - unit_price).clip(min=0) / 30)).astype(int), 1, 1000)

    # Delivery days: verified & Alibaba suppliers tend to ship a bit slower
    # (larger factories, bulk logistics) — a realistic, slightly counter-
    # intuitive pattern the model can pick up on that a fixed formula wouldn't.
    delivery_days = np.clip(
        RNG.normal(loc=np.where((platform == "Alibaba") & verified, 16, 11), scale=4, size=n),
        3, 35
    ).astype(int)

    df = pd.DataFrame({
        "platform": platform,
        "country": country,
        "product": product,
        "unit_price": unit_price,
        "minimum_order_quantity": moq,
        "rating": rating,
        "delivery_days": delivery_days,
        "verified": verified,
    })
    return df


def label_quality(df):
    """
    Simulates a 'would a sourcing expert recommend this supplier' outcome.
    This is a noisy, nonlinear combination — not the same fixed weights as
    the old formula — so the model has to actually learn structure instead
    of just re-deriving hand-picked coefficients.
    """
    score = (
        (5 - df["rating"]) * -18                       # higher rating -> better
        + df["unit_price"].clip(upper=40) * 0.8          # higher price -> worse (capped effect)
        + df["delivery_days"] * 1.3                      # slower -> worse
        + np.where(df["verified"], -12, 10)               # verified -> better
        + np.log1p(df["minimum_order_quantity"]) * 2.5   # very high MOQ -> worse
        + np.where(df["platform"] == "Alibaba", -3, 3)    # slight platform prior
    )

    noise = RNG.normal(0, 8, size=len(df))
    raw = score + noise

    # Convert to a 0-100 "quality" label via percentile scaling (inverted:
    # lower raw score = better supplier)
    pct = pd.Series(raw).rank(pct=True)
    quality = ((1 - pct) * 100).round(2)
    return quality


def main():
    df = sample_suppliers()
    df["quality_label"] = label_quality(df)
    out_path = os.path.join(BASE_DIR, "supplier_training_data.csv")
    df.to_csv(out_path, index=False)
    print(f"Wrote {len(df)} rows to {out_path}")
    print(df.head())
    print("\nLabel distribution:")
    print(df["quality_label"].describe())


if __name__ == "__main__":
    main()
