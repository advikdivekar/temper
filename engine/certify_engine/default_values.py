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
    CN code depth
        The table lists some codes at 4 or 6 digits and others at 8.
        A product uses the most specific listed code it falls under.
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
    description: str = ""

    def marked_up(self, year: int, methodology: Methodology) -> Decimal:
        """Base value plus the mark up for the given year."""
        factor = Decimal("1") + methodology.markup_for(year)
        return self.base_tco2_per_tonne * factor


def pick_default(
    table: list[DefaultValue], cn_code: str, country: str
) -> DefaultValue:
    """Find the default for a product and country.

    CN codes in the Commission's table are listed at different depths
    (for example 7318 15 covers every 8 digit code that starts with
    731815). We take the most specific listed code that the product's
    code starts with. If the country has no row, the "other countries"
    row for the same code is used.
    """
    digits = cn_code.replace(" ", "")
    for place in (country, "other"):
        rows = [
            r for r in table
            if r.country == place and digits.startswith(r.cn_code.replace(" ", ""))
        ]
        if rows:
            return max(rows, key=lambda r: len(r.cn_code.replace(" ", "")))
    raise LookupError(f"No default value for CN code {cn_code}")
