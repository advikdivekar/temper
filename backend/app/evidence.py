"""evidence.py

WHAT THIS FILE DOES
    Stores uploaded source files under their content hash and records
    them in the database.

CONCEPTS IN THIS FILE
    SHA256 hash
        A fingerprint of a file's bytes. Change one byte and the
        fingerprint changes completely. Two identical files share one
        fingerprint.
    Content addressed storage
        The file is saved under its hash. So the name proves the
        content: if the stored bytes do not hash to the name, the file
        was tampered with. Auditors rely on this.
    Deduplication
        Uploading the same bill twice stores it once.
"""

import hashlib
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Evidence


def hash_bytes(data: bytes) -> str:
    """Return the SHA256 fingerprint of some bytes as hex text."""
    return hashlib.sha256(data).hexdigest()


def save_evidence(
    session: Session, store_dir: Path, filename: str, data: bytes
) -> Evidence:
    """Save a file by hash and return its database record."""
    digest = hash_bytes(data)

    existing = session.scalar(
        select(Evidence).where(Evidence.sha256 == digest)
    )
    if existing:
        return existing

    store_dir.mkdir(parents=True, exist_ok=True)
    (store_dir / digest).write_bytes(data)

    record = Evidence(
        sha256=digest,
        filename=filename,
        size_bytes=len(data),
        uploaded_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    session.add(record)
    session.commit()
    return record


def verify_evidence(store_dir: Path, record: Evidence) -> bool:
    """Check the stored file still matches its recorded hash."""
    path = store_dir / record.sha256
    if not path.exists():
        return False
    return hash_bytes(path.read_bytes()) == record.sha256
