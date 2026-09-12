"""
ORM models. Kept deliberately simple:
- Plant.demand_schedule is stored as a JSON string (not a separate table) —
  it's always read/written as a whole list, so a join table would just add
  complexity without a real benefit here.
"""
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    plants = relationship("Plant", back_populates="owner", cascade="all, delete-orphan")


class Plant(Base):
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(String, unique=True, index=True, nullable=False)  # public string id, e.g. "plant-0007"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "solar" or "wind"
    capacity_mw = Column(Float, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    demand_schedule_json = Column(Text, nullable=False, default="[]")

    owner = relationship("User", back_populates="plants")

    @property
    def demand_schedule(self):
        return json.loads(self.demand_schedule_json)

    @demand_schedule.setter
    def demand_schedule(self, value):
        # value: list of {"hour_offset": int, "demand_mw": float}
        self.demand_schedule_json = json.dumps(value)
