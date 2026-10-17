"""direct_emissions.py

WHAT THIS FILE DOES
    Adds up direct emissions: the CO2 released by burning fuel at the
    plant itself (coal, gas, diesel and so on).

CONCEPTS IN THIS FILE
    Direct emissions (also called scope 1)
        Emissions that come out of the plant's own chimneys and engines.
    FuelUse
        One fuel line: how much was burned and which factor applies.
"""

from dataclasses import dataclass

from certify_engine.emission_factors import EmissionFactor, apply_factor
from certify_engine.quantity import Quantity


@dataclass(frozen=True)
class FuelUse:
    """A confirmed amount of one fuel burned in the period."""

    fuel_name: str
    amount: Quantity
    factor: EmissionFactor


def total_direct_emissions(fuels: list[FuelUse]) -> Quantity:
    """Sum the CO2 from every fuel line."""
    total = Quantity(0, "tco2")
    for fuel in fuels:
        total = total + apply_factor(fuel.amount, fuel.factor)
    return total
