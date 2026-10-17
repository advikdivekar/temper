"""routes_insights.py

WHAT THIS FILE DOES
    Read only routes that turn raw records into understanding:
      /overview   a role aware dashboard (numbers, things needing
                  attention, recent activity)
      /audit      the activity log of your organization, with a check
                  that the tamper evident chain is intact
      /network    the supply chain around you, as nodes and links
      /reference  the emission factors and default values in force
      /org        your organization, its signing key and its members
"""

from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import Caller, get_caller, get_session, get_settings
from app.api.routes_statements import summary
from app.models import (
    AuditEntry, DataRequest, DefaultValueRow, EmissionFactorRow, Installation,
    Organization, PrecursorRef, ShareGrant, Statement, User,
)
from app.services import signing
from app.services.audit import verify_chain
from app.services.supply_chain import direct_dependents

router = APIRouter(tags=["insights"])

MARKUPS = {2026: Decimal("0.10"), 2027: Decimal("0.20"), 2028: Decimal("0.30")}


def visible_statements(session: Session, org: Organization) -> list[Statement]:
    """Latest statements this organization owns or has been granted."""
    own = session.scalars(
        select(Statement)
        .join(Installation, Installation.id == Statement.installation_id)
        .where(Installation.organization_id == org.id)
    ).all()
    granted = session.scalars(
        select(Statement)
        .join(ShareGrant, ShareGrant.statement_id == Statement.id)
        .where(ShareGrant.recipient_org_id == org.id,
               ShareGrant.revoked_at.is_(None))
    ).all()
    seen, rows = set(), []
    for statement in own + granted:
        if statement.id in seen:
            continue
        seen.add(statement.id)
        newer = session.scalars(
            select(Statement).where(Statement.supersedes_id == statement.id)
        ).first()
        if newer is None:
            rows.append(statement)
    return sorted(rows, key=lambda s: (s.period_start, s.id))


def activity_for(session: Session, org: Organization, limit: int) -> list[dict]:
    rows = session.execute(
        select(AuditEntry, User)
        .join(User, User.id == AuditEntry.actor_user_id)
        .where(User.organization_id == org.id)
        .order_by(AuditEntry.id.desc())
        .limit(limit)
    ).all()
    return [
        {"id": e.id, "at": e.created_at, "action": e.action,
         "detail": e.detail, "actor": u.email, "hash": e.entry_hash[:12]}
        for e, u in rows
    ]


