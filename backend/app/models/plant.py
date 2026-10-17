"""plant.py

WHAT THIS FILE DOES
    Tables describing a factory and the data collected about it.

TABLES
    Installation    a production site. The unit CBAM monitors.
    Good            a product made at an installation, with its CN code
                    (the EU customs classification).
    Evidence        a source file identified by its SHA256 hash.
    ActivityRecord  one confirmed quantity (fuel, electricity, output).

CONCEPTS
    Append only: ActivityRecords are never edited. A correction is a new
    row whose supersedes_id points at the old row.
    Bitemporal: valid_from and valid_to say which period the fact is
    about. recorded_at says when we stored it.
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Installation(Base):
    __tablename__ = "installation"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organization.id"))
    name: Mapped[str] = mapped_column(String(200))
    country: Mapped[str] = mapped_column(String(2), default="IN")


class Good(Base):
    __tablename__ = "good"

    id: Mapped[int] = mapped_column(primary_key=True)
    installation_id: Mapped[int] = mapped_column(ForeignKey("installation.id"))
    name: Mapped[str] = mapped_column(String(200))
    cn_code: Mapped[str] = mapped_column(String(10))


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int | None] = mapped_column(
        ForeignKey("organization.id"), default=None
    )
    sha256: Mapped[str] = mapped_column(String(64), unique=True)
    filename: Mapped[str] = mapped_column(String(255))
    size_bytes: Mapped[int]
    uploaded_at: Mapped[datetime]


class ActivityRecord(Base):
    __tablename__ = "activity_record"

    id: Mapped[int] = mapped_column(primary_key=True)
    installation_id: Mapped[int | None] = mapped_column(
        ForeignKey("installation.id"), default=None
    )
    kind: Mapped[str] = mapped_column(String(50))  # fuel, electricity, output
    name: Mapped[str] = mapped_column(String(100))
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 6))
    unit: Mapped[str] = mapped_column(String(20))
    valid_from: Mapped[date]
    valid_to: Mapped[date]
    recorded_at: Mapped[datetime]
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    supersedes_id: Mapped[int | None] = mapped_column(
        ForeignKey("activity_record.id"), default=None
    )
