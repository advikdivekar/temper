"""routes_verify.py

WHAT THIS FILE DOES
    Verification packs: download one for a statement, and check any
    pack on a public page that needs no login.
"""

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import Caller, get_caller, get_session
from app.api.routes_statements import load_readable
from app.services import trust
from app.services.packs import build_pack, verify_pack

router = APIRouter(tags=["verify"])


@router.get("/statements/{statement_id}/pack")
def download_pack(
    statement_id: int,
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    statement = load_readable(session, caller, statement_id)
    if statement.status not in ("signed",) and not statement.signature:
        raise HTTPException(400, "Sign the statement before exporting a pack")
    full = trust.can_read_evidence(session, caller.org, statement)
    return build_pack(session, statement, full)


@router.post("/verify-pack")
def check_pack(
    pack: dict = Body(...),
    session: Session = Depends(get_session),
):
    """Public: anyone can check a pack without an account."""
    try:
        return verify_pack(session, pack)
    except (KeyError, TypeError, ValueError):
        raise HTTPException(400, "This does not look like a Temper pack")
