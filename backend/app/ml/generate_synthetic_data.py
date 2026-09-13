"""
Generates synthetic historical weather + generation datasets for training —
one for solar, one for wind.

Why synthetic: you almost certainly don't have a year of real plant output
logs for a hackathon. This script pulls real historical *weather* from
Open-Meteo (or falls back to synthetic weather if offline), then simulates
plausible plant *output* from that weather using simple physical models
(irradiance-driven for solar, a turbine power curve for wind) plus
noise/degradation, so each model has something realistic to learn from.

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

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

SOLAR_OUT_PATH = os.path.join(DATA_DIR, "historical_generation_solar.csv")
WIND_OUT_PATH = os.path.join(DATA_DIR, "historical_generation_wind.csv")

SOLAR_CAPACITY_MW = 35.0
WIND_CAPACITY_MW = 50.0

# Solar plant location: Ahmedabad (placeholder)
SOLAR_LAT, SOLAR_LON = 23.0225, 72.5714
# Wind plant location: Kutch, Gujarat — a real wind-resource-heavy region
WIND_LAT, WIND_LON = 23.5, 69.5

# Turbine power-curve constants (typical utility-scale onshore turbine, roughly)
CUT_IN_MS = 3.0     # below this, output is zero
RATED_MS = 12.0      # at/above this (until cut-out), output = full capacity
CUT_OUT_MS = 25.0    # above this, turbine shuts down for safety -> output 0


def simulate_solar_output(df: pd.DataFrame, capacity_mw: float) -> pd.Series:
    """Rough physical model: output scales with irradiance and inversely with
    cloud cover, capped at capacity, with panel-soiling degradation drift and
    sensor noise layered on top so the training data isn't perfectly clean."""
    irradiance_factor = (df["shortwave_radiation"] / 1000).clip(0, 1.2)
    cloud_penalty = 1 - (df["cloud_cover"] / 100) * 0.55
    temp_derate = 1 - np.clip((df["temperature_2m"] - 25), 0, None) * 0.004

    base_output = capacity_mw * irradiance_factor * cloud_penalty * temp_derate

    n = len(df)
    degradation = np.linspace(1.0, 0.94, n)  # 6% drift over the dataset (soiling/ageing)
    noise = np.random.normal(1.0, 0.06, n)

    return (base_output * degradation * noise).clip(0, capacity_mw)


def simulate_wind_output(df: pd.DataFrame, capacity_mw: float) -> pd.Series:
    """
    Simplified cubic turbine power curve:
    - below cut-in: 0 output (not enough wind to turn the rotor)
    - cut-in to rated: output scales with wind_speed^3 (power in wind is
      proportional to velocity cubed — this is a real aerodynamic
      relationship, not an arbitrary choice)
    - rated to cut-out: output plateaus at full capacity
    - above cut-out: 0 output (safety shutdown — real turbines actually do
      this, matching the platform's "severe weather -> shutdown" logic)
    """
    speed = df["wind_speed_10m"].clip(lower=0)

    # Fraction of rated power via cubic scaling between cut-in and rated
    frac = ((speed - CUT_IN_MS) / (RATED_MS - CUT_IN_MS)).clip(0, 1) ** 3
    output = capacity_mw * frac

    # Rated plateau
    output = output.where(speed < RATED_MS, capacity_mw)
    # Below cut-in -> zero
    output = output.where(speed >= CUT_IN_MS, 0.0)
    # Above cut-out -> zero (safety shutdown)
    output = output.where(speed <= CUT_OUT_MS, 0.0)

    n = len(df)
    degradation = np.linspace(1.0, 0.96, n)  # gearbox/blade wear, milder than solar soiling
    noise = np.random.normal(1.0, 0.08, n)   # wind output is noisier hour-to-hour than solar

    return (output * degradation * noise).clip(0, capacity_mw)


def _fetch_weather(lat, lon, days):
    end = datetime.utcnow().date() - timedelta(days=2)
    start = end - timedelta(days=days)
    try:
        df = fetch_historical_weather(lat, lon, start.isoformat(), end.isoformat())
        print(f"  Fetched {len(df)} hourly records from Open-Meteo archive.")
    except Exception as e:
        print(f"  Live weather fetch failed ({e}); using synthetic weather instead.")
        df = _synthetic_weather(days * 24)
    return df


def main(days: int = 400):
    os.makedirs(DATA_DIR, exist_ok=True)

    print("Generating SOLAR training data...")
    solar_df = _fetch_weather(SOLAR_LAT, SOLAR_LON, days)
    solar_df["output_mw"] = simulate_solar_output(solar_df, SOLAR_CAPACITY_MW)
    solar_df["hour"] = solar_df["time"].dt.hour
    solar_df["day_of_year"] = solar_df["time"].dt.dayofyear
    solar_df["month"] = solar_df["time"].dt.month
    solar_df.to_csv(SOLAR_OUT_PATH, index=False)
    print(f"  Saved {len(solar_df)} rows to {SOLAR_OUT_PATH}")

    print("Generating WIND training data...")
    wind_df = _fetch_weather(WIND_LAT, WIND_LON, days)
    wind_df["output_mw"] = simulate_wind_output(wind_df, WIND_CAPACITY_MW)
    wind_df["hour"] = wind_df["time"].dt.hour
    wind_df["day_of_year"] = wind_df["time"].dt.dayofyear
    wind_df["month"] = wind_df["time"].dt.month
    wind_df.to_csv(WIND_OUT_PATH, index=False)
    print(f"  Saved {len(wind_df)} rows to {WIND_OUT_PATH}")


if __name__ == "__main__":
    main()
