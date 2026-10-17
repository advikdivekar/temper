"""statements.py

WHAT THIS FILE DOES
    Builds an emissions statement: gathers confirmed records, resolves
    each precursor, runs the engine, and stores the result with
    everything needed to explain and reproduce it.

STEPS
    1. Read the ledger as it stands now, for one installation and period
    2. Turn records into engine inputs (fuels, electricity, outputs)
    3. Resolve each precursor: use the supplier's statement only if it
       is signed and verified, otherwise use the default value
    4. Run the pure engine
    5. Store the Statement and its PrecursorRefs, and log it

CONCEPTS IN THIS FILE
    Inputs hash
        A fingerprint of every input. If the hash is the same, the
        result must be the same. If it changes, the statement is out
        of date.
    Version chain
        Recalculating a period creates a new statement pointing at the
        old one. Old statements are never edited.
"""

from datetime import date, datetime, timezone
from decimal import Decimal

from certify_engine.calculate_statement import (
    PlantData, ProductOutput, calculate_statement,
)
from certify_engine.default_values import DefaultValue
from certify_engine.direct_emissions import FuelUse
from certify_engine.emission_factors import EmissionFactor
from certify_engine.methodology import STEEL_AND_ALUMINIUM_V1
from certify_engine.precursors import PrecursorLot
from certify_engine.quantity import Quantity
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ledger import records_as_of
from app.models.plant import Installation
from app.models.statements import PrecursorRef, Statement
from app.models.trust import VerificationOpinion
from app.services.audit import append_audit
from app.services.canonical import canonical_hash
from app.services.reference_data import latest_default, latest_factor
from app.services.supply_chain import (
    mark_dependents_stale, recompute_inputs, stale_statements,
    would_create_cycle,
)

METHODOLOGIES = {
    "cbam_steel_and_aluminium:1": STEEL_AND_ALUMINIUM_V1,
}


def normalize_tonnes(value) -> str:
    """One exact text form for tonnes, so hashes never depend on how a
    client wrote the number (100 or 100.0 or 100.000000)."""
    return format(Decimal(str(value)).quantize(Decimal("0.000001")), "f")


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def is_verified(session: Session, statement: Statement) -> bool:
    """A statement counts as verified data when it is signed and a
    verifier has given a satisfactory opinion on it."""
    if statement.status != "signed":
        return False
    opinion = session.scalars(
        select(VerificationOpinion).where(
            VerificationOpinion.statement_id == statement.id,
            VerificationOpinion.conclusion == "satisfactory",
        )
    ).first()
    return opinion is not None


def _to_factor(row) -> EmissionFactor:
    return EmissionFactor(
        row.name, Decimal(row.value), row.per_unit, row.source, row.version
    )


def _records_in_period(session, installation_id, start, end):
    records = records_as_of(session)
    return [
        r for r in records
        if r.installation_id == installation_id
        and r.valid_from >= start and r.valid_to <= end
    ]


class Prepared:
    """Everything gathered before the engine runs."""

    def __init__(self, plant, methodology, records, factor_rows,
                 ref_hashes, refs):
        self.plant = plant
        self.methodology = methodology
        self.records = records
        self.factor_rows = factor_rows
        self.ref_hashes = ref_hashes
        self.refs = refs


def prepare(
    session: Session,
    installation: Installation,
    period_start: date,
    period_end: date,
    precursor_inputs: list[dict],
    methodology_key: str,
    force_defaults: bool = False,
) -> Prepared:
    """Gather records and resolve precursors into engine inputs.

    force_defaults ignores supplier statements and uses defaults for
    every precursor. It answers "what would the default have been?".
    """
    methodology = METHODOLOGIES[methodology_key]
    records = _records_in_period(
        session, installation.id, period_start, period_end
    )

    fuels, products, electricity = [], [], Quantity(0, "kwh")
    factor_rows = {}
    for rec in records:
        if rec.kind == "fuel":
            row = latest_factor(session, rec.name)
            factor_rows[rec.name] = row.id
            fuels.append(
                FuelUse(rec.name, Quantity(rec.amount, rec.unit),
                        _to_factor(row))
            )
        elif rec.kind == "electricity":
            electricity = electricity + Quantity(rec.amount, rec.unit)
        elif rec.kind == "output":
            products.append(ProductOutput(rec.name, Decimal(rec.amount)))
    if not products:
        raise ValueError("No product output records in this period")

    grid_row = latest_factor(session, "grid_india")
    factor_rows["grid_india"] = grid_row.id

    lots, refs, ref_hashes = [], [], []
    for item in precursor_inputs:
        default_row = latest_default(
            session, item["cn_code"], installation.country
        )
        default = DefaultValue(
            default_row.cn_code, default_row.country,
            Decimal(default_row.base_tco2_per_tonne),
            default_row.source, default_row.version,
        )
        actual, verified, source, upstream = None, False, "", None
        upstream_id = item.get("upstream_statement_id")
        if upstream_id and would_create_cycle(
            session, installation.id, upstream_id
        ):
            raise ValueError("This precursor link would create a cycle")
        if upstream_id and not force_defaults:
            upstream = session.get(Statement, upstream_id)
            product = item["upstream_product"]
            if upstream and is_verified(session, upstream):
                actual = Decimal(upstream.see_by_product[product])
                verified = True
                source = f"statement {upstream.id}"
        lots.append(
            PrecursorLot(
                item["material_name"],
                Quantity(item["tonnes"], "tonne"),
                default, actual, verified, source,
            )
        )
        ref_hashes.append(
            {
                "material": item["material_name"],
                "tonnes": normalize_tonnes(item["tonnes"]),
                "upstream": upstream_id if verified else None,
                "upstream_hash": upstream.content_hash if verified else None,
                "default_id": default_row.id,
            }
        )
        refs.append((item, default_row.id, upstream_id if verified else None,
                     upstream.content_hash if verified else None))

    plant = PlantData(
        year=period_end.year,
        fuels=fuels,
        electricity=electricity,
        grid_factor=_to_factor(grid_row),
        precursors=lots,
        products=products,
    )
    return Prepared(plant, methodology, records, factor_rows,
                    ref_hashes, refs)


