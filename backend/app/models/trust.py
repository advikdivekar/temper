"""trust.py

WHAT THIS FILE DOES
    Tables that make statements trustworthy and shareable.

TABLES
    ShareGrant           permission for one organization to read one
                         statement. Can be revoked.
    VerificationOpinion  a verifier's signed conclusion on a statement.
    AuditEntry           one line of the tamper evident audit log. Each
                         entry stores the hash of the previous entry, so
                         changing any old entry breaks every later hash.
"""

from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ShareGrant(Base):
    __tablename__ = "share_grant"

    id: Mapped[int] = mapped_column(primary_key=True)
    statement_id: Mapped[int] = mapped_column(ForeignKey("statement.id"))
    recipient_org_id: Mapped[int] = mapped_column(ForeignKey("organization.id"))
    granted_at: Mapped[datetime]
    revoked_at: Mapped[datetime | None] = mapped_column(default=None)


class VerificationOpinion(Base):
    __tablename__ = "verification_opinion"

    id: Mapped[int] = mapped_column(primary_key=True)
    statement_id: Mapped[int] = mapped_column(ForeignKey("statement.id"))
    verifier_org_id: Mapped[int] = mapped_column(ForeignKey("organization.id"))
    conclusion: Mapped[str] = mapped_column(String(20))  # satisfactory etc
    comments: Mapped[str] = mapped_column(Text, default="")
    signed_at: Mapped[datetime]
    signature: Mapped[str] = mapped_column(String(200))


class AuditEntry(Base):
    __tablename__ = "audit_entry"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime]
    actor_user_id: Mapped[int | None] = mapped_column(default=None)
    action: Mapped[str] = mapped_column(String(100))
    detail: Mapped[str] = mapped_column(Text, default="")
    prev_hash: Mapped[str] = mapped_column(String(64))
    entry_hash: Mapped[str] = mapped_column(String(64))
