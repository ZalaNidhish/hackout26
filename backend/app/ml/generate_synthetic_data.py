"""
Generates a synthetic historical weather + generation dataset for training.

Why synthetic: you almost certainly don't have a year of real plant output
logs for a hackathon. This script pulls real historical *weather* from
Open-Meteo (or falls back to synthetic weather if offline), then simulates
plausible plant *output* from that weather using a simple physical model
plus noise/degradation, so the model has something realistic to learn from.

Swap this out later for real historical generation logs the moment you have
them — just point train.py at that CSV instead and skip this script.

Usage:
    python -m app.ml.generate_synthetic_data
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))
from app.services.weather import fetch_historical_weather, _synthetic_weather  # noqa: E402

OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "historical_generation.csv")

CAPACITY_MW = 35.0
LAT, LON = 23.0225, 72.5714  # Ahmedabad, as a placeholder plant location


def simulate_solar_output(df: pd.DataFrame, capacity_mw: float) -> pd.Series:
    """Rough physical model: output scales with irradiance and inversely with
    cloud cover, capped at capacity, with panel-soiling degradation drift and
    sensor noise layered on top so the training data isn't perfectly clean."""
    irradiance_factor = (df["shortwave_radiation"] / 1000).clip(0, 1.2)
    cloud_penalty = 1 - (df["cloud_cover"] / 100) * 0.55
    temp_derate = 1 - np.clip((df["temperature_2m"] - 25), 0, None) * 0.004

    base_output = capacity_mw * irradiance_factor * cloud_penalty * temp_derate

    # slow performance-ratio drift (simulates dust/ageing) + daily noise
    n = len(df)
    degradation = np.linspace(1.0, 0.94, n)  # 6% drift over the dataset
    noise = np.random.normal(1.0, 0.06, n)

    output = (base_output * degradation * noise).clip(0, capacity_mw)
    return output


def main(days: int = 400):
    end = datetime.utcnow().date() - timedelta(days=2)
    start = end - timedelta(days=days)

    try:
        df = fetch_historical_weather(LAT, LON, start.isoformat(), end.isoformat())
        print(f"Fetched {len(df)} hourly records from Open-Meteo archive.")
    except Exception as e:
        print(f"Live weather fetch failed ({e}); using synthetic weather instead.")
        df = _synthetic_weather(days * 24)

    df["output_mw"] = simulate_solar_output(df, CAPACITY_MW)
    df["hour"] = df["time"].dt.hour
    df["day_of_year"] = df["time"].dt.dayofyear
    df["month"] = df["time"].dt.month

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    df.to_csv(OUT_PATH, index=False)
    print(f"Saved {len(df)} rows to {OUT_PATH}")


if __name__ == "__main__":
    main()
