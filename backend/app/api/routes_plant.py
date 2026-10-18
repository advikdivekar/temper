"""routes_plant.py

WHAT THIS FILE DOES
    Routes a supplier uses to describe its plant and enter data:
    installations, goods, evidence files and activity records.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import Caller, get_session, get_settings, require_role
from app.api.schemas import (
    CorrectionRequest, GoodRequest, InstallationRequest, RecordRequest,
)
from app.evidence import save_evidence, verify_evidence
from app.ledger import add_record, correct_record, records_as_of
from app.models import ActivityRecord, Evidence, Good, Installation
from app.services import ocr
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
    return {"id": record.id, "sha256": record.sha256,
            "filename": record.filename, "size_bytes": record.size_bytes}


@router.get("/evidence")
def list_evidence(
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    """Your evidence vault: every file with its fingerprint and use."""
    rows = session.scalars(
        select(Evidence).where(Evidence.organization_id == caller.org.id)
        .order_by(Evidence.id.desc())
    ).all()
    result = []
    for e in rows:
        used = len(session.scalars(
            select(ActivityRecord).where(ActivityRecord.evidence_id == e.id)
        ).all())
        result.append({
            "id": e.id, "filename": e.filename, "sha256": e.sha256,
            "size_bytes": e.size_bytes, "uploaded_at": e.uploaded_at,
            "used_by_records": used,
        })
    return result


@router.post("/evidence/{evidence_id}/verify")
def verify_evidence_file(
    evidence_id: int,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
    settings=Depends(get_settings),
):
    """Re-hash the stored file and compare it with its recorded hash."""
    record = session.get(Evidence, evidence_id)
    if record is None or record.organization_id != caller.org.id:
        raise HTTPException(404, "Evidence not found")
    ok = verify_evidence(settings.evidence_dir, record)
    append_audit(session, caller.user.id, "evidence_verified",
                 f"evidence {record.id}: {'intact' if ok else 'MISMATCH'}")
    return {"id": record.id, "sha256": record.sha256, "intact": ok}


@router.post("/records")
def create_record(
    body: RecordRequest,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    own_installation(session, caller, body.installation_id)
    if body.kind == "output" and body.cn_code:
        # Remember the customs code of each product, so the EU default
        # for that product can be looked up later.
        good = session.scalar(
            select(Good).where(Good.installation_id == body.installation_id,
                               Good.name == body.name)
        )
        if good is None:
            session.add(Good(installation_id=body.installation_id,
                             name=body.name, cn_code=body.cn_code.replace(" ", "")))
        else:
            good.cn_code = body.cn_code.replace(" ", "")
        session.commit()
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


def _record_json(r: ActivityRecord) -> dict:
    return {"id": r.id, "kind": r.kind, "name": r.name,
            "amount": str(r.amount), "unit": r.unit,
            "valid_from": r.valid_from, "valid_to": r.valid_to,
            "evidence_id": r.evidence_id, "recorded_at": r.recorded_at,
            "supersedes_id": r.supersedes_id}


@router.get("/installations/{installation_id}/records")
def list_records(
    installation_id: int,
    as_of: datetime | None = None,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    """The ledger as it stood at a moment (default: now).

    Passing as_of is "time travel": you see exactly what the records
    said on that date, before any later corrections.
    """
    own_installation(session, caller, installation_id)
    rows = [r for r in records_as_of(session, as_of)
            if r.installation_id == installation_id]
    return [_record_json(r) for r in rows]


@router.get("/installations/{installation_id}/ledger")
def ledger_history(
    installation_id: int,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    """Every row ever written, including superseded ones, oldest first."""
    own_installation(session, caller, installation_id)
    rows = session.scalars(
        select(ActivityRecord)
        .where(ActivityRecord.installation_id == installation_id)
        .order_by(ActivityRecord.id)
    ).all()
    return [_record_json(r) for r in rows]


SHOWN_AS = {"pdf": "application/pdf", "png": "image/png",
            "jpg": "image/jpeg", "tif": "image/tiff", "text": "text/plain"}


@router.get("/evidence/{evidence_id}/file")
def evidence_file(
    evidence_id: int,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
    settings=Depends(get_settings),
):
    """The original file, so a person can check a reading against it.
    The type comes from the bytes, never from the uploaded name, and
    nosniff stops the browser from guessing something riskier."""
    record = session.get(Evidence, evidence_id)
    if record is None or record.organization_id != caller.org.id:
        raise HTTPException(404, "Evidence not found")
    data = (settings.evidence_dir / record.sha256).read_bytes()
    return Response(data, media_type=SHOWN_AS[ocr.file_kind(data)],
                    headers={"X-Content-Type-Options": "nosniff"})
