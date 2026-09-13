"""
Trains XGBoost quantile-regression models (P10 / P50 / P90) that predict
plant power output (MW) from weather features — one model set for solar,
one for wind, since the two resources respond to completely different
features (irradiance vs. wind speed) and shouldn't share a model.

Run generate_synthetic_data.py first to produce the training CSVs (or point
DATA_PATHS at real historical logs once you have them, per type).

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

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")

TARGET = "output_mw"
QUANTILES = {"p10": 0.1, "p50": 0.5, "p90": 0.9}

# Each resource type gets its own feature set and data file. Solar cares
# about irradiance/cloud/temp; wind cares almost entirely about wind speed
# (temperature affects air density slightly, but that's a smaller effect —
# kept out here to keep the model simple and interpretable).
TYPE_CONFIG = {
    "solar": {
        "data_path": os.path.join(DATA_DIR, "historical_generation_solar.csv"),
        "features": ["shortwave_radiation", "cloud_cover", "temperature_2m", "hour", "day_of_year"],
    },
    "wind": {
        "data_path": os.path.join(DATA_DIR, "historical_generation_wind.csv"),
        "features": ["wind_speed_10m", "temperature_2m", "hour", "day_of_year"],
    },
}


def load_data(path: str, features: list) -> pd.DataFrame:
    df = pd.read_csv(path)
    return df.dropna(subset=features + [TARGET])


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


def train_for_type(resource_type: str):
    config = TYPE_CONFIG[resource_type]
    features = config["features"]
    out_dir = os.path.join(MODEL_DIR, resource_type)
    os.makedirs(out_dir, exist_ok=True)

    print(f"\n=== Training {resource_type.upper()} models ===")
    df = load_data(config["data_path"], features)
    X = df[features]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, shuffle=True
    )

    metrics = {}
    for name, alpha in QUANTILES.items():
        model = train_quantile_model(X_train, y_train, alpha)
        preds = model.predict(X_test)
        mae = mean_absolute_error(y_test, preds)
        metrics[name] = round(mae, 3)
        joblib.dump(model, os.path.join(out_dir, f"model_{name}.pkl"))
        print(f"  [{name}] MAE = {mae:.3f} MW  -> saved {resource_type}/model_{name}.pkl")

    p10 = joblib.load(os.path.join(out_dir, "model_p10.pkl")).predict(X_test)
    p50 = joblib.load(os.path.join(out_dir, "model_p50.pkl")).predict(X_test)
    p90 = joblib.load(os.path.join(out_dir, "model_p90.pkl")).predict(X_test)
    crossing_rate = np.mean((p10 > p50) | (p50 > p90))
    print(f"  Quantile crossing rate on test set: {crossing_rate:.1%} (lower is better)")

    joblib.dump({"features": features, "metrics": metrics}, os.path.join(out_dir, "meta.pkl"))
    return metrics


def main():
    all_metrics = {}
    for resource_type in TYPE_CONFIG:
        all_metrics[resource_type] = train_for_type(resource_type)
    print("\nTraining complete for all types. Metrics:", all_metrics)


if __name__ == "__main__":
    main()
