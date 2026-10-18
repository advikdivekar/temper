"""routes_reader.py

WHAT THIS FILE DOES
    Routes for the AI reader: read an uploaded document, list the
    suggestions waiting for a person, and confirm or reject them.

THE RULE
    The reader suggests. A person confirms. Only a confirmed
    suggestion becomes an ActivityRecord in the ledger, with the
    original document as its evidence.
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import Caller, get_session, get_settings, require_role
from app.api.routes_plant import own_installation
from app.api.schemas import ConfirmReadRequest, ReadRequest
from app.evidence import verify_evidence
from app.ledger import add_record
from app.models import DocumentRead, Evidence
from app.services.audit import append_audit
from app.services import ocr, reader

router = APIRouter(tags=["reader"])
supplier_only = require_role("supplier")
DOC_TYPES = ("electricity_bill", "fuel_invoice", "production_log")


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _json(read: DocumentRead) -> dict:
    stored = json.loads(read.suggested_json)
    return {
        "id": read.id, "evidence_id": read.evidence_id, "doc_type": read.doc_type,
        "status": read.status, "needs_review": read.needs_review,
        "model": read.model_name, "text": read.source_text,
        "fields": stored["fields"], "missing": stored["missing"],
        "suggested": stored["suggested"],
        "source": stored.get("source", "text"),
        "ocr_confidence": stored.get("ocr_confidence"), "record_id": read.record_id,
        "corrected": read.corrected, "created_at": read.created_at,
    }


def _own_read(session, caller, read_id) -> DocumentRead:
    read = session.get(DocumentRead, read_id)
    if read is None or read.organization_id != caller.org.id:
        raise HTTPException(404, "Reading not found")
    return read


@router.get("/reader/status")
def status(caller: Caller = Depends(supplier_only), settings=Depends(get_settings)):
    return {"available": reader.reader_status(settings.reader_url)}


@router.post("/evidence/{evidence_id}/read")
def read_evidence(
    evidence_id: int,
    body: ReadRequest,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
    settings=Depends(get_settings),
):
    if body.doc_type not in DOC_TYPES:
        raise HTTPException(422, f"doc_type must be one of {DOC_TYPES}")
    evidence = session.get(Evidence, evidence_id)
    if evidence is None or evidence.organization_id != caller.org.id:
        raise HTTPException(404, "Document not found")
    if not verify_evidence(settings.evidence_dir, evidence):
        raise HTTPException(409, "The stored file no longer matches its fingerprint")
    data = (settings.evidence_dir / evidence.sha256).read_bytes()
    try:
        page = ocr.read_file(data)
    except ocr.NothingToRead as error:
        raise HTTPException(422, str(error))
    except ocr.OcrUnavailable as error:
        raise HTTPException(503, f"Scan reading needs {error}.")
    text = page.text[:reader.MAX_CHARS]
    try:
        answer = reader.read_document(settings.reader_url, body.doc_type, text)
    except reader.ReaderUnavailable:
        raise HTTPException(
            503, "The reader is not running. You can still type the numbers.")
    stored = {"fields": answer["fields"], "missing": answer["missing"],
              "suggested": reader.suggested_record(body.doc_type, answer["fields"]),
              "source": page.source, "ocr_confidence": page.ocr_confidence}
    # OCR can misread a digit and the model cannot see that, so a scan
    # is always checked by a person.
    needs_review = bool(answer["needs_review"]) or page.is_scan
    read = DocumentRead(
        organization_id=caller.org.id, evidence_id=evidence.id,
        doc_type=body.doc_type, model_name=answer.get("model", "local reader"),
        source_text=text, suggested_json=json.dumps(stored),
        needs_review=needs_review, created_at=_now(),
    )
    session.add(read)
    session.commit()
    append_audit(session, caller.user.id, "document_read",
                 f"read {read.id} of evidence {evidence.id}")
    return _json(read)


@router.get("/reads")
def list_reads(
    status: str | None = None,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    query = select(DocumentRead).where(DocumentRead.organization_id == caller.org.id)
    if status:
        query = query.where(DocumentRead.status == status)
    return [_json(r) for r in session.scalars(query.order_by(DocumentRead.id.desc()))]


@router.post("/reads/{read_id}/confirm")
def confirm_read(
    read_id: int,
    body: ConfirmReadRequest,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    read = _own_read(session, caller, read_id)
    if read.status != "pending":
        raise HTTPException(409, f"This reading is already {read.status}")
    own_installation(session, caller, body.installation_id)
    if body.kind not in ("fuel", "electricity", "output"):
        raise HTTPException(422, "kind must be fuel, electricity or output")
    if not reader.engine_supports(body.unit):
        raise HTTPException(
            422, f"The unit {body.unit} is not supported. Convert it to "
                 "tonne, kg, gj, kwh or mwh before confirming.")
    record = add_record(
        session, body.kind, body.name, body.amount, body.unit,
        body.valid_from, body.valid_to, read.evidence_id,
        installation_id=body.installation_id,
    )
    suggested = json.loads(read.suggested_json)["suggested"] or {}
    final = {"kind": body.kind, "name": body.name, "amount": str(body.amount),
             "unit": body.unit}
    same = (str(suggested.get("name")) == body.name
            and suggested.get("unit") == body.unit
            and suggested.get("amount") is not None
            and float(suggested["amount"]) == float(body.amount))
    read.status, read.record_id = "confirmed", record.id
    read.confirmed_json, read.corrected = json.dumps(final), not same
    read.decided_at = _now()
    session.commit()
    append_audit(session, caller.user.id, "reading_confirmed",
                 f"read {read.id} became record {record.id}"
                 f"{' (corrected by a person)' if read.corrected else ''}")
    return _json(read)


@router.post("/reads/{read_id}/reject")
def reject_read(
    read_id: int,
    caller: Caller = Depends(supplier_only),
    session: Session = Depends(get_session),
):
    read = _own_read(session, caller, read_id)
    if read.status != "pending":
        raise HTTPException(409, f"This reading is already {read.status}")
    read.status, read.decided_at = "rejected", _now()
    session.commit()
    append_audit(session, caller.user.id, "reading_rejected", f"read {read.id}")
    return _json(read)
