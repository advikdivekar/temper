"""reference_data.py

WHAT THIS FILE DOES
    Loads emission factors and default values from the JSON files in
    data/ into the database, and looks them up for the engine.

CONCEPTS IN THIS FILE
    Idempotent load
        Running the loader twice adds nothing the second time, because
        each (name, version) is only inserted once.
    Latest version
        When the engine needs a factor it takes the newest version by
        id. The statement records which row it used, so old statements
        stay reproducible.
"""

import json
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.reference import DefaultValueRow, EmissionFactorRow


def load_reference_data(session: Session, data_dir: Path) -> None:
    """Load factors and defaults from data/. Safe to run again."""
    factors = json.loads((data_dir / "emission_factors.json").read_text())
    have = {(f.name, f.version) for f in session.scalars(select(EmissionFactorRow))}
    for item in factors["factors"]:
        if (item["name"], item["version"]) in have:
            continue
        session.add(
            EmissionFactorRow(
                name=item["name"], value=Decimal(item["value"]),
                per_unit=item["per_unit"], source=item["source"],
                version=item["version"], status=item.get("status", "unverified"),
            )
        )

    defaults = json.loads((data_dir / "default_values.json").read_text())
    have_defaults = {
        (d.cn_code, d.country, d.version)
        for d in session.scalars(select(DefaultValueRow))
    }
    for item in defaults["defaults"]:
        key = (item["cn_code"], item["country"], item["version"])
        if key in have_defaults:
            continue
        session.add(
            DefaultValueRow(
                cn_code=item["cn_code"], country=item["country"],
                base_tco2_per_tonne=Decimal(item["base_tco2_per_tonne"]),
                source=item["source"], version=item["version"],
                description=item.get("description", ""),
                status=item.get("status", "unverified"),
                route=item.get("route", ""),
            )
        )
    session.commit()


def latest_factor(session: Session, name: str) -> EmissionFactorRow:
    row = session.scalars(
        select(EmissionFactorRow)
        .where(EmissionFactorRow.name == name)
        .order_by(EmissionFactorRow.id.desc())
    ).first()
    if row is None:
        raise LookupError(f"No emission factor named {name}")
    return row


def latest_default(
    session: Session, cn_code: str, country: str
) -> DefaultValueRow:
    """The default for a product, using its most specific listed CN code.

    The Commission lists some products at 4 or 6 digits and others at 8,
    so a product code such as 73181590 matches the row for 731815. If the
    country has no row, the "other countries" row is used.
    """
    digits = cn_code.replace(" ", "")
    for place in (country, "other"):
        rows = session.scalars(
            select(DefaultValueRow)
            .where(DefaultValueRow.country == place)
            .order_by(DefaultValueRow.id.desc())
        ).all()
        matches = [r for r in rows if digits.startswith(r.cn_code)]
        if matches:
            return max(matches, key=lambda r: len(r.cn_code))
    raise LookupError(f"No default value for CN code {cn_code}")
