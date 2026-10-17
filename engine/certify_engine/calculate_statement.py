"""calculate_statement.py

WHAT THIS FILE DOES
    The main entry point of the engine. Takes confirmed plant data for
    one period and returns the emissions per tonne for each product,
    together with a trace that shows every step.

HOW THE CALCULATION GOES
    1. Direct emissions from fuel
    2. Indirect emissions from electricity (only if the rules count it)
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
    Attribution key
        Emissions are split by the functional unit of each good, which
        for metal goods is the tonne (Implementing Regulation 2025/2547,
        Annex III). Plants that need molar ratios or heat flow rules
        are outside this version.
    Methodology
        The rule set in force. It decides whether electricity counts,
        and how many decimals the result carries.
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from certify_engine.allocation import allocate
from certify_engine.direct_emissions import FuelUse, total_direct_emissions
from certify_engine.emission_factors import EmissionFactor
from certify_engine.indirect_emissions import indirect_emissions
from certify_engine.methodology import Methodology
from certify_engine.precursors import PrecursorLot, precursor_emissions
from certify_engine.quantity import Quantity


@dataclass(frozen=True)
class ProductOutput:
    """One product made in the period."""

    name: str
    tonnes_made: Decimal
    cn_code: str = ""


@dataclass(frozen=True)
class PlantData:
    """Everything confirmed about the plant for one period."""

    year: int
    fuels: list[FuelUse]
    electricity: Quantity
    grid_factor: EmissionFactor
    precursors: list[PrecursorLot]
    products: list[ProductOutput]


@dataclass(frozen=True)
class StatementResult:
    """What the engine returns."""

    methodology: str
    total_tco2: Decimal
    see_by_product: dict[str, Decimal]
    trace: list[str]
    # Plain numbers for screens: direct, indirect, precursor totals,
    # plus one entry per precursor lot and one per product.
    breakdown: dict


def round_see(value: Decimal, decimals: int) -> Decimal:
    """Round SEE to the number of decimals the rules allow."""
    step = Decimal(1).scaleb(-decimals)
    return value.quantize(step, rounding=ROUND_HALF_UP)


def calculate_statement(
    plant: PlantData, methodology: Methodology
) -> StatementResult:
    trace = [f"Methodology {methodology.name} v{methodology.version}"]

    def six(value: Decimal) -> str:
        return str(value.quantize(Decimal("0.000001")))

    direct = total_direct_emissions(plant.fuels)
    trace.append(f"Direct emissions: {six(direct.value)} tCO2")

    if methodology.includes_indirect:
        indirect = indirect_emissions(plant.electricity, plant.grid_factor)
        trace.append(f"Indirect emissions: {six(indirect.value)} tCO2")
    else:
        indirect = Quantity(0, "tco2")
        trace.append("Indirect emissions: not counted for these goods")

    _, lots = precursor_emissions(plant.precursors, plant.year, methodology)
    trace.extend(lot.line for lot in lots)

    # Attributed emissions of the installation itself. If they come out
    # negative they are set to zero (Guidance No. 3, section 4.3.1).
    own = direct + indirect
    own_value = own.value
    if own_value < 0:
        trace.append("Attributed direct emissions are negative: set to zero")
        own_value = Decimal("0")
    own_value = own_value.quantize(Decimal("0.000001"))

    names = [p.name for p in plant.products]
    weights = {p.name: p.tonnes_made for p in plant.products}

    # The installation's own emissions are split pro rata by tonnes of
    # product. Precursors given for one product stay with that product.
    # Shared precursors are split pro rata by tonnes as well.
    own_share = allocate(own_value, weights)
    shared_total = sum(
        (lot.emissions.value for lot in lots if lot.used_for is None),
        Decimal("0"),
    ).quantize(Decimal("0.000001"))
    shared_share = allocate(shared_total, weights)

    for lot in lots:
        if lot.used_for is not None and lot.used_for not in names:
            raise ValueError(f"Precursor is for unknown product {lot.used_for}")

    see_by_product, by_product = {}, {}
    plant_total = Decimal("0")
    for product in plant.products:
        specific = sum(
            (lot.emissions.value for lot in lots if lot.used_for == product.name),
            Decimal("0"),
        )
        total_i = (
            own_share[product.name] + shared_share[product.name] + specific
        ).quantize(Decimal("0.000001"))
        see = round_see(total_i / product.tonnes_made, methodology.see_decimals)
        see_by_product[product.name] = see
        by_product[product.name] = {
            "tonnes": str(product.tonnes_made),
            "cn_code": product.cn_code,
            "direct": str(own_share[product.name]),
            "precursor": str((shared_share[product.name] + specific).quantize(Decimal("0.000001"))),
            "total": str(total_i),
        }
        plant_total += total_i
        trace.append(
            f"{product.name}: {total_i} tCO2 over "
            f"{product.tonnes_made} t gives {see} tCO2 per tonne"
        )

    carried = sum((lot.emissions.value for lot in lots), Decimal("0"))
    trace.insert(len(trace) - len(plant.products), f"Plant total: {plant_total.quantize(Decimal('0.000001'))} tCO2")

    breakdown = {
        "direct": six(own_value if not methodology.includes_indirect else direct.value),
        "indirect": six(indirect.value),
        "precursor": six(carried),
        "lots": [
            {
                "material": lot.material,
                "tonnes": str(lot.tonnes),
                "intensity": str(lot.intensity),
                "basis": lot.basis,
                "tco2": six(lot.emissions.value),
                "used_for": lot.used_for,
            }
            for lot in lots
        ],
        "products": by_product,
    }
    return StatementResult(
        methodology=f"{methodology.name}:{methodology.version}",
        total_tco2=plant_total.quantize(Decimal("0.000001")),
        see_by_product=see_by_product,
        trace=trace,
        breakdown=breakdown,
    )
