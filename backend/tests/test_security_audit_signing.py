"""test_security_audit_signing.py

Checks passwords, the audit hash chain, and signatures.
"""

from app.database import make_session_factory
from app.models import Organization
from app.security import hash_password, verify_password
from app.services import signing
from app.services.audit import append_audit, verify_chain


def test_password_roundtrip():
    stored = hash_password("secret")
    assert verify_password("secret", stored)
    assert not verify_password("wrong", stored)


def test_audit_chain_detects_edit():
    session = make_session_factory("sqlite://")()
    for i in range(3):
        append_audit(session, 1, "action", f"detail {i}")
    assert verify_chain(session) is None

    from app.models import AuditEntry
    entry = session.get(AuditEntry, 2)
    entry.detail = "changed"
    session.commit()
    assert verify_chain(session) == 2


def test_signature_valid_and_tamper_detected(tmp_path):
    session = make_session_factory("sqlite://")()
    org = Organization(name="Acme", role="supplier")
    session.add(org)
    session.commit()

    public = signing.ensure_keypair(tmp_path, org)
    signature = signing.sign(tmp_path, org, b"statement")
    assert signing.verify(public, b"statement", signature)
    assert not signing.verify(public, b"statement changed", signature)
