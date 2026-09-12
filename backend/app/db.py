"""
Database setup.

SQLite by default (zero-config, file-based, survives restarts unlike the old
in-memory dict) — plenty for a hackathon demo. Swap DATABASE_URL to a
Postgres connection string later (e.g. on Render) with no code changes
elsewhere; SQLAlchemy abstracts the difference.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(os.path.dirname(__file__), "data", "app.db"),
)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a session, always closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Creates tables if they don't exist yet. Safe to call every startup."""
    from app import db_models  # noqa: F401 (ensures models are registered on Base)
    Base.metadata.create_all(bind=engine)
