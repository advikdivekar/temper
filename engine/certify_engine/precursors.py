"""precursors.py

WHAT THIS FILE DOES
    Handles precursors: input materials that already carry emissions,
    such as the steel a bolt maker buys.

CONCEPTS IN THIS FILE
    Precursor
        An input whose own production emissions count toward your
        product.
    Actual versus default
        If the supplier gives a verified figure we use it (actual). If
        not, we must use the EU default value, which is set high.
        We record which one was used, because it matters to the buyer.
"""

from dataclasses import dataclass
from decimal import Decimal

from certify_engine.quantity import Quantity


@dataclass(frozen=True)
class PrecursorUse:
    """A material input and the emissions it carries per tonne."""

    material_name: str
    tonnes_used: Quantity
    tco2_per_tonne: Decimal
    basis: str  # "actual" or "default"
    source: str  # supplier statement id or default value reference


def precursor_emissions(precursors: list[PrecursorUse]) -> Quantity:
    """Total CO2 carried in by all precursors."""
    total = Quantity(0, "tco2")
    for item in precursors:
        tonnes = item.tonnes_used.to("tonne")
        total = total + Quantity(
            tonnes.value * item.tco2_per_tonne, "tco2"
        )
    return total
