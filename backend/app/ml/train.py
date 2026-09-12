"""
Trains three XGBoost quantile-regression models (P10 / P50 / P90) that
predict plant power output (MW) from weather features.

Run generate_synthetic_data.py first to produce the training CSV (or point
FEATURES/DATA_PATH at real historical logs once you have them).

Usage:
    python -m app.ml.train
"""
import os
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "historical_generation.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")

FEATURES = [
    "shortwave_radiation",
    "cloud_cover",
    "wind_speed_10m",
    "temperature_2m",
    "hour",
    "day_of_year",
]
TARGET = "output_mw"

QUANTILES = {"p10": 0.1, "p50": 0.5, "p90": 0.9}


def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)
    return df.dropna(subset=FEATURES + [TARGET])


def train_quantile_model(X_train, y_train, alpha: float) -> xgb.XGBRegressor:
    model = xgb.XGBRegressor(
        objective="reg:quantileerror",
        quantile_alpha=alpha,
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)
    return model


def main():
    df = load_data()
    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, shuffle=True
    )

    os.makedirs(MODEL_DIR, exist_ok=True)
    metrics = {}

    for name, alpha in QUANTILES.items():
        model = train_quantile_model(X_train, y_train, alpha)
        preds = model.predict(X_test)
        mae = mean_absolute_error(y_test, preds)
        metrics[name] = round(mae, 3)
        joblib.dump(model, os.path.join(MODEL_DIR, f"model_{name}.pkl"))
        print(f"[{name}] MAE = {mae:.3f} MW  -> saved model_{name}.pkl")

    # Sanity check: P10 should generally be <= P50 <= P90 on the test set
    p10 = joblib.load(os.path.join(MODEL_DIR, "model_p10.pkl")).predict(X_test)
    p50 = joblib.load(os.path.join(MODEL_DIR, "model_p50.pkl")).predict(X_test)
    p90 = joblib.load(os.path.join(MODEL_DIR, "model_p90.pkl")).predict(X_test)
    crossing_rate = np.mean((p10 > p50) | (p50 > p90))
    print(f"Quantile crossing rate on test set: {crossing_rate:.1%} (lower is better)")

    joblib.dump({"features": FEATURES, "metrics": metrics}, os.path.join(MODEL_DIR, "meta.pkl"))
    print("Training complete. Metrics:", metrics)


if __name__ == "__main__":
    main()
