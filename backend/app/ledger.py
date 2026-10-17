"""ledger.py

WHAT THIS FILE DOES
    The only place that writes ActivityRecords. Offers three actions:
    add a record, correct a record, and read the records as they stood
    at any moment.

CONCEPTS IN THIS FILE
    Append only ledger
        Rows are added, never edited or deleted. History is permanent.
    Correction
        Fixing a wrong value adds a new row whose supersedes_id points
        at the old row. The old row stays, but is no longer current.
    As of query
        "Show me the data as we knew it at time T." We keep rows
        recorded on or before T, and drop any row that a newer row
        (also recorded on or before T) has replaced.
"""

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.plant import ActivityRecord


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def add_record(
    session: Session,
    kind: str,
    name: str,
    amount: Decimal,
    unit: str,
    valid_from: date,
    valid_to: date,
    evidence_id: int,
    recorded_at: datetime | None = None,
    installation_id: int | None = None,
) -> ActivityRecord:
    """Append a new confirmed record."""
    record = ActivityRecord(
        installation_id=installation_id,
        kind=kind,
        name=name,
        amount=amount,
        unit=unit,
        valid_from=valid_from,
        valid_to=valid_to,
        recorded_at=recorded_at or _now(),
        evidence_id=evidence_id,
    )
    session.add(record)
    session.commit()
    return record


def correct_record(
    session: Session,
    old: ActivityRecord,
    new_amount: Decimal,
    evidence_id: int,
    recorded_at: datetime | None = None,
) -> ActivityRecord:
    """Append a replacement for old. The old row is left untouched."""
    record = ActivityRecord(
        installation_id=old.installation_id,
        kind=old.kind,
        name=old.name,
        amount=new_amount,
        unit=old.unit,
        valid_from=old.valid_from,
        valid_to=old.valid_to,
        recorded_at=recorded_at or _now(),
        evidence_id=evidence_id,
        supersedes_id=old.id,
    )
    session.add(record)
    session.commit()
    return record


def records_as_of(
    session: Session, moment: datetime | None = None
) -> list[ActivityRecord]:
    """Return the records that were current at the given moment."""
    moment = moment or _now()
    known = session.scalars(
        select(ActivityRecord).where(ActivityRecord.recorded_at <= moment)
    ).all()

    replaced_ids = {r.supersedes_id for r in known if r.supersedes_id}
    return [r for r in known if r.id not in replaced_ids]
