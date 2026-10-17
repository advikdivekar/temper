"""indirect_emissions.py

WHAT THIS FILE DOES
    Computes indirect emissions: the CO2 released by the power station
    that made the electricity the plant bought.

CONCEPTS IN THIS FILE
    Indirect emissions (also called scope 2)
        Emissions that happen elsewhere because of what we consume.
    Grid emission factor
        Tonnes of CO2 per kWh for the local electricity grid.
"""

from certify_engine.emission_factors import EmissionFactor, apply_factor
from certify_engine.quantity import Quantity


def indirect_emissions(
    electricity: Quantity, grid_factor: EmissionFactor
) -> Quantity:
    """CO2 caused by the electricity used in the period."""
    return apply_factor(electricity.to("kwh"), grid_factor)
