"""
Trains the Aimoro supplier ranking model.

Replaces the old fixed-weight formula (price*0.35 + rating*0.30 + ...)
with a learned Gradient Boosting Regressor. Includes a proper train/test
split, evaluation metrics, and feature importances so the ranking is
explainable — the model can say *why* a supplier scored the way it did,
not just spit out a number.
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "supplier_training_data.csv")
MODEL_PATH = os.path.join(BASE_DIR, "supplier_model.joblib")
METRICS_PATH = os.path.join(BASE_DIR, "model_metrics.json")

NUMERIC_FEATURES = ["unit_price", "minimum_order_quantity", "rating", "delivery_days"]
CATEGORICAL_FEATURES = ["platform", "country"]
# 'verified' is boolean, treat as numeric 0/1
BOOL_FEATURES = ["verified"]
TARGET = "quality_label"


def load_data():
    df = pd.read_csv(DATA_PATH)
    df["verified"] = df["verified"].astype(int)
    return df


def build_pipeline():
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", NUMERIC_FEATURES + BOOL_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )

    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=3,
        learning_rate=0.05,
        random_state=42,
    )

    pipeline = Pipeline(steps=[
        ("preprocess", preprocessor),
        ("model", model),
    ])
    return pipeline


def get_feature_names(pipeline):
    preprocessor = pipeline.named_steps["preprocess"]
    cat_encoder = preprocessor.named_transformers_["cat"]
    cat_names = list(cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES))
    return NUMERIC_FEATURES + BOOL_FEATURES + cat_names


def baseline_formula_score(df):
    """Vectorized copy of the original hand-tuned formula (see
    calculate_score_formula in backend/main.py), used here purely as a
    baseline to quantify how much the trained model improves on it."""
    price_score = (100 - df["unit_price"] * 4).clip(lower=0)
    rating_score = df["rating"] * 20
    delivery_score = (100 - df["delivery_days"] * 3).clip(lower=0)
    verification_score = np.where(df["verified"], 100, 50)

    return (
        price_score * 0.35 +
        rating_score * 0.30 +
        delivery_score * 0.20 +
        verification_score * 0.15
    )


def main():
    df = load_data()
    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES + BOOL_FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    preds = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    # Baseline: how well would the old fixed-weight formula have done on
    # the same held-out rows? This is the number that justifies training
    # a model in the first place.
    baseline_preds = baseline_formula_score(X_test)
    baseline_mae = mean_absolute_error(y_test, baseline_preds)
    baseline_r2 = r2_score(y_test, baseline_preds)

    feature_names = get_feature_names(pipeline)
    importances = pipeline.named_steps["model"].feature_importances_
    importance_dict = dict(sorted(
        zip(feature_names, importances.tolist()),
        key=lambda x: x[1],
        reverse=True
    ))

    metrics = {
        "mae": round(float(mae), 3),
        "r2": round(float(r2), 3),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "feature_importances": {k: round(v, 4) for k, v in importance_dict.items()},
        "baseline_formula": {
            "mae": round(float(baseline_mae), 3),
            "r2": round(float(baseline_r2), 3),
        },
        "improvement_over_baseline": {
            "mae_reduction_pct": round(float((baseline_mae - mae) / baseline_mae * 100), 1),
            "r2_delta": round(float(r2 - baseline_r2), 3),
        },
    }

    joblib.dump(pipeline, MODEL_PATH)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"Model saved to {MODEL_PATH}")
    print(f"\nEvaluation on held-out test set (n={len(X_test)}):")
    print(f"  Model     MAE: {mae:.2f}   R^2: {r2:.3f}")
    print(f"  Baseline  MAE: {baseline_mae:.2f}   R^2: {baseline_r2:.3f}  (fixed-weight formula)")
    print(f"  -> {metrics['improvement_over_baseline']['mae_reduction_pct']}% lower MAE than the baseline formula")
    print("\nFeature importances:")
    for name, imp in importance_dict.items():
        print(f"  {name:30s} {imp:.4f}")


if __name__ == "__main__":
    main()
