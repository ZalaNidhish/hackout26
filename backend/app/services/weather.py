"""
Weather service.

Talks to Open-Meteo (free, no API key needed) for both:
- forecast data (next N hours) -> used at prediction time
- historical archive data -> used to build the training set

If the API is unreachable, falls back to a seasonal/synthetic estimate so the
rest of the pipeline degrades gracefully instead of crashing (this mirrors the
"missing weather data" mitigation from the ideation doc).
"""
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

HOURLY_VARS = [
    "shortwave_radiation",  # GHI proxy, W/m^2 - solar
    "cloud_cover",
    "wind_speed_10m",
    "temperature_2m",
]


def fetch_forecast_weather(lat: float, lon: float, hours: int = 72) -> pd.DataFrame:
    """Live weather forecast for the next `hours` hours."""
    try:
        resp = requests.get(
            FORECAST_URL,
            params={
                "latitude": lat,
                "longitude": lon,
                "hourly": ",".join(HOURLY_VARS),
                "forecast_days": min(3 + hours // 24, 16),
                "timezone": "auto",
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()["hourly"]
        df = pd.DataFrame(data)
        df["time"] = pd.to_datetime(df["time"])
        df = df.head(hours).reset_index(drop=True)
        df["hour_offset"] = range(len(df))
        return df
    except Exception:
        # Graceful fallback: seasonal/synthetic estimate instead of failing outright
        return _synthetic_weather(hours)


def fetch_historical_weather(lat: float, lon: float, start_date: str, end_date: str) -> pd.DataFrame:
    """Historical weather, used for model training."""
    resp = requests.get(
        ARCHIVE_URL,
        params={
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": ",".join(HOURLY_VARS),
            "timezone": "auto",
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()["hourly"]
    df = pd.DataFrame(data)
    df["time"] = pd.to_datetime(df["time"])
    return df


def _synthetic_weather(hours: int) -> pd.DataFrame:
    """Deterministic fallback used when the weather API is unavailable,
    or for local dev/demo without network access."""
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    rows = []
    for h in range(hours):
        ts = now + timedelta(hours=h)
        hour_of_day = ts.hour
        # crude daylight bell curve centered at 13:00
        daylight = max(0, np.cos((hour_of_day - 13) / 6 * np.pi / 2))
        radiation = 850 * daylight * (0.7 + 0.3 * np.random.rand())
        rows.append({
            "time": ts,
            "shortwave_radiation": radiation,
            "cloud_cover": np.random.uniform(10, 60),
            "wind_speed_10m": np.random.uniform(2, 9),
            "temperature_2m": 22 + 8 * daylight + np.random.uniform(-2, 2),
            "hour_offset": h,
        })
    return pd.DataFrame(rows)
