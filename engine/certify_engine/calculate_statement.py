"""calculate_statement.py

WHAT THIS FILE DOES
    The main entry point of the engine. Takes confirmed plant data for
    one period and returns the emissions per tonne for each product,
    together with a trace that shows every step.

HOW THE CALCULATION GOES
    1. Direct emissions from fuel
    2. Indirect emissions from electricity
    3. Emissions carried in by precursors
    4. Add them into one plant total
    5. Split the total across products (allocation)
    6. Divide each share by that product's tonnes
       to get specific embedded emissions (tCO2 per tonne)

CONCEPTS IN THIS FILE
    Pure function
        A function with no side effects. It reads nothing from a
        database and calls no AI. Same input, same output, always.
        This is what lets an auditor re-run a number.
    Trace
        A list of plain text steps recording how each number arose.
        Verifiers read the trace instead of trusting a black box.
    Specific embedded emissions (SEE)
        Tonnes of CO2 per tonne of product. The number buyers need.
    Simplification
        This first version allocates every emission source by tonnes
        of product. The real rules are more detailed. We refine them
        as we encode the official methodology.
"""

from dataclasses import dataclass
from decimal import Decimal

from certify_engine.allocation import allocate
from certify_engine.direct_emissions import FuelUse, total_direct_emissions
from certify_engine.emission_factors import EmissionFactor
from certify_engine.indirect_emissions import indirect_emissions
from certify_engine.precursors import PrecursorUse, precursor_emissions
from certify_engine.quantity import Quantity


@dataclass(frozen=True)
class ProductOutput:
    """One product made in the period."""

    name: str
    tonnes_made: Decimal


@dataclass(frozen=True)
class PlantData:
    """Everything confirmed about the plant for one period."""

    fuels: list[FuelUse]
    electricity: Quantity
    grid_factor: EmissionFactor
    precursors: list[PrecursorUse]
    products: list[ProductOutput]


@dataclass(frozen=True)
class StatementResult:
    """What the engine returns."""

    total_tco2: Decimal
    see_by_product: dict[str, Decimal]
    trace: list[str]


def calculate_statement(plant: PlantData) -> StatementResult:
    trace = []

    direct = total_direct_emissions(plant.fuels)
    trace.append(f"Direct emissions: {direct.value} tCO2")

    indirect = indirect_emissions(plant.electricity, plant.grid_factor)
    trace.append(f"Indirect emissions: {indirect.value} tCO2")

    carried = precursor_emissions(plant.precursors)
    trace.append(f"Precursor emissions: {carried.value} tCO2")

    total = direct + indirect + carried
    # Round to six places so allocation can split it exactly.
    total = Quantity(total.value.quantize(Decimal("0.000001")), "tco2")
    trace.append(f"Plant total: {total.value} tCO2")

    weights = {p.name: p.tonnes_made for p in plant.products}
    shares = allocate(total.value, weights)

    see_by_product = {}
    for product in plant.products:
        share = shares[product.name]
        see = share / product.tonnes_made
        see_by_product[product.name] = see
        trace.append(
            f"{product.name}: share {share} tCO2 over "
            f"{product.tonnes_made} t gives {see} tCO2 per tonne"
        )

    return StatementResult(total.value, see_by_product, trace)
