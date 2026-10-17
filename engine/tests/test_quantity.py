"""test_quantity.py

Checks that Quantity converts units correctly and refuses bad mixes.
"""

import pytest
from decimal import Decimal

from certify_engine.quantity import Quantity, UnitError


def test_tonne_converts_to_kg():
    assert Quantity("2", "tonne").to("kg").value == Decimal("2000")


def test_adding_same_family_converts_units():
    total = Quantity("1", "tonne") + Quantity("500", "kg")
    assert total == Quantity("1.5", "tonne")


def test_adding_energy_to_mass_is_refused():
    with pytest.raises(UnitError):
        Quantity("1", "kwh") + Quantity("1", "tonne")


def test_unknown_unit_is_refused():
    with pytest.raises(UnitError):
        Quantity("1", "banana")
