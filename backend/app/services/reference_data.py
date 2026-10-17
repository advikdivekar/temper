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
    factors = json.loads((data_dir / "emission_factors.json").read_text())
    for item in factors["factors"]:
        exists = session.scalar(
            select(EmissionFactorRow).where(
                EmissionFactorRow.name == item["name"],
                EmissionFactorRow.version == item["version"],
            )
        )
        if not exists:
            session.add(
                EmissionFactorRow(
                    name=item["name"], value=Decimal(item["value"]),
                    per_unit=item["per_unit"], source=item["source"],
                    version=item["version"],
                )
            )

    defaults = json.loads((data_dir / "default_values.json").read_text())
    for item in defaults["defaults"]:
        exists = session.scalar(
            select(DefaultValueRow).where(
                DefaultValueRow.cn_code == item["cn_code"],
                DefaultValueRow.country == item["country"],
                DefaultValueRow.version == item["version"],
            )
        )
        if not exists:
            session.add(
                DefaultValueRow(
                    cn_code=item["cn_code"], country=item["country"],
                    base_tco2_per_tonne=Decimal(item["base_tco2_per_tonne"]),
                    source=item["source"], version=item["version"],
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
    """Newest default for the country, else for 'other'."""
    for place in (country, "other"):
        row = session.scalars(
            select(DefaultValueRow)
            .where(
                DefaultValueRow.cn_code == cn_code,
                DefaultValueRow.country == place,
            )
            .order_by(DefaultValueRow.id.desc())
        ).first()
        if row:
            return row
    raise LookupError(f"No default value for CN code {cn_code}")
