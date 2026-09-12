"""
FastAPI entrypoint.

Run with:
    uvicorn app.main:app --reload --port 8000

Then open http://localhost:8000/docs for interactive Swagger UI — this alone
is often enough for a frontend dev to start wiring up axios calls without
you writing separate API documentation.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta

from app.models.schemas import (
    PlantConfig, PlantConfigCreate, ForecastResponse, HourlyForecast,
    HealthResponse, DemandPoint,
)
from app.services import weather, forecast, decision
from app import store

app = FastAPI(
    title="Renewable Generation Forecasting API",
    description="Forecasts solar/wind output 24-72h ahead and recommends grid actions.",
    version="0.1.0",
)

# Wide-open CORS for hackathon/dev purposes. Tighten this to your actual
# frontend origin (e.g. http://localhost:5173) before anything resembling production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    forecast.load_models()
    store.seed_demo_plant()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", model_loaded=forecast.models_ready())


# ---------------------------------------------------------------------------
# Plant configuration
# ---------------------------------------------------------------------------

@app.get("/plants", response_model=list[PlantConfig])
def list_plants():
    return store.list_plants()


@app.post("/plants", response_model=PlantConfig)
def create_plant(payload: PlantConfigCreate):
    return store.create_plant(
        name=payload.name,
        type_=payload.type,
        capacity_mw=payload.capacity_mw,
        latitude=payload.latitude,
        longitude=payload.longitude,
        demand_schedule=payload.demand_schedule,
    )


@app.get("/plants/{plant_id}", response_model=PlantConfig)
def get_plant(plant_id: str):
    plant = store.get_plant(plant_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant


@app.put("/plants/{plant_id}/demand-schedule", response_model=PlantConfig)
def update_demand_schedule(plant_id: str, schedule: list[DemandPoint]):
    plant = store.update_demand_schedule(plant_id, schedule)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant


# ---------------------------------------------------------------------------
# Forecast (the main endpoint the dashboard will call)
# ---------------------------------------------------------------------------

@app.get("/forecast/{plant_id}", response_model=ForecastResponse)
def get_forecast(plant_id: str, hours: int = 48):
    plant = store.get_plant(plant_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    hours = max(1, min(hours, 72))

    weather_df = weather.fetch_forecast_weather(plant.latitude, plant.longitude, hours)
    pred_df = forecast.predict(weather_df, plant.capacity_mw)

    demand_by_hour = {d.hour_offset: d.demand_mw for d in plant.demand_schedule}

    points = []
    for i in range(len(pred_df)):
        h = int(weather_df.iloc[i]["hour_offset"])
        demand_mw = demand_by_hour.get(h, plant.capacity_mw * 0.5)
        wind = float(weather_df.iloc[i].get("wind_speed_10m", 0))

        result = decision.evaluate_hour(
            p10=float(pred_df.iloc[i]["p10"]),
            p50=float(pred_df.iloc[i]["p50"]),
            demand_mw=demand_mw,
            wind_speed_ms=wind,
        )
        points.append({
            "hour_offset": h,
            "timestamp": weather_df.iloc[i]["time"],
            "p10": round(float(pred_df.iloc[i]["p10"]), 2),
            "p50": round(float(pred_df.iloc[i]["p50"]), 2),
            "p90": round(float(pred_df.iloc[i]["p90"]), 2),
            "demand_mw": demand_mw,
            **result,
        })

    impact = decision.estimate_impact(points)

    return ForecastResponse(
        plant_id=plant_id,
        generated_at=datetime.utcnow(),
        hours_ahead=hours,
        forecast_confidence=impact["forecast_confidence"],
        estimated_savings_inr=impact["estimated_savings_inr"],
        avoided_emissions_tco2=impact["avoided_emissions_tco2"],
        points=[HourlyForecast(**p) for p in points],
    )


# ---------------------------------------------------------------------------
# Mock endpoint — stable, hand-written JSON shape for frontend to build
# against on day one, independent of whether the model is trained yet.
# ---------------------------------------------------------------------------

@app.get("/mock/forecast", response_model=ForecastResponse)
def mock_forecast(hours: int = 48):
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    points = []
    for h in range(hours):
        hour_of_day = (now + timedelta(hours=h)).hour
        daylight = max(0, 1 - abs(hour_of_day - 13) / 7)
        p50 = round(30 * daylight, 2)
        p10 = round(max(0, p50 - 6), 2)
        p90 = round(min(35, p50 + 6), 2)
        demand = 24.0 if 18 <= hour_of_day <= 22 else (18.0 if 6 <= hour_of_day <= 17 else 10.0)

        result = decision.evaluate_hour(p10, p50, demand)
        points.append(HourlyForecast(
            hour_offset=h,
            timestamp=now + timedelta(hours=h),
            p10=p10, p50=p50, p90=p90,
            demand_mw=demand,
            **result,
        ))

    impact = decision.estimate_impact([p.dict() for p in points])
    return ForecastResponse(
        plant_id="plant-demo-001",
        generated_at=now,
        hours_ahead=hours,
        forecast_confidence=impact["forecast_confidence"],
        estimated_savings_inr=impact["estimated_savings_inr"],
        avoided_emissions_tco2=impact["avoided_emissions_tco2"],
        points=points,
    )
