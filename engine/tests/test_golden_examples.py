"""test_golden_examples.py

Golden tests: the engine must reproduce the Commission's own worked
examples. If it does not, it is wrong, whatever else is true.

Sources (both published by the European Commission):
  * Guidance No. 5d, Sector specific guidance on iron and steel,
    section 4.3, Example 3: production of screws and nuts from
    purchased steel rods (Tables 4-12 and 4-13).
  * Guidance No. 3, CBAM methods for the calculation of emissions
    embedded in goods, section 4.3.3: attribution across cement
    products with different clinker content.

The guidance tables show three decimals and add rounded parts, so we
compare within 0.0015.
"""

from decimal import Decimal

import pytest

from certify_engine.allocation import allocate
from certify_engine.calculate_statement import (
    PlantData, ProductOutput, calculate_statement,
)
from certify_engine.default_values import DefaultValue, pick_default
from certify_engine.direct_emissions import FuelUse
from certify_engine.emission_factors import EmissionFactor
from certify_engine.methodology import STEEL_AND_ALUMINIUM_V1
from certify_engine.precursors import PrecursorLot
from certify_engine.quantity import Quantity

GAS = EmissionFactor(
    "natural_gas", Decimal("0.0561"), "gj",
    "56.1 tCO2 per TJ, as used in Guidance No. 5d Table 4-12", "guidance",
)
GRID = EmissionFactor("grid", Decimal("0"), "kwh", "not counted", "v1")
NO_DEFAULT = DefaultValue("7208", "IN", Decimal("4.28"), "test", "v1")


def tol(a: Decimal, b: str) -> bool:
    return abs(a - Decimal(b)) <= Decimal("0.0015")


def example_three_plant():
    # 3.5 GJ of natural gas per tonne of product, both product groups.
    gas_gj = Decimal("3.5") * (17000 + 8200)
    return PlantData(
        year=2026,
        fuels=[FuelUse("natural_gas", Quantity(gas_gj, "gj"), GAS)],
        electricity=Quantity(0, "kwh"),
        grid_factor=GRID,
        precursors=[
            PrecursorLot(
                "carbon steel rods", Quantity(20000, "tonne"), NO_DEFAULT,
                actual_tco2_per_tonne=Decimal("1.567"), verified=True,
                used_for="carbon_screws_nuts",
            ),
            PrecursorLot(
                "high alloy steel rods", Quantity(10000, "tonne"), NO_DEFAULT,
                actual_tco2_per_tonne=Decimal("1.783"), verified=True,
                used_for="alloy_screws_nuts",
            ),
        ],
        products=[
            ProductOutput("carbon_screws_nuts", Decimal("17000"), "73181290"),
            ProductOutput("alloy_screws_nuts", Decimal("8200"), "73181210"),
        ],
    )


def test_guidance_example_three_carbon_steel_screws_and_nuts():
    result = calculate_statement(example_three_plant(), STEEL_AND_ALUMINIUM_V1)
    # Table 4-13: total SEE 2,039 tCO2 per tonne.
    assert tol(result.see_by_product["carbon_screws_nuts"], "2.039")


def test_guidance_example_three_alloy_steel_screws_and_nuts():
    result = calculate_statement(example_three_plant(), STEEL_AND_ALUMINIUM_V1)
    # Table 4-13: total SEE 2,371 tCO2 per tonne.
    assert tol(result.see_by_product["alloy_screws_nuts"], "2.371")


def test_guidance_example_three_own_direct_emissions_per_tonne():
    result = calculate_statement(example_three_plant(), STEEL_AND_ALUMINIUM_V1)
    products = result.breakdown["products"]
    own = Decimal(products["carbon_screws_nuts"]["direct"]) / Decimal("17000")
    assert tol(own, "0.196")  # Table 4-13: direct emissions 0,196


def test_precursor_for_one_product_never_reaches_the_other():
    plant = example_three_plant()
    without_alloy = PlantData(
        plant.year, plant.fuels, plant.electricity, plant.grid_factor,
        [plant.precursors[0]], plant.products,
    )
    first = calculate_statement(plant, STEEL_AND_ALUMINIUM_V1)
    second = calculate_statement(without_alloy, STEEL_AND_ALUMINIUM_V1)
    assert (
        first.see_by_product["carbon_screws_nuts"]
        == second.see_by_product["carbon_screws_nuts"]
    )


def test_guidance_three_cement_attribution_by_clinker():
    # Section 4.3.3: 125,000 tCO2 across three cement products.
    tonnes = {"grey": 50000, "white": 40000, "mixed": 60000}
    clinker_share = {"grey": "0.95", "white": "0.98", "mixed": "0.97"}
    clinker = {k: Decimal(tonnes[k]) * Decimal(clinker_share[k]) for k in tonnes}
    assert sum(clinker.values()) == Decimal("144900")

    shares = allocate(Decimal("125000"), clinker)
    assert sum(shares.values()) == Decimal("125000")
    see = {k: shares[k] / Decimal(tonnes[k]) for k in tonnes}
    assert tol(Decimal("125000") / Decimal("144900"), "0.863")  # per t clinker
    assert tol(see["grey"], "0.820")
    assert tol(see["white"], "0.845")
    assert tol(see["mixed"], "0.837")


def test_negative_attributed_direct_emissions_are_set_to_zero():
    coal = EmissionFactor("coal", Decimal("2.4"), "tonne", "test", "v1")
    plant = PlantData(
        year=2026,
        fuels=[FuelUse("heat_credit", Quantity("-10", "tonne"), coal)],
        electricity=Quantity(0, "kwh"),
        grid_factor=GRID,
        precursors=[],
        products=[ProductOutput("bolts", Decimal("100"), "73181590")],
    )
    result = calculate_statement(plant, STEEL_AND_ALUMINIUM_V1)
    assert result.see_by_product["bolts"] == Decimal("0.00000")
    assert any("set to zero" in line for line in result.trace)


def test_default_value_uses_the_most_specific_listed_code():
    table = [
        DefaultValue("7318 15", "IN", Decimal("5.72"), "t", "v1"),
        DefaultValue("7318 15", "other", Decimal("4.801"), "t", "v1"),
        DefaultValue("7318 16", "other", Decimal("4.693"), "t", "v1"),
    ]
    assert pick_default(table, "73181590", "IN").base_tco2_per_tonne == Decimal("5.72")
    # No Indian row for nuts, so the other countries row applies.
    assert pick_default(table, "73181600", "IN").base_tco2_per_tonne == Decimal("4.693")
    with pytest.raises(LookupError):
        pick_default(table, "9999", "IN")
