"""requests.py

WHAT THIS FILE DOES
    The DataRequest table: one organization asking another for data.

WHY IT EXISTS
    Real supply chains run on requests. A bolt maker asks its mill to
    verify a statement. An importer asks a supplier to share one. A
    request is a small durable record with a status, so it can show up
    in an inbox and be resolved, instead of living in email.
"""

from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DataRequest(Base):
    __tablename__ = "data_request"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_org_id: Mapped[int] = mapped_column(ForeignKey("organization.id"))
    to_org_id: Mapped[int] = mapped_column(ForeignKey("organization.id"))
    statement_id: Mapped[int | None] = mapped_column(
        ForeignKey("statement.id"), default=None
    )
    kind: Mapped[str] = mapped_column(String(30), default="share")
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_at: Mapped[datetime]
    resolved_at: Mapped[datetime | None] = mapped_column(default=None)
