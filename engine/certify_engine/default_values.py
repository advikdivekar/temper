"""default_values.py

WHAT THIS FILE DOES
    Models the EU's default emission values and applies the yearly mark
    up to them.

CONCEPTS IN THIS FILE
    Default value
        The number an importer must use when a supplier cannot give
        verified real data. It is set high on purpose.
    Base value versus marked up value
        The published base value for a product and country, multiplied
        by (1 + mark up for the year).
    Fallback country
        If a country has no listed value for a product, the "other
        countries" value applies.
"""

from dataclasses import dataclass
from decimal import Decimal

from certify_engine.methodology import Methodology


@dataclass(frozen=True)
class DefaultValue:
    cn_code: str
    country: str
    base_tco2_per_tonne: Decimal
    source: str
    version: str

    def marked_up(self, year: int, methodology: Methodology) -> Decimal:
        """Base value plus the mark up for the given year."""
        factor = Decimal("1") + methodology.markup_for(year)
        return self.base_tco2_per_tonne * factor


def pick_default(
    table: list[DefaultValue], cn_code: str, country: str
) -> DefaultValue:
    """Find the default for a product and country, else 'other'."""
    for row in table:
        if row.cn_code == cn_code and row.country == country:
            return row
    for row in table:
        if row.cn_code == cn_code and row.country == "other":
            return row
    raise LookupError(f"No default value for CN code {cn_code}")
