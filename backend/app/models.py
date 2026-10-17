"""models.py

WHAT THIS FILE DOES
    Describes the database tables as Python classes.

TABLES
    Evidence
        A source file (bill, invoice) identified by its SHA256 hash.
    ActivityRecord
        One confirmed quantity, such as 1500 kWh in March, linked to
        the evidence it came from.

CONCEPTS IN THIS FILE
    ORM (object relational mapper)
        Lets us treat table rows as Python objects.
    Append only
        We never edit or delete an ActivityRecord. A correction is a
        new row that points at the row it replaces.
    Bitemporal
        Two clocks per row:
        valid_from and valid_to: the period the fact is about.
        recorded_at: when we learned or stored it.
        This answers audit questions like "what did we believe on
        1 June about March electricity?".
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[int] = mapped_column(primary_key=True)
    sha256: Mapped[str] = mapped_column(String(64), unique=True)
    filename: Mapped[str] = mapped_column(String(255))
    size_bytes: Mapped[int]
    uploaded_at: Mapped[datetime]


class ActivityRecord(Base):
    __tablename__ = "activity_record"

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(50))  # fuel, electricity
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
