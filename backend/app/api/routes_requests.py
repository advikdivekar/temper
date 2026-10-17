"""routes_requests.py

WHAT THIS FILE DOES
    Data requests between organizations: ask a supplier to share or
    verify something, see what others asked of you, and mark requests
    done. This is the supplier invitation loop in the product.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import Caller, get_caller, get_session
from app.models import DataRequest, Organization
from app.services.audit import append_audit

router = APIRouter(prefix="/requests", tags=["requests"])


class NewRequest(BaseModel):
    to_org_id: int
    statement_id: int | None = None
    kind: str = "share"
    message: str = ""


def _row(session, r: DataRequest, me: int) -> dict:
    other_id = r.to_org_id if r.from_org_id == me else r.from_org_id
    other = session.get(Organization, other_id)
    return {
        "id": r.id, "direction": "outgoing" if r.from_org_id == me else "incoming",
        "other": other.name, "other_role": other.role, "kind": r.kind,
        "message": r.message, "status": r.status, "statement_id": r.statement_id,
        "created_at": r.created_at, "resolved_at": r.resolved_at,
    }


@router.get("")
def list_requests(
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    me = caller.org.id
    rows = session.scalars(
        select(DataRequest)
        .where(or_(DataRequest.from_org_id == me, DataRequest.to_org_id == me))
        .order_by(DataRequest.id.desc())
    ).all()
    return [_row(session, r, me) for r in rows]


@router.post("")
def create_request(
    body: NewRequest,
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    target = session.get(Organization, body.to_org_id)
    if target is None or target.id == caller.org.id:
        raise HTTPException(400, "Pick another organization")
    row = DataRequest(
        from_org_id=caller.org.id, to_org_id=target.id,
        statement_id=body.statement_id, kind=body.kind, message=body.message,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    session.add(row)
    session.commit()
    append_audit(session, caller.user.id, "request_sent", f"to {target.name}")
    return _row(session, row, caller.org.id)


@router.post("/{request_id}/resolve")
def resolve(
    request_id: int,
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    row = session.get(DataRequest, request_id)
    if row is None or caller.org.id not in (row.from_org_id, row.to_org_id):
        raise HTTPException(404, "Request not found")
    row.status = "resolved"
    row.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.commit()
    append_audit(session, caller.user.id, "request_resolved", f"request {row.id}")
    return _row(session, row, caller.org.id)
