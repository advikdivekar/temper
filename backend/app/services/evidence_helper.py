"""evidence_helper.py

Small helper that creates a placeholder evidence file. Used by tests
and demo seeding where a real uploaded bill is not needed.
"""

from pathlib import Path

from sqlalchemy.orm import Session

from app.evidence import save_evidence


def make_evidence(session: Session, store_dir: Path):
    return save_evidence(
        session, store_dir / "evidence", "demo_bill.txt", b"demo bill"
    )
