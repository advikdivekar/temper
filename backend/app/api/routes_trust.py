"""routes_trust.py

WHAT THIS FILE DOES
    Routes for verifier opinions, sharing with importers and
    verifiers, revoking, and checking the audit log is intact.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import Caller, get_caller, get_session, get_settings, require_role
from app.api.routes_statements import load_readable, summary
from app.api.schemas import OpinionRequest, ShareRequest
from app.models import Organization, ShareGrant, Statement
from app.services import trust
from app.services.audit import verify_chain

router = APIRouter(tags=["trust"])


@router.post("/statements/{statement_id}/opinion")
def give_opinion(
    statement_id: int,
    body: OpinionRequest,
    caller: Caller = Depends(require_role("verifier")),
    session: Session = Depends(get_session),
    settings=Depends(get_settings),
):
    statement = load_readable(session, caller, statement_id)
    try:
        trust.add_opinion(
            session, settings.key_dir, caller.org, statement,
            body.conclusion, body.comments, caller.user.id,
        )
    except (ValueError, PermissionError) as error:
        raise HTTPException(400, str(error))
    return summary(session, statement)


@router.post("/statements/{statement_id}/share")
def share(
    statement_id: int,
    body: ShareRequest,
    caller: Caller = Depends(require_role("supplier")),
    session: Session = Depends(get_session),
):
    statement = load_readable(session, caller, statement_id)
    recipient = session.get(Organization, body.recipient_org_id)
    if recipient is None or recipient.role not in ("importer", "verifier"):
        raise HTTPException(400, "Recipient must be an importer or verifier")
    try:
        grant = trust.grant_share(
            session, caller.org, statement, recipient.id, caller.user.id
        )
    except PermissionError as error:
        raise HTTPException(403, str(error))
    return {"grant_id": grant.id}


@router.post("/shares/{grant_id}/revoke")
def revoke(
    grant_id: int,
    caller: Caller = Depends(require_role("supplier")),
    session: Session = Depends(get_session),
):
    grant = session.get(ShareGrant, grant_id)
    if grant is None:
        raise HTTPException(404, "Grant not found")
    try:
        trust.revoke_share(session, caller.org, grant, caller.user.id)
    except PermissionError as error:
        raise HTTPException(403, str(error))
    return {"revoked": True}


@router.get("/audit/verify")
def audit_verify(
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    bad = verify_chain(session)
    return {"intact": bad is None, "first_bad_entry": bad}
