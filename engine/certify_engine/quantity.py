"""quantity.py

WHAT THIS FILE DOES
    Defines Quantity: a number that always travels with its unit.
    Example: Quantity("1500", "kwh") means 1500 kilowatt hours.

WHY IT EXISTS
    Many carbon calculation bugs come from mixing units, such as adding
    kilowatt hours to tonnes, or using kilograms where tonnes were
    expected. A bare number cannot warn you. A Quantity can.

CONCEPTS IN THIS FILE
    Decimal
        Python's exact decimal number type. Floats store 0.1 as an
        approximation, so sums drift. Audits need exact results.
    dataclass(frozen=True)
        A small class that only holds data. "frozen" means it cannot be
        changed after creation, so a Quantity never changes under you.
    Unit family
        Units that measure the same kind of thing (kg and tonne are
        both mass). We only convert inside a family.
    Conversion factor
        How many base units one unit is worth. 1 tonne = 1000 kg.
"""

from dataclasses import dataclass
from decimal import Decimal


# Each unit maps to (family, how many base units it equals).
# The base unit of mass is kg. The base unit of energy is kwh.
UNITS = {
    "kg": ("mass", Decimal("1")),
    "tonne": ("mass", Decimal("1000")),
    "kwh": ("energy", Decimal("1")),
    "mwh": ("energy", Decimal("1000")),
    "gj": ("energy", Decimal("277.77777777777777777777777778")),
    "tj": ("energy", Decimal("277777.77777777777777777777778")),
    "tco2": ("emissions", Decimal("1")),
    "kgco2": ("emissions", Decimal("0.001")),
}


class UnitError(ValueError):
    """Raised when units are unknown or cannot be mixed."""


@dataclass(frozen=True)
class Quantity:
    """An exact amount with a unit."""

    value: Decimal
    unit: str

    def __post_init__(self):
        # Accept strings or ints for convenience, store as Decimal.
        object.__setattr__(self, "value", Decimal(str(self.value)))
        if self.unit not in UNITS:
            raise UnitError(f"Unknown unit: {self.unit}")

    def family(self) -> str:
        return UNITS[self.unit][0]

    def to(self, target_unit: str) -> "Quantity":
        """Convert to another unit in the same family."""
        if target_unit not in UNITS:
            raise UnitError(f"Unknown unit: {target_unit}")
        if UNITS[target_unit][0] != self.family():
            raise UnitError(
                f"Cannot convert {self.unit} to {target_unit}"
            )
        base_amount = self.value * UNITS[self.unit][1]
        return Quantity(base_amount / UNITS[target_unit][1], target_unit)

    def __add__(self, other: "Quantity") -> "Quantity":
        """Add two quantities. Units must be in the same family."""
        if other.family() != self.family():
            raise UnitError(
                f"Cannot add {self.unit} and {other.unit}"
            )
        converted = other.to(self.unit)
        return Quantity(self.value + converted.value, self.unit)

    def scale(self, factor) -> "Quantity":
        """Multiply by a plain number, keeping the same unit."""
        return Quantity(self.value * Decimal(str(factor)), self.unit)
