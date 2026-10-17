"""allocation.py

WHAT THIS FILE DOES
    Splits one plant total (for example total CO2) between several
    products so that the parts add back to exactly the total.

WHY IT EXISTS
    A plant burns fuel and uses power for many products at once. The
    rules say we must divide the total fairly. If the parts did not add
    up to the total, an auditor would reject the numbers.

CONCEPTS IN THIS FILE
    Allocation key
        The measure we split by. Here: tonnes of product made.
    Rounding drift
        Splitting 100 into three equal parts gives 33.33 each, which
        adds to 99.99. One hundredth has vanished.
    Largest remainder method
        The fix. Round each share down, then hand the leftover
        hundredths, one at a time, to the shares that lost the most.
        The parts now add up to the total exactly.
    Property test
        A test that checks a rule for many random inputs, for example
        "shares always add to the total". See tests/test_allocation.py.
"""

from decimal import Decimal, ROUND_FLOOR

# We keep six decimal places. This is the smallest step we hand out.
STEP = Decimal("0.000001")


def allocate(
    total: Decimal, weights: dict[str, Decimal]
) -> dict[str, Decimal]:
    """Split total by weights. Result values add up to total exactly."""
    weight_sum = sum(weights.values())
    if weight_sum <= 0:
        raise ValueError("Weights must add up to more than zero")
    if total < 0:
        raise ValueError("Total must not be negative")

    shares = {}
    remainders = {}
    for name, weight in weights.items():
        exact = total * weight / weight_sum
        rounded_down = exact.quantize(STEP, rounding=ROUND_FLOOR)
        shares[name] = rounded_down
        remainders[name] = exact - rounded_down

    # How many steps are still missing after rounding down.
    missing = total.quantize(STEP, rounding=ROUND_FLOOR) - sum(shares.values())
    steps_left = int(missing / STEP)

    # Give each missing step to the share that lost the most.
    by_loss = sorted(
        remainders, key=lambda name: remainders[name], reverse=True
    )
    for name in by_loss[:steps_left]:
        shares[name] += STEP

    return shares
