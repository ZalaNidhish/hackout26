"""
Forecast service.

Loads the three trained quantile models once at startup and exposes a single
predict() function the API routes call. If models haven't been trained yet,
falls back to a simple heuristic so the API is still usable end-to-end
(useful for frontend devs who need a running server before training finishes).
"""
import os
import joblib
import numpy as np
import pandas as pd

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml", "saved_models")
FEATURES = [
    "shortwave_radiation",
    "cloud_cover",
    "wind_speed_10m",
    "temperature_2m",
    "hour",
    "day_of_year",
]

_models = {}
_models_loaded = False


def load_models() -> bool:
    """Attempts to load trained models from disk. Returns True on success."""
    global _models, _models_loaded
    try:
        for name in ["p10", "p50", "p90"]:
            path = os.path.join(MODEL_DIR, f"model_{name}.pkl")
            _models[name] = joblib.load(path)
        _models_loaded = True
    except FileNotFoundError:
        _models_loaded = False
    return _models_loaded


def models_ready() -> bool:
    return _models_loaded


def _heuristic_predict(weather_df: pd.DataFrame, capacity_mw: float) -> pd.DataFrame:
    """Fallback used only if no trained model is found on disk yet.
    Keeps /forecast usable during early development."""
    irradiance_factor = (weather_df["shortwave_radiation"] / 1000).clip(0, 1.2)
    cloud_penalty = 1 - (weather_df["cloud_cover"] / 100) * 0.55
    p50 = (capacity_mw * irradiance_factor * cloud_penalty).clip(0, capacity_mw)
    spread = 0.15 * capacity_mw
    return pd.DataFrame({
        "p10": (p50 - spread).clip(0, capacity_mw),
        "p50": p50,
        "p90": (p50 + spread).clip(0, capacity_mw),
    })


def predict(weather_df: pd.DataFrame, capacity_mw: float) -> pd.DataFrame:
    """Given a weather dataframe (must include hour/day_of_year columns),
    returns a dataframe with p10/p50/p90 columns, same row order as input."""
    df = weather_df.copy()
    if "hour" not in df.columns:
        df["hour"] = df["time"].dt.hour
    if "day_of_year" not in df.columns:
        df["day_of_year"] = df["time"].dt.dayofyear

    if not _models_loaded:
        return _heuristic_predict(df, capacity_mw)

    X = df[FEATURES]
    result = pd.DataFrame({
        "p10": np.clip(_models["p10"].predict(X), 0, capacity_mw),
        "p50": np.clip(_models["p50"].predict(X), 0, capacity_mw),
        "p90": np.clip(_models["p90"].predict(X), 0, capacity_mw),
    })
    # enforce monotonic p10 <= p50 <= p90 in case quantiles cross on edge cases
    result["p50"] = np.maximum(result["p50"], result["p10"])
    result["p90"] = np.maximum(result["p90"], result["p50"])
    return result
