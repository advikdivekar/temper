"""test_calculate_statement.py

End to end test of the engine with small hand checked numbers.
Later we add the EU Commission worked examples as golden tests.
"""

from decimal import Decimal

from certify_engine.calculate_statement import (
    PlantData,
    ProductOutput,
    calculate_statement,
)
from certify_engine.direct_emissions import FuelUse
from certify_engine.emission_factors import EmissionFactor
from certify_engine.precursors import PrecursorUse
from certify_engine.quantity import Quantity

COAL = EmissionFactor("coal", Decimal("2.4"), "tonne", "test", "v1")
GRID = EmissionFactor("grid", Decimal("0.0008"), "kwh", "test", "v1")


def make_plant():
    return PlantData(
        fuels=[FuelUse("coal", Quantity("10", "tonne"), COAL)],
        electricity=Quantity("50000", "kwh"),
        grid_factor=GRID,
        precursors=[
            PrecursorUse(
                "steel", Quantity("100", "tonne"), Decimal("2"),
                "default", "eu default 2026",
            )
        ],
        products=[
            ProductOutput("bolts", Decimal("60")),
            ProductOutput("nuts", Decimal("40")),
        ],
    )


def test_plant_total_is_hand_checked():
    # direct 24 + indirect 40 + precursor 200 = 264
    result = calculate_statement(make_plant())
    assert result.total_tco2 == Decimal("264")


def test_see_per_product_is_equal_when_split_by_tonnes():
    result = calculate_statement(make_plant())
    assert result.see_by_product["bolts"] == Decimal("2.64")
    assert result.see_by_product["nuts"] == Decimal("2.64")


def test_same_input_gives_same_output():
    first = calculate_statement(make_plant())
    second = calculate_statement(make_plant())
    assert first == second
