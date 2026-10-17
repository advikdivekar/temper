"""routes_statements.py

WHAT THIS FILE DOES
    Routes to build, read, sign and recompute emissions statements,
    and to list the statements shared with an importer or verifier.

SELECTIVE DISCLOSURE
    The owner sees the full statement including the calculation trace.
    Recipients (importers, verifiers) see the result, its status and
    its verification state, but not the raw trace, which can reveal
    plant volumes.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import Caller, get_caller, get_session, get_settings, require_role
from app.api.routes_plant import own_installation
from app.api.schemas import BuildStatementRequest
from app.models import (
    Installation, Organization, PrecursorRef, ShareGrant, Statement,
    VerificationOpinion,
)
from app.services import trust
from app.services.statements import (
    METHODOLOGIES, build_statement, default_see, is_verified,
    recompute_stale,
)

router = APIRouter(prefix="/statements", tags=["statements"])


def latest_only(session: Session, rows: list[Statement]) -> list[Statement]:
    """Drop statements that a newer version has replaced."""
    replaced = {
        r.supersedes_id for r in session.scalars(
            select(Statement).where(Statement.supersedes_id.is_not(None))
        )
    }
    return [s for s in rows if s.id not in replaced]


def safe_default_see(session: Session, statement: Statement) -> dict:
    """Default SEE per product, or empty if it cannot be computed."""
    try:
        return default_see(session, statement)
    except (ValueError, LookupError):
        return {}


def summary(session: Session, statement: Statement) -> dict:
    installation = session.get(Installation, statement.installation_id)
    owner = session.get(Organization, installation.organization_id)
    opinions = session.scalars(
        select(VerificationOpinion).where(
            VerificationOpinion.statement_id == statement.id
        )
    ).all()
    return {
        "id": statement.id,
        "supplier": owner.name,
        "supplier_org_id": owner.id,
        "installation": installation.name,
        "period_start": statement.period_start,
        "period_end": statement.period_end,
        "methodology": statement.methodology,
        "status": statement.status,
        "verified": is_verified(session, statement),
        "see_by_product": statement.see_by_product,
        "content_hash": statement.content_hash,
        "created_at": statement.created_at,
        "timeline": timeline(session, statement, with_shares=False),
        "default_see_by_product": safe_default_see(session, statement),
        "signature_valid": trust.signature_is_valid(session, statement),
        "opinions": [
            {"verifier_org_id": o.verifier_org_id,
             "conclusion": o.conclusion, "signed_at": o.signed_at}
            for o in opinions
        ],
    }


def full_detail(session: Session, statement: Statement) -> dict:
    refs = session.scalars(
        select(PrecursorRef).where(PrecursorRef.statement_id == statement.id)
    ).all()
    data = summary(session, statement)
    data["total_tco2"] = str(statement.total_tco2)
    data["trace"] = statement.trace
    data["breakdown"] = statement.breakdown
    data["inputs"] = input_records(session, statement)
    data["timeline"] = timeline(session, statement, with_shares=True)
    data["supersedes_id"] = statement.supersedes_id
    data["inputs_hash"] = statement.inputs_hash
    data["precursors"] = [
        {"material": r.material_name, "tonnes": str(r.tonnes_used),
         "upstream_statement_id": r.upstream_statement_id,
         "uses_default": r.upstream_statement_id is None}
        for r in refs
    ]
    return data


def input_records(session: Session, statement: Statement) -> list[dict]:
    """The exact ledger rows this statement was built from, each with
    the evidence file behind it. This is the drill down from a figure
    to its proof."""
    from app.models import ActivityRecord, Evidence
    rows = []
    for record_id in statement.record_ids or []:
        record = session.get(ActivityRecord, record_id)
        evidence = session.get(Evidence, record.evidence_id)
        rows.append({
            "record_id": record.id, "kind": record.kind, "name": record.name,
            "amount": str(record.amount), "unit": record.unit,
            "evidence_id": evidence.id, "filename": evidence.filename,
            "sha256": evidence.sha256,
        })
    return rows


def timeline(
    session: Session, statement: Statement, with_shares: bool = True
) -> list[dict]:
    """The trust journey of a statement, oldest first.

    with_shares adds who it was shared with. Recipients never get that,
    because it would reveal the supplier's other customers.
    """
    events = [{"event": "built", "at": statement.created_at, "by": ""}]
    if statement.signed_at:
        events.append({"event": "signed", "at": statement.signed_at, "by": ""})
    opinions = session.scalars(
        select(VerificationOpinion).where(
            VerificationOpinion.statement_id == statement.id
        )
    ).all()
    for o in opinions:
        verifier = session.get(Organization, o.verifier_org_id)
        events.append({"event": f"verified_{o.conclusion}",
                       "at": o.signed_at, "by": verifier.name})
    grants = session.scalars(
        select(ShareGrant).where(ShareGrant.statement_id == statement.id)
    ).all() if with_shares else []
    for g in grants:
        recipient = session.get(Organization, g.recipient_org_id)
        events.append({"event": "shared", "at": g.granted_at,
                       "by": recipient.name, "revoked": g.revoked_at is not None,
                       "grant_id": g.id})
    return sorted(events, key=lambda e: e["at"])


def load_readable(session, caller, statement_id) -> Statement:
    statement = session.get(Statement, statement_id)
    if statement is None or not trust.can_read_summary(
        session, caller.org, statement
    ):
        raise HTTPException(404, "Statement not found")
    return statement


@router.post("")
def build(
    body: BuildStatementRequest,
    caller: Caller = Depends(require_role("supplier")),
    session: Session = Depends(get_session),
):
    installation = own_installation(session, caller, body.installation_id)
    if body.methodology not in METHODOLOGIES:
        raise HTTPException(400, "Unknown methodology")
    try:
        statement = build_statement(
            session, installation, body.period_start, body.period_end,
            [p.model_dump(mode="json") for p in body.precursors],
            body.methodology, caller.user.id,
        )
    except (ValueError, LookupError) as error:
        raise HTTPException(400, str(error))
    return full_detail(session, statement)


@router.get("/incoming")
def incoming(
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    """Latest statements other organizations shared with this one.

    A bolt maker uses this list to pick its mill's statement.
    """
    rows = session.scalars(
        select(Statement)
        .join(ShareGrant, ShareGrant.statement_id == Statement.id)
        .where(
            ShareGrant.recipient_org_id == caller.org.id,
            ShareGrant.revoked_at.is_(None),
        )
        .order_by(Statement.id.desc())
    ).all()
    return [summary(session, s) for s in rows]


@router.get("")
def list_statements(
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    """Suppliers see their own. Others see what was shared with them."""
    if caller.org.role == "supplier":
        rows = session.scalars(
            select(Statement)
            .join(Installation, Installation.id == Statement.installation_id)
            .where(Installation.organization_id == caller.org.id)
            .order_by(Statement.id.desc())
        ).all()
        rows = latest_only(session, rows)
    else:
        rows = session.scalars(
            select(Statement)
            .join(ShareGrant, ShareGrant.statement_id == Statement.id)
            .where(
                ShareGrant.recipient_org_id == caller.org.id,
                ShareGrant.revoked_at.is_(None),
            )
            .order_by(Statement.id.desc())
        ).all()
    return [summary(session, s) for s in rows]


@router.get("/{statement_id}")
def get_statement(
    statement_id: int,
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    statement = load_readable(session, caller, statement_id)
    if trust.can_read_evidence(session, caller.org, statement):
        return full_detail(session, statement)
    return summary(session, statement)


@router.post("/{statement_id}/sign")
def sign(
    statement_id: int,
    caller: Caller = Depends(require_role("supplier")),
    session: Session = Depends(get_session),
    settings=Depends(get_settings),
):
    statement = load_readable(session, caller, statement_id)
    try:
        trust.sign_statement(
            session, settings.key_dir, caller.org, statement, caller.user.id
        )
    except (ValueError, PermissionError) as error:
        raise HTTPException(400, str(error))
    return summary(session, statement)


@router.post("/recompute")
def recompute(
    caller: Caller = Depends(require_role("supplier")),
    session: Session = Depends(get_session),
):
    """Rebuild this supplier's stale statements, upstream first."""
    rebuilt = recompute_stale(session, caller.user.id)
    mine = [
        s for s in rebuilt
        if session.get(Installation, s.installation_id).organization_id
        == caller.org.id
    ]
    return [summary(session, s) for s in mine]


