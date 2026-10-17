"""routes_plant.py

WHAT THIS FILE DOES
    Routes a supplier uses to describe its plant and enter data:
    installations, goods, evidence files and activity records.
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import Caller, get_session, get_settings, require_role
from app.api.schemas import (
    CorrectionRequest, GoodRequest, InstallationRequest, RecordRequest,
)
from app.evidence import save_evidence
from app.ledger import add_record, correct_record, records_as_of
from app.models import ActivityRecord, Good, Installation
from app.services.audit import append_audit

router = APIRouter(tags=["plant"])
supplier_only = require_role("supplier")


def own_installation(session, caller, installation_id) -> Installation:
    installation = session.get(Installation, installation_id)
    if installation is None or installation.organization_id != caller.org.id:
        raise HTTPException(404, "Installation not found")
    return installation


@router.post("/installations")
def create_installation(
    body: InstallationRequest,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    installation = Installation(
        organization_id=caller.org.id, name=body.name, country=body.country
    )
    session.add(installation)
    session.commit()
    append_audit(session, caller.user.id, "installation_created",
                 f"installation {installation.id}")
    return {"id": installation.id, "name": installation.name}


@router.get("/installations")
def list_installations(
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    rows = session.scalars(
        select(Installation).where(
            Installation.organization_id == caller.org.id
        )
    ).all()
    return [{"id": i.id, "name": i.name, "country": i.country} for i in rows]


@router.post("/installations/{installation_id}/goods")
def add_good(
    installation_id: int,
    body: GoodRequest,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    own_installation(session, caller, installation_id)
    good = Good(installation_id=installation_id, name=body.name,
                cn_code=body.cn_code)
    session.add(good)
    session.commit()
    return {"id": good.id, "name": good.name, "cn_code": good.cn_code}


@router.post("/evidence")
async def upload_evidence(
    file: UploadFile = File(...),
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
    settings=Depends(get_settings),
):
    data = await file.read()
    record = save_evidence(
        session, settings.evidence_dir, file.filename or "upload", data
    )
    if record.organization_id is None:
        record.organization_id = caller.org.id
        session.commit()
    append_audit(session, caller.user.id, "evidence_uploaded",
                 f"evidence {record.id} sha256 {record.sha256}")
    return {"id": record.id, "sha256": record.sha256}


@router.post("/records")
def create_record(
    body: RecordRequest,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    own_installation(session, caller, body.installation_id)
    record = add_record(
        session, body.kind, body.name, body.amount, body.unit,
        body.valid_from, body.valid_to, body.evidence_id,
        installation_id=body.installation_id,
    )
    append_audit(session, caller.user.id, "record_added",
                 f"record {record.id}")
    return {"id": record.id}


@router.post("/records/{record_id}/correct")
def correct(
    record_id: int,
    body: CorrectionRequest,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    old = session.get(ActivityRecord, record_id)
    if old is None:
        raise HTTPException(404, "Record not found")
    own_installation(session, caller, old.installation_id)
    new = correct_record(session, old, body.new_amount, body.evidence_id)
    append_audit(session, caller.user.id, "record_corrected",
                 f"record {old.id} replaced by {new.id}")
    return {"id": new.id, "supersedes_id": old.id}


@router.get("/installations/{installation_id}/records")
def list_records(
    installation_id: int,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    own_installation(session, caller, installation_id)
    rows = [r for r in records_as_of(session)
            if r.installation_id == installation_id]
    return [
        {"id": r.id, "kind": r.kind, "name": r.name,
         "amount": str(r.amount), "unit": r.unit,
         "valid_from": r.valid_from, "valid_to": r.valid_to,
         "evidence_id": r.evidence_id}
        for r in rows
    ]
