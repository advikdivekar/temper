"""synthetic_documents.py

WHAT THIS FILE DOES
    Generates fake but realistic factory documents, together with the
    correct answer for each. Three kinds: electricity bills, fuel
    invoices and production logs, each in several layouts.

WHY IT EXISTS
    We cannot train or measure an extractor without examples and answers.
    Real Indian bills are not available to us, so we make look alike
    ones. Everything here is SYNTHETIC. Any accuracy we report applies
    to these documents only, and the report must say so.

CONCEPTS IN THIS FILE
    Ground truth
        The known correct values, written down when the document is
        generated. The eval compares an extractor's answer to it.
    Layout variation
        The same facts written in different ways (different words,
        units, number formats). A reader that only works on one layout
        is useless, so variation is the whole point.
    Seeded randomness
        The same seed always gives the same documents, so results are
        reproducible and tests are stable.
    Indian number grouping
        India writes 125000 as 1,25,000. A common trap for readers.
"""

import random
from dataclasses import dataclass


@dataclass(frozen=True)
class SyntheticDocument:
    doc_id: str
    doc_type: str
    layout: str
    text: str
    truth: dict


def indian_grouping(number: int) -> str:
    """125000 becomes 1,25,000."""
    digits = str(number)
    if len(digits) <= 3:
        return digits
    head, tail = digits[:-3], digits[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return ",".join(groups + [tail])


def _electricity(rng: random.Random, i: int) -> SyntheticDocument:
    kwh = rng.randint(20_000, 900_000)
    layout = rng.choice(["state_board", "private_utility", "mwh_style"])
    month = rng.choice(["March 2026", "April 2026", "May 2026", "June 2026"])
    amount = kwh * rng.choice([6, 7, 8])
    if layout == "state_board":
        text = (f"STATE ELECTRICITY BOARD\nBill for {month}\nConsumer No {rng.randint(10**8, 10**9)}\n"
                f"Units consumed (kWh): {indian_grouping(kwh)}\nEnergy charges: Rs {indian_grouping(amount)}\n")
        value = float(kwh)
    elif layout == "private_utility":
        text = (f"Tata-style Power Distribution Ltd\nStatement period: {month}\n"
                f"Total energy used ..... {kwh:,} kWh\nAmount payable ..... INR {amount:,}\n")
        value = float(kwh)
    else:
        mwh = kwh / 1000
        text = (f"HT CONSUMER ENERGY STATEMENT\nMonth: {month}\nActive energy import: {mwh:.2f} MWh\n"
                f"Net bill: Rs. {indian_grouping(amount)}\n")
        value = round(kwh / 1000 * 1000)  # reading is rounded to the MWh figure, so truth is that
        value = round(mwh, 2) * 1000
    return SyntheticDocument(f"elec_{i:04d}", "electricity_bill", layout, text, {"energy_kwh": value})


def _fuel(rng: random.Random, i: int) -> SyntheticDocument:
    layout = rng.choice(["coal_tonnes", "gas_gj", "diesel_kl"])
    if layout == "coal_tonnes":
        qty = rng.randint(200, 20_000)
        text = (f"TAX INVOICE\nSeller: Bharat Coal Traders\nItem: Thermal coal (non-coking)\n"
                f"Quantity: {indian_grouping(qty)} MT\nRate: Rs {rng.randint(5000, 9000)} per MT\n")
        truth = {"fuel": "coal", "quantity": float(qty), "unit": "tonne"}
    elif layout == "gas_gj":
        qty = rng.randint(1_000, 90_000)
        text = (f"GAS SUPPLY INVOICE\nProduct: Natural gas (PNG)\nSupplied energy: {qty:,} GJ\n"
                f"Billing period: {rng.choice(['Q1', 'Q2', 'Q3'])} 2026\n")
        truth = {"fuel": "natural_gas", "quantity": float(qty), "unit": "gj"}
    else:
        qty = rng.randint(5, 400)
        text = (f"FUEL DELIVERY NOTE\nHigh speed diesel\nVolume delivered: {qty} KL\n"
                f"Vehicle: MH{rng.randint(10, 49)}AB{rng.randint(1000, 9999)}\n")
        truth = {"fuel": "diesel", "quantity": float(qty), "unit": "kl"}
    return SyntheticDocument(f"fuel_{i:04d}", "fuel_invoice", layout, text, truth)


def _production(rng: random.Random, i: int) -> SyntheticDocument:
    product = rng.choice(["bolts", "nuts", "washers", "rivets"])
    tonnes = rng.randint(50, 3_000)
    layout = rng.choice(["table_row", "sentence", "kg_style"])
    if layout == "table_row":
        text = f"PRODUCTION LOG - SHIFT SUMMARY\nProduct | Output (t)\n{product} | {indian_grouping(tonnes)}\n"
        value = float(tonnes)
    elif layout == "sentence":
        text = f"Monthly report: the plant produced {tonnes} tonnes of {product} this month.\n"
        value = float(tonnes)
    else:
        text = f"Dispatch register\nItem: {product}\nTotal weight: {indian_grouping(tonnes * 1000)} kg\n"
        value = float(tonnes)
    return SyntheticDocument(f"prod_{i:04d}", "production_log", layout, text, {"product": product, "tonnes": value})


def generate(count_per_type: int = 40, seed: int = 7) -> list[SyntheticDocument]:
    rng = random.Random(seed)
    docs = []
    for i in range(count_per_type):
        docs.append(_electricity(rng, i))
        docs.append(_fuel(rng, i))
        docs.append(_production(rng, i))
    return docs
