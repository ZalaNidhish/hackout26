"""
FastAPI entrypoint.

Run with:
    uvicorn app.main:app --reload --port 8000

Then open http://localhost:8000/docs for interactive Swagger UI.

Auth model: every plant belongs to a user. Register/login to get a JWT,
then send it as `Authorization: Bearer <token>` on every /plants and
/forecast call. /health and /mock/forecast stay public so the frontend
always has something to show even before anyone logs in.

A demo account is auto-seeded on startup: demo@demo.com / demo1234, with
one solar and one wind plant already configured — use it to skip
registration entirely for a quick look.
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.schemas import (
    PlantConfig, PlantConfigCreate, ForecastResponse, HourlyForecast,
    HealthResponse, DemandPoint, UserCreate, UserLogin, Token, UserOut,
)
from app.services import weather, forecast, decision
from app import store
from app.db import get_db, init_db
from app.db_models import User
from app.auth import create_access_token, get_current_user

app = FastAPI(
    title="Renewable Generation Forecasting API",
    description="Forecasts solar/wind output 24-72h ahead and recommends grid actions, per user-owned plant.",
    version="0.2.0",
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
    init_db()
    forecast.load_models()
    db = next(get_db())
    try:
        store.seed_demo_data(db)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Health (public)
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", model_loaded=forecast.models_ready())


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@app.post("/auth/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if store.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = store.create_user(db, payload.email, payload.password)
    token = create_access_token(subject=user.email)
    return Token(access_token=token, user=UserOut.model_validate(user))


@app.post("/auth/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = store.authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token(subject=user.email)
    return Token(access_token=token, user=UserOut.model_validate(user))


@app.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


# ---------------------------------------------------------------------------
# Plant configuration (all require auth, all scoped to the logged-in user)
# ---------------------------------------------------------------------------

@app.get("/plants", response_model=list[PlantConfig])
def list_plants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return store.list_plants(db, current_user.id)


@app.post("/plants", response_model=PlantConfig)
def create_plant(
    payload: PlantConfigCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return store.create_plant(
        db, current_user.id,
        name=payload.name,
        type_=payload.type,
        capacity_mw=payload.capacity_mw,
        latitude=payload.latitude,
        longitude=payload.longitude,
        demand_schedule=payload.demand_schedule,
    )


@app.get("/plants/{plant_id}", response_model=PlantConfig)
def get_plant(
    plant_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plant = store.get_plant(db, plant_id, current_user.id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant


@app.put("/plants/{plant_id}/demand-schedule", response_model=PlantConfig)
def update_demand_schedule(
    plant_id: str,
    schedule: list[DemandPoint],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plant = store.update_demand_schedule(db, plant_id, current_user.id, schedule)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant


# ---------------------------------------------------------------------------
# Forecast (the main endpoint the dashboard calls; requires auth + ownership)
# ---------------------------------------------------------------------------

@app.get("/forecast/{plant_id}", response_model=ForecastResponse)
def get_forecast(
    plant_id: str,
    hours: int = 48,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plant = store.get_plant(db, plant_id, current_user.id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    hours = max(1, min(hours, 72))

    weather_df = weather.fetch_forecast_weather(plant.latitude, plant.longitude, hours)
    pred_df = forecast.predict(weather_df, plant.capacity_mw, plant.type)

    demand_by_hour = {d["hour_offset"]: d["demand_mw"] for d in plant.demand_schedule}

    points = []
    for i in range(len(pred_df)):
        h = int(weather_df.iloc[i]["hour_offset"])
        demand_mw = demand_by_hour.get(h, plant.capacity_mw * 0.3)
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
# Mock endpoint (public, no auth) — stable hand-written JSON shape for
# frontend to build against on day one, independent of login or training.
# ---------------------------------------------------------------------------

@app.get("/mock/forecast", response_model=ForecastResponse)
def mock_forecast(hours: int = 48):
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    mock_capacity = 30.0
    demand_schedule = {d.hour_offset % 24: d.demand_mw for d in store.default_demand_schedule(mock_capacity, 24)}

    points = []
    for h in range(hours):
        hour_of_day = (now + timedelta(hours=h)).hour
        daylight = max(0, 1 - abs(hour_of_day - 13) / 7)
        p50 = round(mock_capacity * daylight, 2)
        p10 = round(max(0, p50 - 6), 2)
        p90 = round(min(mock_capacity, p50 + 6), 2)
        demand = demand_schedule.get(hour_of_day, mock_capacity * 0.3)

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
        plant_id="mock-plant",
        generated_at=now,
        hours_ahead=hours,
        forecast_confidence=impact["forecast_confidence"],
        estimated_savings_inr=impact["estimated_savings_inr"],
        avoided_emissions_tco2=impact["avoided_emissions_tco2"],
        points=points,
    )
