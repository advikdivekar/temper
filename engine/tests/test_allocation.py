"""test_allocation.py

Example test plus property tests. A property test runs the same check
on many random inputs, which finds edge cases we would never think of.
"""

from decimal import Decimal

from hypothesis import given, strategies as st

from certify_engine.allocation import allocate


def test_three_equal_parts_add_back_to_total():
    shares = allocate(Decimal("100"), {"a": 1, "b": 1, "c": 1})
    assert sum(shares.values()) == Decimal("100")


# Random totals with at most six decimals and random positive weights.
totals = st.decimals(min_value=0, max_value=10**6, places=6)
weights = st.dictionaries(
    keys=st.sampled_from(["a", "b", "c", "d", "e"]),
    values=st.decimals(min_value=1, max_value=1000, places=3),
    min_size=1,
)


@given(total=totals, weights=weights)
def test_shares_always_add_to_total(total, weights):
    shares = allocate(total, weights)
    assert sum(shares.values()) == total


@given(total=totals, weights=weights)
def test_no_share_is_negative(total, weights):
    shares = allocate(total, weights)
    assert all(value >= 0 for value in shares.values())
