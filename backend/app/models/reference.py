"""reference.py

WHAT THIS FILE DOES
    Tables for reference numbers loaded from data/ files.

TABLES
    EmissionFactorRow  e.g. coal: 2.4 tCO2 per tonne. Versioned.
    DefaultValueRow    the EU default per CN code and country, with the
                       edition it came from.

Rows are only ever added. A new edition is a new version string.
"""

from decimal import Decimal

from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmissionFactorRow(Base):
    __tablename__ = "emission_factor"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    value: Mapped[Decimal] = mapped_column(Numeric(20, 8))
    per_unit: Mapped[str] = mapped_column(String(20))
    source: Mapped[str] = mapped_column(String(600))
    version: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30), default="unverified")


class DefaultValueRow(Base):
    __tablename__ = "default_value"

    id: Mapped[int] = mapped_column(primary_key=True)
    cn_code: Mapped[str] = mapped_column(String(12))
    country: Mapped[str] = mapped_column(String(10))
    base_tco2_per_tonne: Mapped[Decimal] = mapped_column(Numeric(20, 8))
    source: Mapped[str] = mapped_column(String(600))
    version: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[str] = mapped_column(String(30), default="unverified")
    route: Mapped[str] = mapped_column(String(20), default="")
