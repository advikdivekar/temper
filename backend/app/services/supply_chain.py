"""supply_chain.py

WHAT THIS FILE DOES
    Manages the links between statements across companies: finding
    what depends on what, refusing circular links, marking statements
    stale when an upstream one changes, and recomputing them in the
    right order.

CONCEPTS IN THIS FILE
    Dependency graph
        A bolt maker's statement points (PrecursorRef) at its steel
        mill's statement. Mills, fabricators and importers form chains.
    Cycle
        Company A buying from B while B buys from A makes a loop and
        the numbers could never settle. would_create_cycle refuses it.
    Stale
        When a mill publishes a new version of its statement, every
        statement built on the old version is out of date and is marked
        stale, through all tiers.
    Topological order
        Recompute upstream statements before the ones that rely on
        them. Like a build system: dependencies first.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.plant import Installation
from app.models.reference import DefaultValueRow
from app.models.statements import PrecursorRef, Statement


def direct_dependents(session: Session, statement_id: int) -> list[Statement]:
    """Current statements that use this statement as a precursor."""
    rows = session.scalars(
        select(Statement)
        .join(PrecursorRef, PrecursorRef.statement_id == Statement.id)
        .where(PrecursorRef.upstream_statement_id == statement_id)
    ).all()
    return [s for s in rows if _is_latest(session, s)]


def _is_latest(session: Session, statement: Statement) -> bool:
    newer = session.scalars(
        select(Statement).where(Statement.supersedes_id == statement.id)
    ).first()
    return newer is None


def latest_version(session: Session, statement_id: int) -> Statement:
    """Follow the version chain forward to the newest statement."""
    current = session.get(Statement, statement_id)
    while True:
        newer = session.scalars(
            select(Statement).where(Statement.supersedes_id == current.id)
        ).first()
        if newer is None:
            return current
        current = newer


def installations_upstream(session: Session, statement_id: int) -> set[int]:
    """Every installation this statement depends on, through all tiers."""
    seen_statements: set[int] = set()
    installations: set[int] = set()
    to_visit = [statement_id]
    while to_visit:
        current_id = to_visit.pop()
        if current_id in seen_statements:
            continue
        seen_statements.add(current_id)
        statement = session.get(Statement, current_id)
        installations.add(statement.installation_id)
        refs = session.scalars(
            select(PrecursorRef).where(PrecursorRef.statement_id == current_id)
        )
        to_visit.extend(
            r.upstream_statement_id for r in refs if r.upstream_statement_id
        )
    return installations


def would_create_cycle(
    session: Session, installation_id: int, upstream_statement_id: int
) -> bool:
    """True if the upstream chain already includes this installation."""
    return installation_id in installations_upstream(
        session, upstream_statement_id
    )


def mark_dependents_stale(session: Session, statement_id: int) -> list[int]:
    """Mark everything built on this statement stale, through all tiers."""
    stale_ids = []
    to_visit = [statement_id]
    seen = set()
    while to_visit:
        current = to_visit.pop()
        if current in seen:
            continue
        seen.add(current)
        for dependent in direct_dependents(session, current):
            dependent.status = "stale"
            stale_ids.append(dependent.id)
            to_visit.append(dependent.id)
    session.commit()
    return stale_ids


def stale_statements(session: Session) -> list[Statement]:
    rows = session.scalars(
        select(Statement).where(Statement.status == "stale")
    ).all()
    return [s for s in rows if _is_latest(session, s)]


def recompute_inputs(session: Session, statement: Statement) -> list[dict]:
    """Rebuild the precursor inputs of a statement, upgrading upstream
    links to the newest version of each upstream statement."""
    refs = session.scalars(
        select(PrecursorRef).where(PrecursorRef.statement_id == statement.id)
    ).all()
    inputs = []
    for ref in refs:
        default_row = session.get(DefaultValueRow, ref.default_value_id)
        item = {
            "material_name": ref.material_name,
            "tonnes": str(ref.tonnes_used),
            "cn_code": default_row.cn_code,
        }
        if ref.upstream_statement_id:
            newest = latest_version(session, ref.upstream_statement_id)
            item["upstream_statement_id"] = newest.id
            item["upstream_product"] = ref.upstream_product
        inputs.append(item)
    return inputs


def installation_for(session: Session, statement: Statement) -> Installation:
    return session.get(Installation, statement.installation_id)
