"""trust.py

WHAT THIS FILE DOES
    Everything that makes a statement trustworthy and shareable:
    signing by the supplier, opinions by verifiers, sharing with
    importers, and the check that decides who may read what.

CONCEPTS IN THIS FILE
    Sign a statement
        The supplier signs the statement's content hash. After that
        any change to the content breaks the signature.
    Verification opinion
        An accredited verifier signs a conclusion about a statement.
        Downstream statements only treat upstream data as actual once
        it is signed and has a satisfactory opinion.
    Share grant
        Data is shared only by explicit grant to a named organization,
        and a grant can be revoked.
    Selective disclosure
        Recipients see the result and its status. They never see raw
        records or evidence. Only the owner and its verifier do.
"""

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.accounts import Organization
from app.models.plant import Installation
from app.models.statements import Statement
from app.models.trust import ShareGrant, VerificationOpinion
from app.services import signing
from app.services.audit import append_audit
from app.services.canonical import canonical_bytes


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def owner_org_id(session: Session, statement: Statement) -> int:
    return session.get(Installation, statement.installation_id).organization_id


def sign_statement(
    session: Session, key_dir: Path, org: Organization,
    statement: Statement, actor_user_id: int,
) -> Statement:
    if owner_org_id(session, statement) != org.id:
        raise PermissionError("Only the owner can sign a statement")
    if statement.status != "draft":
        raise ValueError(f"Cannot sign a {statement.status} statement")
    signing.ensure_keypair(key_dir, org)
    statement.signature = signing.sign(
        key_dir, org, statement.content_hash.encode()
    )
    statement.status = "signed"
    statement.signed_at = _now()
    session.commit()
    append_audit(session, actor_user_id, "statement_signed",
                 f"statement {statement.id}")
    return statement


def signature_is_valid(session: Session, statement: Statement) -> bool:
    org = session.get(Organization, owner_org_id(session, statement))
    if not statement.signature or not org.public_key:
        return False
    return signing.verify(
        org.public_key, statement.content_hash.encode(), statement.signature
    )


def add_opinion(
    session: Session, key_dir: Path, verifier: Organization,
    statement: Statement, conclusion: str, comments: str,
    actor_user_id: int,
) -> VerificationOpinion:
    if verifier.role != "verifier":
        raise PermissionError("Only verifiers can give opinions")
    if statement.status != "signed":
        raise ValueError("Statement must be signed before verification")
    if conclusion not in ("satisfactory", "unsatisfactory"):
        raise ValueError("Conclusion must be satisfactory or unsatisfactory")
    signing.ensure_keypair(key_dir, verifier)
    signed_at = _now()
    message = canonical_bytes(
        {"statement": statement.content_hash, "conclusion": conclusion,
         "comments": comments, "signed_at": signed_at}
    )
    opinion = VerificationOpinion(
        statement_id=statement.id,
        verifier_org_id=verifier.id,
        conclusion=conclusion,
        comments=comments,
        signed_at=signed_at,
        signature=signing.sign(key_dir, verifier, message),
    )
    session.add(opinion)
    session.commit()
    append_audit(session, actor_user_id, "opinion_added",
                 f"statement {statement.id}: {conclusion}")
    return opinion


def grant_share(
    session: Session, org: Organization, statement: Statement,
    recipient_org_id: int, actor_user_id: int,
) -> ShareGrant:
    if owner_org_id(session, statement) != org.id:
        raise PermissionError("Only the owner can share a statement")
    grant = ShareGrant(
        statement_id=statement.id,
        recipient_org_id=recipient_org_id,
        granted_at=_now(),
    )
    session.add(grant)
    session.commit()
    append_audit(session, actor_user_id, "share_granted",
                 f"statement {statement.id} to org {recipient_org_id}")
    return grant


def revoke_share(
    session: Session, org: Organization, grant: ShareGrant,
    actor_user_id: int,
) -> ShareGrant:
    statement = session.get(Statement, grant.statement_id)
    if owner_org_id(session, statement) != org.id:
        raise PermissionError("Only the owner can revoke a share")
    grant.revoked_at = _now()
    session.commit()
    append_audit(session, actor_user_id, "share_revoked",
                 f"grant {grant.id}")
    return grant


def can_read_summary(
    session: Session, org: Organization, statement: Statement
) -> bool:
    """Owner, or an organization with an active grant, or an admin."""
    if org.role == "admin" or owner_org_id(session, statement) == org.id:
        return True
    grant = session.scalars(
        select(ShareGrant).where(
            ShareGrant.statement_id == statement.id,
            ShareGrant.recipient_org_id == org.id,
            ShareGrant.revoked_at.is_(None),
        )
    ).first()
    return grant is not None


def can_read_evidence(
    session: Session, org: Organization, statement: Statement
) -> bool:
    """Only the owner, an admin, or a verifier granted access."""
    if org.role == "admin" or owner_org_id(session, statement) == org.id:
        return True
    return org.role == "verifier" and can_read_summary(
        session, org, statement
    )
