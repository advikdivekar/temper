"""test_ledger.py

Checks the append only behaviour, corrections and as of queries.
"""

from datetime import date, datetime
from decimal import Decimal

from app.database import make_session_factory
from app.evidence import save_evidence, verify_evidence
from app.ledger import add_record, correct_record, records_as_of


def make_session():
    return make_session_factory("sqlite://")()


def test_same_file_is_stored_once(tmp_path):
    session = make_session()
    first = save_evidence(session, tmp_path, "a.pdf", b"bill")
    second = save_evidence(session, tmp_path, "b.pdf", b"bill")
    assert first.id == second.id


def test_tampered_file_fails_verification(tmp_path):
    session = make_session()
    record = save_evidence(session, tmp_path, "a.pdf", b"bill")
    assert verify_evidence(tmp_path, record)
    (tmp_path / record.sha256).write_bytes(b"changed")
    assert not verify_evidence(tmp_path, record)


def test_correction_keeps_old_row_and_changes_current_view(tmp_path):
    session = make_session()
    ev = save_evidence(session, tmp_path, "a.pdf", b"bill")
    march = (date(2026, 3, 1), date(2026, 3, 31))

    old = add_record(
        session, "electricity", "grid", Decimal("1500"), "kwh",
        *march, ev.id, recorded_at=datetime(2026, 4, 1),
    )
    correct_record(
        session, old, Decimal("1800"), ev.id,
        recorded_at=datetime(2026, 6, 1),
    )

    now_view = records_as_of(session, datetime(2026, 7, 1))
    assert [r.amount for r in now_view] == [Decimal("1800")]

    past_view = records_as_of(session, datetime(2026, 5, 1))
    assert [r.amount for r in past_view] == [Decimal("1500")]
