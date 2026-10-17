"""database.py

WHAT THIS FILE DOES
    Creates the database connection and the session factory.

CONCEPTS IN THIS FILE
    Engine
        SQLAlchemy's connection to the database.
    Session
        One unit of work: you read and write rows, then commit.
    Base
        The parent class all table classes inherit from.
    SQLite versus Postgres
        We use SQLite (a single file) while learning. Changing the URL
        to a Postgres address later needs no other code change.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DEFAULT_URL = "sqlite:///temper.db"


class Base(DeclarativeBase):
    """Parent of every table class."""


def make_session_factory(url: str = DEFAULT_URL):
    """Build the tables if needed and return a session factory."""
    engine = create_engine(url)
    Base.metadata.create_all(engine)
    return sessionmaker(engine)
