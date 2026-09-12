"""
Decision engine.

Deliberately NOT machine learning - this is deterministic, explainable
threshold logic, exactly as scoped in the ideation doc. Kept as plain
functions with no framework dependencies so it's trivial to unit test.
"""
from typing import Optional

BUFFER_PCT = 0.10          # +/-10% band around demand counts as "on target"
SEVERE_WIND_MS = 20.0       # wind speed threshold (m/s) to trigger emergency flag


def evaluate_hour(
    p10: float,
    p50: float,
    demand_mw: float,
    wind_speed_ms: Optional[float] = None,
) -> dict:
    """Returns {"status": ..., "action": ...} for a single hour."""

    if wind_speed_ms is not None and wind_speed_ms >= SEVERE_WIND_MS:
        return {
            "status": "emergency",
            "action": "Override standard logic — raise emergency flag, recommend shutdown or full backup switch-over",
            "severe_weather": True,
        }

    lower_band = demand_mw * (1 - BUFFER_PCT)
    upper_band = demand_mw * (1 + BUFFER_PCT)

    # React to the conservative estimate (P10) for shortage risk, so a
    # cautious operator isn't caught out by an optimistic average.
    if p10 < lower_band:
        return {
            "status": "shortage",
            "action": "Discharge battery storage, ramp up backup generation, or procure from the spot market",
            "severe_weather": False,
        }

    if p50 > upper_band:
        return {
            "status": "surplus",
            "action": "Charge battery storage; apply targeted curtailment once storage is full",
            "severe_weather": False,
        }

    return {
        "status": "normal",
        "action": "No action required — continue monitoring",
        "severe_weather": False,
    }


def estimate_impact(points: list) -> dict:
    """Very rough financial/emissions estimate for the dashboard summary
    cards, derived from how many shortage/surplus hours were avoided vs.
    acted on. Tune the constants once you have real tariff/emission data."""
    inr_per_mwh_saved = 3500
    tco2_per_mwh_avoided = 0.7

    shortage_hours = sum(1 for p in points if p["status"] == "shortage")
    surplus_hours = sum(1 for p in points if p["status"] == "surplus")

    estimated_savings = shortage_hours * inr_per_mwh_saved
    avoided_emissions = surplus_hours * tco2_per_mwh_avoided

    total_flagged = shortage_hours + surplus_hours
    if total_flagged == 0:
        confidence = "High"
    elif total_flagged <= len(points) * 0.2:
        confidence = "Medium"
    else:
        confidence = "Low"

    return {
        "estimated_savings_inr": float(estimated_savings),
        "avoided_emissions_tco2": round(avoided_emissions, 2),
        "forecast_confidence": confidence,
    }
