"""
DB-backed plant + user storage (SQLite via SQLAlchemy, see app/db.py).

Replaces the old in-memory dict from the first version of this backend —
that version reset every restart and had no concept of ownership. Every
plant now belongs to a user, and nothing here is wiped by a redeploy.
"""
import itertools
from typing import List, Optional
from sqlalchemy.orm import Session

from app.db_models import User, Plant
from app.models.schemas import DemandPoint
from app.auth import hash_password, verify_password

_id_counter = itertools.count(1)


# ---------------------------------------------------------------------------
# Demand schedule generation
# ---------------------------------------------------------------------------

def default_demand_schedule(capacity_mw: float, hours: int = 72) -> List[DemandPoint]:
    """
    A repeating 24h demand curve, scaled to the plant's capacity, shaped like
    a real "duck curve": near-zero commitment overnight (no PPA would commit
    solar/wind to hours it structurally can't cover), a midday commitment
    set BELOW likely clear-day output (so the platform can genuinely show
    "surplus -> charge storage / curtail"), and a high evening ramp when
    generation is falling but grid demand peaks — the shortage window this
    platform exists to flag.

    Fractions of capacity_mw (not fixed MW), so it stays sensible regardless
    of what capacity a user enters.
    """
    hourly_fraction = {
        0: 0.0, 1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0, 5: 0.0,
        6: 0.10, 7: 0.14, 8: 0.18,
        9: 0.28, 10: 0.30, 11: 0.30, 12: 0.30, 13: 0.30,
        14: 0.30, 15: 0.28,
        16: 0.35, 17: 0.45,
        18: 0.65, 19: 0.70, 20: 0.65, 21: 0.55,
        22: 0.15, 23: 0.05,
    }
    schedule = []
    for h in range(hours):
        hour_of_day = h % 24
        demand = round(capacity_mw * hourly_fraction[hour_of_day], 2)
        schedule.append(DemandPoint(hour_offset=h, demand_mw=demand))
    return schedule


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, email: str, password: str) -> User:
    user = User(email=email, hashed_password=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


# ---------------------------------------------------------------------------
# Plants (all scoped to a user)
# ---------------------------------------------------------------------------

def _next_plant_id(db: Session) -> str:
    while True:
        candidate = f"plant-{next(_id_counter):04d}"
        if not db.query(Plant).filter(Plant.plant_id == candidate).first():
            return candidate


def create_plant(
    db: Session, user_id: int, name: str, type_: str, capacity_mw: float,
    latitude: float, longitude: float,
    demand_schedule: Optional[List[DemandPoint]] = None,
) -> Plant:
    schedule = demand_schedule or default_demand_schedule(capacity_mw)
    plant = Plant(
        plant_id=_next_plant_id(db),
        user_id=user_id,
        name=name,
        type=type_,
        capacity_mw=capacity_mw,
        latitude=latitude,
        longitude=longitude,
    )
    plant.demand_schedule = [d.model_dump() if hasattr(d, "model_dump") else d for d in schedule]
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant


def list_plants(db: Session, user_id: int) -> List[Plant]:
    return db.query(Plant).filter(Plant.user_id == user_id).all()


def get_plant(db: Session, plant_id: str, user_id: int) -> Optional[Plant]:
    """Ownership-checked lookup — a user can never fetch another user's plant
    by guessing its id."""
    return (
        db.query(Plant)
        .filter(Plant.plant_id == plant_id, Plant.user_id == user_id)
        .first()
    )


def update_demand_schedule(
    db: Session, plant_id: str, user_id: int, schedule: List[DemandPoint]
) -> Optional[Plant]:
    plant = get_plant(db, plant_id, user_id)
    if not plant:
        return None
    plant.demand_schedule = [d.model_dump() if hasattr(d, "model_dump") else d for d in schedule]
    db.commit()
    db.refresh(plant)
    return plant


# ---------------------------------------------------------------------------
# Demo seed data — lets judges log in immediately without registering
# ---------------------------------------------------------------------------

DEMO_EMAIL = "demo@demo.com"
DEMO_PASSWORD = "demo1234"


def seed_demo_data(db: Session):
    """Creates a demo user with one solar + one wind plant, only if it
    doesn't already exist. Safe to call on every startup."""
    user = get_user_by_email(db, DEMO_EMAIL)
    if not user:
        user = create_user(db, DEMO_EMAIL, DEMO_PASSWORD)

    existing = list_plants(db, user.id)
    if not existing:
        create_plant(
            db, user.id,
            name="Demo Solar Farm", type_="solar", capacity_mw=35.0,
            latitude=23.0225, longitude=72.5714,  # Ahmedabad
        )
        create_plant(
            db, user.id,
            name="Demo Wind Farm", type_="wind", capacity_mw=50.0,
            latitude=23.5, longitude=69.5,  # Kutch, a real wind-heavy region in Gujarat
        )
    return user
