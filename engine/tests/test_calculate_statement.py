"""test_calculate_statement.py

End to end tests of the engine with small hand checked numbers.
Later we add the EU Commission worked examples as golden tests.
"""

from decimal import Decimal

from certify_engine.calculate_statement import (
    PlantData,
    ProductOutput,
    calculate_statement,
)
from certify_engine.default_values import DefaultValue
from certify_engine.direct_emissions import FuelUse
from certify_engine.emission_factors import EmissionFactor
from certify_engine.methodology import Methodology, STEEL_AND_ALUMINIUM_V1
from certify_engine.precursors import PrecursorLot
from certify_engine.quantity import Quantity

COAL = EmissionFactor("coal", Decimal("2.4"), "tonne", "test", "v1")
GRID = EmissionFactor("grid", Decimal("0.0008"), "kwh", "test", "v1")
STEEL_DEFAULT = DefaultValue("7208", "IN", Decimal("2"), "test", "v1")

WITH_INDIRECT = Methodology(
    "test_with_indirect", "1", True, 5,
    {2026: Decimal("0.10")},
)


def make_plant(verified=False, actual=None):
    return PlantData(
        year=2026,
        fuels=[FuelUse("coal", Quantity("10", "tonne"), COAL)],
        electricity=Quantity("50000", "kwh"),
        grid_factor=GRID,
        precursors=[
            PrecursorLot(
                "steel", Quantity("100", "tonne"), STEEL_DEFAULT,
                actual_tco2_per_tonne=actual, verified=verified,
            )
        ],
        products=[
            ProductOutput("bolts", Decimal("60")),
            ProductOutput("nuts", Decimal("40")),
        ],
    )


def test_steel_rules_leave_out_electricity():
    # direct 24 + precursor 100 t x (2 x 1.10) = 244 total
    result = calculate_statement(make_plant(), STEEL_AND_ALUMINIUM_V1)
    assert result.total_tco2 == Decimal("244.000000")


def test_rules_that_count_electricity_add_it():
    # 24 direct + 40 indirect + 220 precursor = 284
    result = calculate_statement(make_plant(), WITH_INDIRECT)
    assert result.total_tco2 == Decimal("284.000000")


def test_unverified_actual_data_falls_back_to_default():
    result = calculate_statement(
        make_plant(verified=False, actual=Decimal("1")),
        STEEL_AND_ALUMINIUM_V1,
    )
    assert result.total_tco2 == Decimal("244.000000")


def test_verified_actual_data_is_used_and_lowers_the_result():
    # direct 24 + precursor 100 x 1 = 124
    result = calculate_statement(
        make_plant(verified=True, actual=Decimal("1")),
        STEEL_AND_ALUMINIUM_V1,
    )
    assert result.total_tco2 == Decimal("124.000000")
    assert any("(actual)" in line for line in result.trace)


def test_see_has_at_most_five_decimals():
    result = calculate_statement(make_plant(), STEEL_AND_ALUMINIUM_V1)
    see = result.see_by_product["bolts"]
    assert see == Decimal("2.44000")
    assert -see.as_tuple().exponent <= 5


def test_same_input_gives_same_output():
    first = calculate_statement(make_plant(), STEEL_AND_ALUMINIUM_V1)
    second = calculate_statement(make_plant(), STEEL_AND_ALUMINIUM_V1)
    assert first == second
