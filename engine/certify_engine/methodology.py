"""methodology.py

WHAT THIS FILE DOES
    Holds the rule set (methodology) a calculation runs under, so rules
    are data we version, not numbers buried inside formulas.

WHY IT EXISTS
    CBAM rules change over time and differ by sector. A methodology
    object lets every statement record exactly which rules produced it,
    and lets us replay an old statement with its old rules.

CONCEPTS IN THIS FILE
    Methodology pack
        A named, versioned bundle of rules. A rule change is a new
        pack version. We never edit an old version.
    Annex II goods
        Goods such as iron, steel and aluminium. For these, CBAM counts
        direct emissions only. Electricity (indirect) emissions are
        left out. Source: Implementing Regulation (EU) 2025/2547,
        article 3(2). Other goods, such as cement and fertilisers,
        also count indirect emissions.
    Default value mark up
        Default values rise by a fixed percentage each year to push
        suppliers toward real data. 10 percent in 2026, 20 percent in
        2027, 30 percent from 2028 (Implementing Regulation 2025/2621,
        as reported by secondary sources, to be re checked).
    SEE decimals
        Specific embedded emissions are reported with at most five
        digits after the decimal point (Annex II, A.1(8)).
"""

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Methodology:
    name: str
    version: str
    includes_indirect: bool
    see_decimals: int
    markup_by_year: dict[int, Decimal]

    def markup_for(self, year: int) -> Decimal:
        """Mark up for a year. Years after the last listed use the last."""
        known_years = sorted(self.markup_by_year)
        if year < known_years[0]:
            return Decimal("0")
        applicable = [y for y in known_years if y <= year]
        return self.markup_by_year[applicable[-1]]


# Iron, steel and aluminium goods: direct emissions only.
STEEL_AND_ALUMINIUM_V1 = Methodology(
    name="cbam_steel_and_aluminium",
    version="1",
    includes_indirect=False,
    see_decimals=5,
    markup_by_year={
        2026: Decimal("0.10"),
        2027: Decimal("0.20"),
        2028: Decimal("0.30"),
    },
)
