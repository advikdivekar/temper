"""emission_factors.py

WHAT THIS FILE DOES
    Defines EmissionFactor: a reference number that converts an amount of
    activity into emissions. Example: burning 1 tonne of coal emits about
    2.4 tonnes of CO2, so factor value = 2.4 per unit "tonne".

CONCEPTS IN THIS FILE
    Emission factor
        Emissions released per one unit of activity.
    Source and version
        Every factor records where it came from and which edition it is.
        When a factor changes, we add a new version. We never edit the
        old one, so old statements can be recalculated exactly.
    apply_factor
        The one function that multiplies activity by a factor. It checks
        that the activity unit matches the unit the factor expects.
"""

from dataclasses import dataclass
from decimal import Decimal

from certify_engine.quantity import Quantity, UnitError


@dataclass(frozen=True)
class EmissionFactor:
    """Tonnes of CO2 emitted per one unit of an activity."""

    name: str
    value: Decimal
    per_unit: str
    source: str
    version: str


def apply_factor(activity: Quantity, factor: EmissionFactor) -> Quantity:
    """Return the emissions caused by an activity, in tonnes of CO2."""
    if activity.unit != factor.per_unit:
        raise UnitError(
            f"Factor {factor.name} expects {factor.per_unit}, "
            f"got {activity.unit}"
        )
    return Quantity(activity.value * factor.value, "tco2")
