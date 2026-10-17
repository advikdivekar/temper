"""audit.py

WHAT THIS FILE DOES
    A tamper evident log of everything important that happens.

CONCEPTS IN THIS FILE
    Hash chain
        Each entry stores the hash of the entry before it, and its own
        hash covers that value. Edit or delete an old entry and every
        later hash stops matching. verify_chain finds the break.
    Genesis
        The first entry has no predecessor, so it uses 64 zeros.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.trust import AuditEntry
from app.services.canonical import canonical_hash

GENESIS = "0" * 64


def _entry_hash(entry: AuditEntry) -> str:
    return canonical_hash(
        {
            "created_at": entry.created_at,
            "actor": entry.actor_user_id,
            "action": entry.action,
            "detail": entry.detail,
            "prev": entry.prev_hash,
        }
    )


def append_audit(
    session: Session, actor_user_id: int | None, action: str, detail: str = ""
) -> AuditEntry:
    last = session.scalars(
        select(AuditEntry).order_by(AuditEntry.id.desc()).limit(1)
    ).first()
    entry = AuditEntry(
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        actor_user_id=actor_user_id,
        action=action,
        detail=detail,
        prev_hash=last.entry_hash if last else GENESIS,
        entry_hash="",
    )
    entry.entry_hash = _entry_hash(entry)
    session.add(entry)
    session.commit()
    return entry


def verify_chain(session: Session) -> int | None:
    """Return None if the chain is intact, else the first bad entry id."""
    previous = GENESIS
    entries = session.scalars(select(AuditEntry).order_by(AuditEntry.id))
    for entry in entries:
        if entry.prev_hash != previous or entry.entry_hash != _entry_hash(
            entry
        ):
            return entry.id
        previous = entry.entry_hash
    return None
