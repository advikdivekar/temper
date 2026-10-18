"""document_read.py

WHAT THIS FILE DOES
    One table: DocumentRead, the reader's attempt to read one uploaded
    document, and what the person decided about it.

CONCEPTS IN THIS FILE
    Suggestion
        What the AI reader proposed. It is only a suggestion: nothing
        reaches the ledger until a person confirms it.
    Correction record
        We keep the original suggestion next to what the person
        confirmed. When they differ, that pair is a labelled example
        of a mistake, which is the data preference tuning needs later.
    Status
        pending (waiting for a person), confirmed (became a ledger
        record) or rejected (the person threw it away).
"""

from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DocumentRead(Base):
    __tablename__ = "document_read"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organization.id"))
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    doc_type: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    model_name: Mapped[str] = mapped_column(String(100), default="")
    source_text: Mapped[str] = mapped_column(Text)
    # JSON text: the reader's fields, and the suggested ledger record.
    suggested_json: Mapped[str] = mapped_column(Text)
    needs_review: Mapped[bool] = mapped_column(default=True)
    # JSON text: what the person confirmed, and whether it differed.
    confirmed_json: Mapped[str | None] = mapped_column(Text, default=None)
    corrected: Mapped[bool | None] = mapped_column(default=None)
    record_id: Mapped[int | None] = mapped_column(
        ForeignKey("activity_record.id"), default=None
    )
    created_at: Mapped[datetime]
    decided_at: Mapped[datetime | None] = mapped_column(default=None)
