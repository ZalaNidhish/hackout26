"""
In-memory store standing in for MongoDB for now.

Swap this out later for real Mongo (via motor/pymongo) without touching
main.py's route logic much — just replace the functions below with DB calls.
Keeping the storage layer isolated like this is exactly what makes that
swap painless later.
"""
from typing import Dict, List, Optional
from app.models.schemas import PlantConfig, DemandPoint
import itertools

_plants: Dict[str, PlantConfig] = {}
_id_counter = itertools.count(1)


def _default_demand_schedule(hours: int = 72) -> List[DemandPoint]:
    """A simple repeating day/night demand curve, used when a plant
    is created without an explicit schedule."""
    schedule = []
    for h in range(hours):
        hour_of_day = h % 24
        # Higher demand in the evening (18-22h), lower at night
        if 18 <= hour_of_day <= 22:
            demand = 24.0
        elif 6 <= hour_of_day <= 17:
            demand = 18.0
        else:
            demand = 10.0
        schedule.append(DemandPoint(hour_offset=h, demand_mw=demand))
    return schedule


def seed_demo_plant() -> PlantConfig:
    """Creates one demo plant on startup so the API is usable immediately."""
    plant = PlantConfig(
        plant_id="plant-demo-001",
        name="Demo Solar Farm",
        type="solar",
        capacity_mw=35.0,
        latitude=23.0225,   # Ahmedabad, as a placeholder
        longitude=72.5714,
        demand_schedule=_default_demand_schedule(),
    )
    _plants[plant.plant_id] = plant
    return plant


def create_plant(name: str, type_: str, capacity_mw: float,
                  latitude: float, longitude: float,
                  demand_schedule: Optional[List[DemandPoint]] = None) -> PlantConfig:
    plant_id = f"plant-{next(_id_counter):04d}"
    plant = PlantConfig(
        plant_id=plant_id,
        name=name,
        type=type_,
        capacity_mw=capacity_mw,
        latitude=latitude,
        longitude=longitude,
        demand_schedule=demand_schedule or _default_demand_schedule(),
    )
    _plants[plant_id] = plant
    return plant


def get_plant(plant_id: str) -> Optional[PlantConfig]:
    return _plants.get(plant_id)


def list_plants() -> List[PlantConfig]:
    return list(_plants.values())


def update_demand_schedule(plant_id: str, schedule: List[DemandPoint]) -> Optional[PlantConfig]:
    plant = _plants.get(plant_id)
    if not plant:
        return None
    plant.demand_schedule = schedule
    return plant