@router.get("/{statement_id}/savings")
def savings(
    statement_id: int,
    product: str,
    tonnes: float,
    certificate_price_eur: float,
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    """What an importer saves versus default values.

    saving = (default SEE minus actual SEE) x tonnes x certificate price
    This ignores the free allocation adjustment, so it is an upper
    bound until that factor is added.
    """
    statement = load_readable(session, caller, statement_id)
    actual = Decimal(statement.see_by_product[product])
    default = Decimal(default_see(session, statement)[product])
    difference = max(default - actual, Decimal("0"))
    saving = difference * Decimal(str(tonnes)) * Decimal(str(certificate_price_eur))
    return {
        "actual_see": str(actual),
        "default_see": str(default),
        "difference_per_tonne": str(difference),
        "saving_eur": str(saving.quantize(Decimal("0.01"))),
        "note": "Before free allocation adjustment.",
    }


@router.get("/{statement_id}/chain")
def chain(
    statement_id: int,
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    """The supply chain behind a statement: who feeds whom.

    Each node shows only name, result and verification state, never
    plant volumes, so it is safe to show to importers.
    """
    root = load_readable(session, caller, statement_id)
    nodes, edges, seen = [], [], set()
    to_visit = [root.id]
    while to_visit:
        current_id = to_visit.pop()
        if current_id in seen:
            continue
        seen.add(current_id)
        statement = session.get(Statement, current_id)
        installation = session.get(Installation, statement.installation_id)
        owner = session.get(Organization, installation.organization_id)
        nodes.append({
            "id": statement.id, "supplier": owner.name,
            "see_by_product": statement.see_by_product,
            "status": statement.status,
            "verified": is_verified(session, statement),
        })
        refs = session.scalars(
            select(PrecursorRef).where(PrecursorRef.statement_id == current_id)
        ).all()
        for ref in refs:
            edges.append({
                "from": ref.upstream_statement_id, "to": current_id,
                "material": ref.material_name,
                "tonnes": str(ref.tonnes_used),
                "uses_default": ref.upstream_statement_id is None,
            })
            if ref.upstream_statement_id:
                to_visit.append(ref.upstream_statement_id)
    return {"root": root.id, "nodes": nodes, "edges": edges}


@router.get("/{statement_id}/versions")
def versions(
    statement_id: int,
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    """Every version of this statement for its period, oldest first,
    so a revision can be compared with the version it replaced."""
    statement = load_readable(session, caller, statement_id)
    rows = session.scalars(
        select(Statement).where(
            Statement.installation_id == statement.installation_id,
            Statement.period_start == statement.period_start,
            Statement.period_end == statement.period_end,
        ).order_by(Statement.id)
    ).all()
    return [
        {"id": s.id, "status": s.status, "created_at": s.created_at,
         "total_tco2": str(s.total_tco2), "see_by_product": s.see_by_product,
         "supersedes_id": s.supersedes_id, "current": s.id == max(r.id for r in rows)}
        for s in rows
    ]