def default_see(session: Session, statement: Statement) -> dict:
    """SEE per product if every precursor had used the default value."""
    installation = session.get(Installation, statement.installation_id)
    inputs = recompute_inputs(session, statement)
    prepared = prepare(
        session, installation, statement.period_start,
        statement.period_end, inputs, statement.methodology,
        force_defaults=True,
    )
    result = calculate_statement(prepared.plant, prepared.methodology)
    return {k: str(v) for k, v in result.see_by_product.items()}


def build_statement(
    session: Session,
    installation: Installation,
    period_start: date,
    period_end: date,
    precursor_inputs: list[dict],
    methodology_key: str,
    actor_user_id: int | None,
) -> Statement:
    prepared = prepare(
        session, installation, period_start, period_end,
        precursor_inputs, methodology_key,
    )
    plant, methodology = prepared.plant, prepared.methodology
    records, factor_rows = prepared.records, prepared.factor_rows
    ref_hashes, refs = prepared.ref_hashes, prepared.refs
    result = calculate_statement(plant, methodology)

    inputs_hash = canonical_hash(
        {
            "installation": installation.id,
            "period": [period_start, period_end],
            "methodology": methodology_key,
            "records": sorted(r.id for r in records),
            "factors": factor_rows,
            "precursors": ref_hashes,
        }
    )

    previous = session.scalars(
        select(Statement)
        .where(
            Statement.installation_id == installation.id,
            Statement.period_start == period_start,
            Statement.period_end == period_end,
        )
        .order_by(Statement.id.desc())
    ).first()

    statement = Statement(
        installation_id=installation.id,
        period_start=period_start,
        period_end=period_end,
        methodology=methodology_key,
        status="draft",
        inputs_hash=inputs_hash,
        total_tco2=result.total_tco2,
        see_by_product={k: str(v) for k, v in result.see_by_product.items()},
        trace=result.trace,
        breakdown=result.breakdown,
        record_ids=sorted(r.id for r in records),
        created_at=_now(),
        supersedes_id=previous.id if previous else None,
    )
    session.add(statement)
    session.flush()
    statement.content_hash = canonical_hash(content_of(statement, ref_hashes))

    for item, default_id, upstream_id, upstream_hash in refs:
        session.add(
            PrecursorRef(
                statement_id=statement.id,
                material_name=item["material_name"],
                tonnes_used=Decimal(str(item["tonnes"])),
                upstream_statement_id=upstream_id,
                upstream_product=item.get("upstream_product"),
                upstream_hash=upstream_hash,
                default_value_id=default_id,
            )
        )
    session.commit()
    append_audit(
        session, actor_user_id, "statement_built",
        f"statement {statement.id} for installation {installation.id}",
    )
    if previous:
        # A new version exists, so anything built on the old one is stale.
        mark_dependents_stale(session, previous.id)
    return statement


def recompute_stale(
    session: Session, actor_user_id: int | None
) -> list[Statement]:
    """Rebuild stale statements, upstream ones first."""
    rebuilt = []
    # Each pass rebuilds statements whose upstream links are not stale.
    for _ in range(50):
        pending = stale_statements(session)
        if not pending:
            break
        stale_ids = {s.id for s in pending}
        ready = [
            s for s in pending
            if not _depends_on_any(session, s, stale_ids)
        ]
        for statement in ready:
            installation = session.get(Installation, statement.installation_id)
            rebuilt.append(
                build_statement(
                    session, installation, statement.period_start,
                    statement.period_end,
                    recompute_inputs(session, statement),
                    statement.methodology, actor_user_id,
                )
            )
    return rebuilt


def _depends_on_any(session, statement, stale_ids) -> bool:
    refs = session.scalars(
        select(PrecursorRef).where(PrecursorRef.statement_id == statement.id)
    )
    return any(r.upstream_statement_id in stale_ids for r in refs)


def content_of(statement: Statement, precursors: list[dict]) -> dict:
    """The exact data a signature covers."""
    return {
        "installation_id": statement.installation_id,
        "period": [statement.period_start, statement.period_end],
        "methodology": statement.methodology,
        "inputs_hash": statement.inputs_hash,
        "total_tco2": statement.total_tco2,
        "see_by_product": statement.see_by_product,
        "precursors": precursors,
    }
