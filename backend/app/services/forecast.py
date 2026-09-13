"""
Forecast service.

Loads BOTH model sets (solar and wind) once at startup, each with its own
feature list, and predict() picks the right set based on plant.type. If a
model set hasn't been trained yet, falls back to a simple type-appropriate
heuristic so the API stays usable end-to-end even before training finishes.
"""
import os
import joblib
import numpy as np
import pandas as pd

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml", "saved_models")

FEATURES_BY_TYPE = {
    "solar": ["shortwave_radiation", "cloud_cover", "temperature_2m", "hour", "day_of_year"],
    "wind": ["wind_speed_10m", "temperature_2m", "hour", "day_of_year"],
}

# Turbine power-curve constants, mirrored from generate_synthetic_data.py,
# used only by the wind heuristic fallback below.
CUT_IN_MS = 3.0
RATED_MS = 12.0
CUT_OUT_MS = 25.0

_models = {"solar": {}, "wind": {}}
_loaded = {"solar": False, "wind": False}


def load_models() -> bool:
    """Attempts to load both trained model sets from disk.
    Returns True if at least one resource type loaded successfully."""
    global _models, _loaded
    for resource_type in ("solar", "wind"):
        try:
            type_dir = os.path.join(MODEL_DIR, resource_type)
            for name in ["p10", "p50", "p90"]:
                path = os.path.join(type_dir, f"model_{name}.pkl")
                _models[resource_type][name] = joblib.load(path)
            _loaded[resource_type] = True
        except FileNotFoundError:
            _loaded[resource_type] = False
    return any(_loaded.values())


def models_ready(resource_type: str = None) -> bool:
    if resource_type:
        return _loaded.get(resource_type, False)
    return any(_loaded.values())


def _heuristic_predict_solar(df: pd.DataFrame, capacity_mw: float) -> pd.DataFrame:
    irradiance_factor = (df["shortwave_radiation"] / 1000).clip(0, 1.2)
    cloud_penalty = 1 - (df["cloud_cover"] / 100) * 0.55
    p50 = (capacity_mw * irradiance_factor * cloud_penalty).clip(0, capacity_mw)
    spread = 0.15 * capacity_mw
    return pd.DataFrame({
        "p10": (p50 - spread).clip(0, capacity_mw),
        "p50": p50,
        "p90": (p50 + spread).clip(0, capacity_mw),
    })


def _heuristic_predict_wind(df: pd.DataFrame, capacity_mw: float) -> pd.DataFrame:
    """Same cubic turbine power-curve used to generate training data,
    used here only as a fallback before a real model is trained."""
    speed = df["wind_speed_10m"].clip(lower=0)
    frac = ((speed - CUT_IN_MS) / (RATED_MS - CUT_IN_MS)).clip(0, 1) ** 3
    p50 = capacity_mw * frac
    p50 = p50.where(speed < RATED_MS, capacity_mw)
    p50 = p50.where(speed >= CUT_IN_MS, 0.0)
    p50 = p50.where(speed <= CUT_OUT_MS, 0.0)
    spread = 0.20 * capacity_mw  # wind is noisier than solar, wider band
    return pd.DataFrame({
        "p10": (p50 - spread).clip(0, capacity_mw),
        "p50": p50,
        "p90": (p50 + spread).clip(0, capacity_mw),
    })


def predict(weather_df: pd.DataFrame, capacity_mw: float, plant_type: str = "solar") -> pd.DataFrame:
    """Given a weather dataframe (must include hour/day_of_year columns),
    returns a dataframe with p10/p50/p90 columns, same row order as input.
    plant_type selects which model set (and feature list) to use."""
    plant_type = plant_type if plant_type in FEATURES_BY_TYPE else "solar"

    df = weather_df.copy()
    if "hour" not in df.columns:
        df["hour"] = df["time"].dt.hour
    if "day_of_year" not in df.columns:
        df["day_of_year"] = df["time"].dt.dayofyear

    if not _loaded[plant_type]:
        if plant_type == "wind":
            return _heuristic_predict_wind(df, capacity_mw)
        return _heuristic_predict_solar(df, capacity_mw)

    features = FEATURES_BY_TYPE[plant_type]
    X = df[features]
    models = _models[plant_type]
    result = pd.DataFrame({
        "p10": np.clip(models["p10"].predict(X), 0, capacity_mw),
        "p50": np.clip(models["p50"].predict(X), 0, capacity_mw),
        "p90": np.clip(models["p90"].predict(X), 0, capacity_mw),
    })
    # enforce monotonic p10 <= p50 <= p90 in case quantiles cross on edge cases
    result["p50"] = np.maximum(result["p50"], result["p10"])
    result["p90"] = np.maximum(result["p90"], result["p50"])
    return result
