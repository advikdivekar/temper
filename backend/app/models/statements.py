"""statements.py

WHAT THIS FILE DOES
    Tables for emissions statements and how they link together.

TABLES
    Statement     the result of one engine run for an installation and
                  a period. Stores the inputs hash, the result and the
                  trace so any run can be explained later.
    PrecursorRef  a link from a statement to what it used for a
                  precursor: another company's statement, or a default.

CONCEPTS
    Status          draft, stale, signed. A statement turns stale when
                    something it depends on changes.
    Version chain   a recalculation creates a new Statement whose
                    supersedes_id points to the previous one.
    Dependency graph PrecursorRef rows make statements form a directed
                    acyclic graph across companies. A cycle would make
                    a statement depend on itself, so it is refused.
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, JSON, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Statement(Base):
    __tablename__ = "statement"

    id: Mapped[int] = mapped_column(primary_key=True)
    installation_id: Mapped[int] = mapped_column(ForeignKey("installation.id"))
    period_start: Mapped[date]
    period_end: Mapped[date]
    methodology: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    inputs_hash: Mapped[str] = mapped_column(String(64))
    total_tco2: Mapped[Decimal] = mapped_column(Numeric(20, 6))
    see_by_product: Mapped[dict] = mapped_column(JSON)
    trace: Mapped[list] = mapped_column(JSON)
    breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime]
    supersedes_id: Mapped[int | None] = mapped_column(
        ForeignKey("statement.id"), default=None
    )
    content_hash: Mapped[str | None] = mapped_column(String(64), default=None)
    signature: Mapped[str | None] = mapped_column(String(200), default=None)
    signed_at: Mapped[datetime | None] = mapped_column(default=None)


class PrecursorRef(Base):
    __tablename__ = "precursor_ref"

    id: Mapped[int] = mapped_column(primary_key=True)
    statement_id: Mapped[int] = mapped_column(ForeignKey("statement.id"))
    material_name: Mapped[str] = mapped_column(String(100))
    tonnes_used: Mapped[Decimal] = mapped_column(Numeric(20, 6))
    upstream_statement_id: Mapped[int | None] = mapped_column(
        ForeignKey("statement.id"), default=None
    )
    upstream_product: Mapped[str | None] = mapped_column(
        String(200), default=None
    )
    upstream_hash: Mapped[str | None] = mapped_column(
        String(64), default=None
    )
    default_value_id: Mapped[int | None] = mapped_column(
        ForeignKey("default_value.id"), default=None
    )
