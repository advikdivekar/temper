"""precursors.py

WHAT THIS FILE DOES
    Works out the emissions carried in by precursors: input materials
    such as the steel a bolt maker buys.

CONCEPTS IN THIS FILE
    Precursor lot
        One purchase of a material from one source, in tonnes.
    Actual versus default
        Actual data is the supplier's own figure. The rules allow it
        only if it is verified by an accredited verifier. Otherwise the
        default value (with mark up) must be used. We record which one
        was used because it decides how much the buyer pays.
    Weighted average
        Several lots of the same material are combined by weighting
        each by its tonnes. Here this happens naturally because we
        add tonnes times intensity for every lot.
"""

from dataclasses import dataclass
from decimal import Decimal

from certify_engine.default_values import DefaultValue
from certify_engine.methodology import Methodology
from certify_engine.quantity import Quantity


@dataclass(frozen=True)
class PrecursorLot:
    material_name: str
    tonnes_used: Quantity
    default_value: DefaultValue
    actual_tco2_per_tonne: Decimal | None = None
    verified: bool = False
    source: str = ""  # supplier statement id when actual data is given


@dataclass(frozen=True)
class LotResult:
    emissions: Quantity
    intensity: Decimal
    basis: str  # "actual" or "default"
    line: str  # one trace line


def resolve_lot(
    lot: PrecursorLot, year: int, methodology: Methodology
) -> LotResult:
    """Choose actual or default intensity and compute the lot's CO2."""
    use_actual = lot.actual_tco2_per_tonne is not None and lot.verified
    if use_actual:
        intensity = lot.actual_tco2_per_tonne
        basis = "actual"
    else:
        intensity = lot.default_value.marked_up(year, methodology)
        basis = "default"

    tonnes = lot.tonnes_used.to("tonne")
    emissions = Quantity(tonnes.value * intensity, "tco2")
    line = (
        f"Precursor {lot.material_name}: {tonnes.value} t at "
        f"{intensity} tCO2 per tonne ({basis}) = {emissions.value} tCO2"
    )
    return LotResult(emissions, intensity, basis, line)


def precursor_emissions(
    lots: list[PrecursorLot], year: int, methodology: Methodology
) -> tuple[Quantity, list[LotResult]]:
    """Total CO2 from all lots, plus the detail for each lot."""
    total = Quantity(0, "tco2")
    results = []
    for lot in lots:
        result = resolve_lot(lot, year, methodology)
        total = total + result.emissions
        results.append(result)
    return total, results