@router.get("/overview")
def overview(
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    org = caller.org
    statements = visible_statements(session, org)
    items = [summary(session, s) for s in statements]
    verified = [s for s in items if s["verified"]]

    def avg_cut(rows):
        cuts = []
        for s in rows:
            p = next(iter(s["see_by_product"]), None)
            d = float(s["default_see_by_product"].get(p, 0) or 0)
            if p and d > 0:
                cuts.append((1 - float(s["see_by_product"][p]) / d) * 100)
        return round(sum(cuts) / len(cuts), 1) if cuts else 0

    attention = []
    for s in items:
        link = f"/statements/{s['id']}"
        mine = s["supplier"] == org.name
        if s["status"] == "stale":
            attention.append({"kind": "stale", "severity": "high", "link": link,
                "title": f"Statement #{s['id']} is out of date",
                "detail": "An upstream supplier published a new number. Recompute."})
        elif mine and s["status"] == "draft":
            attention.append({"kind": "unsigned", "severity": "medium", "link": link,
                "title": f"Statement #{s['id']} is not signed",
                "detail": "Sign it to lock the figures and make it shareable."})
        elif s["status"] == "signed" and not s["verified"]:
            who = "Awaiting your opinion" if org.role == "verifier" else "Awaiting a verifier"
            attention.append({"kind": "unverified", "severity": "medium", "link": link,
                "title": f"Statement #{s['id']}: {who.lower()}",
                "detail": f"{s['supplier']}, {s['period_start']} to {s['period_end']}"})

    incoming = session.scalars(
        select(DataRequest).where(DataRequest.to_org_id == org.id,
                                  DataRequest.status == "open")
    ).all()
    for r in incoming:
        sender = session.get(Organization, r.from_org_id)
        attention.append({"kind": "request", "severity": "medium", "link": "/requests",
            "title": f"Request from {sender.name}", "detail": r.message or "Data requested."})

    plants = len(session.scalars(
        select(Installation).where(Installation.organization_id == org.id)
    ).all())

    return {
        "role": org.role,
        "kpis": {
            "statements": len(items),
            "verified": len(verified),
            "verified_share": round(100 * len(verified) / len(items)) if items else 0,
            "stale": sum(1 for s in items if s["status"] == "stale"),
            "avg_cut_vs_default": avg_cut(items),
            "plants": plants,
            "open_requests": len(incoming),
        },
        "attention": attention[:10],
        "activity": activity_for(session, org, 12),
        "statements": items,
    }


@router.get("/audit")
def audit(
    limit: int = 100,
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    bad = verify_chain(session)
    return {
        "intact": bad is None,
        "first_bad_entry": bad,
        "total_entries": len(session.scalars(select(AuditEntry)).all()),
        "entries": activity_for(session, caller.org, min(limit, 500)),
    }


@router.get("/network")
def network(
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    """Companies around you and how they connect.

    Volumes are never included. A link only says that material flows
    from one company to another and whether that data is verified.
    """
    from app.services.statements import is_verified

    statements = visible_statements(session, caller.org)
    orgs: dict[int, dict] = {}
    edges: dict[tuple, dict] = {}

    def owner_of(statement: Statement) -> Organization:
        inst = session.get(Installation, statement.installation_id)
        return session.get(Organization, inst.organization_id)

    def touch(organization: Organization, statement: Statement):
        node = orgs.setdefault(organization.id, {
            "id": organization.id, "name": organization.name,
            "role": organization.role, "statements": 0, "verified": 0,
            "you": organization.id == caller.org.id,
        })
        node["statements"] += 1
        node["verified"] += 1 if is_verified(session, statement) else 0

    to_visit = list(statements)
    seen = set()
    while to_visit:
        statement = to_visit.pop()
        if statement.id in seen:
            continue
        seen.add(statement.id)
        owner = owner_of(statement)
        touch(owner, statement)
        for ref in session.scalars(
            select(PrecursorRef).where(PrecursorRef.statement_id == statement.id)
        ):
            if ref.upstream_statement_id:
                upstream = session.get(Statement, ref.upstream_statement_id)
                up_owner = owner_of(upstream)
                key = (up_owner.id, owner.id)
                edge = edges.setdefault(key, {"from": up_owner.id, "to": owner.id,
                    "material": ref.material_name, "links": 0, "verified": 0})
                edge["links"] += 1
                edge["verified"] += 1 if is_verified(session, upstream) else 0
                to_visit.append(upstream)
            else:
                orgs.setdefault(0, {"id": 0, "name": "EU default values",
                    "role": "default", "statements": 0, "verified": 0, "you": False})
                key = (0, owner.id)
                edge = edges.setdefault(key, {"from": 0, "to": owner.id,
                    "material": ref.material_name, "links": 0, "verified": 0})
                edge["links"] += 1

    # Customers: organizations I shared my own statements with.
    own_ids = [s.id for s in statements if owner_of(s).id == caller.org.id]
    if own_ids:
        for grant in session.scalars(
            select(ShareGrant).where(ShareGrant.statement_id.in_(own_ids),
                                     ShareGrant.revoked_at.is_(None))
        ):
            recipient = session.get(Organization, grant.recipient_org_id)
            orgs.setdefault(recipient.id, {"id": recipient.id, "name": recipient.name,
                "role": recipient.role, "statements": 0, "verified": 0, "you": False})
            key = (caller.org.id, recipient.id, "shared")
            edge = edges.setdefault(key, {"from": caller.org.id, "to": recipient.id,
                "material": "shared statements", "links": 0, "verified": 0, "kind": "shared"})
            edge["links"] += 1

    return {"nodes": list(orgs.values()), "edges": list(edges.values())}


@router.get("/reference")
def reference(
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    factors = session.scalars(select(EmissionFactorRow).order_by(EmissionFactorRow.name)).all()
    defaults = session.scalars(
        select(DefaultValueRow).where(DefaultValueRow.country == "IN")
        .order_by(DefaultValueRow.cn_code)
    ).all()
    return {
        "factors": [{"id": f.id, "name": f.name, "value": str(f.value), "per_unit": f.per_unit,
                     "source": f.source, "version": f.version, "status": f.status} for f in factors],
        "defaults": [
            {"id": d.id, "cn_code": d.cn_code, "country": d.country,
             "base": str(d.base_tco2_per_tonne), "source": d.source,
             "version": d.version, "status": d.status, "description": d.description,
             "route": d.route,
             "marked_up": {
                 str(year): str((d.base_tco2_per_tonne * (1 + rate)).quantize(Decimal("0.01")))
                 for year, rate in MARKUPS.items()
             }}
            for d in defaults
        ],
        "methodologies": [{"key": "cbam_steel_and_aluminium:1", "includes_indirect": False,
                           "see_decimals": 5, "markup": {"2026": "10%", "2027": "20%", "2028": "30%"}}],
    }


@router.get("/org")
def organization(
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
    settings=Depends(get_settings),
):
    org = caller.org
    if org.role in ("supplier", "verifier") and not org.public_key:
        signing.ensure_keypair(settings.key_dir, org)
        session.commit()
    members = session.scalars(select(User).where(User.organization_id == org.id)).all()
    key = org.public_key or ""
    return {
        "id": org.id, "name": org.name, "role": org.role,
        "public_key": key,
        "key_fingerprint": ":".join(key[i:i + 4] for i in range(0, 24, 4)) if key else "",
        "members": [{"id": u.id, "email": u.email} for u in members],
    }
