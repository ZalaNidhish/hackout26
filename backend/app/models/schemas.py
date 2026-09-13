"""
Pydantic models = the API "contract".
Frontend devs can build against these shapes even before the real ML model exists,
because /forecast returns exactly this structure whether the data behind it is
mocked or real.
"""
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional
from datetime import datetime

VALID_PLANT_TYPES = {"solar", "wind"}


# ---------- Auth ----------

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Minimum 6 characters")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Plant configuration ----------

class DemandPoint(BaseModel):
    hour_offset: int = Field(..., description="Hours ahead from now, 0-indexed")
    demand_mw: float


class PlantConfig(BaseModel):
    plant_id: str
    name: str
    type: str = Field(..., description="'solar' or 'wind'")
    capacity_mw: float
    latitude: float
    longitude: float
    demand_schedule: List[DemandPoint] = Field(
        default_factory=list,
        description="Hour-by-hour committed supply, like a PPA schedule",
    )

    model_config = {"from_attributes": True}


class PlantConfigCreate(BaseModel):
    name: str
    type: str
    capacity_mw: float = Field(..., gt=0, le=2000)
    latitude: float
    longitude: float
    demand_schedule: Optional[List[DemandPoint]] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        v = v.lower().strip()
        if v not in VALID_PLANT_TYPES:
            raise ValueError(f"type must be one of {VALID_PLANT_TYPES}")
        return v


# ---------- Forecast ----------

class HourlyForecast(BaseModel):
    hour_offset: int
    timestamp: datetime
    p10: float  # conservative / worst-case estimate (MW)
    p50: float  # expected / median estimate (MW)
    p90: float  # optimistic / best-case estimate (MW)
    demand_mw: float
    status: str  # "shortage" | "surplus" | "normal" | "emergency"
    action: str  # human-readable recommended action
    severe_weather: bool = False


class ForecastResponse(BaseModel):
    plant_id: str
    generated_at: datetime
    hours_ahead: int
    forecast_confidence: str  # "High" | "Medium" | "Low"
    estimated_savings_inr: float
    avoided_emissions_tco2: float
    points: List[HourlyForecast]


# ---------- Misc ----------

class HealthResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    status: str
    model_loaded: bool
