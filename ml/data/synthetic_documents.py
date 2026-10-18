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
    Held out layouts
        Layouts used ONLY to test, never to train or to write prompt
        examples. They measure whether a reader copes with a format it
        has not seen, which is what real customers will send.
    Scan noise
        Extra spaces, letters swapped for look alike digits inside words,
        and Hindi digits. Mimics what OCR makes of a crumpled scan. Noise
        never touches the numbers that carry the answer, except by
        switching them to Hindi digits, which the truth still matches.
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


def _electricity(rng: random.Random, i: int, layouts) -> SyntheticDocument:
    kwh = rng.randint(20_000, 900_000)
    layout = rng.choice(layouts or ["state_board", "private_utility", "mwh_style"])
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
    elif layout == "meter_readings":
        before = rng.randint(10_000, 500_000)
        text = (f"METER READING SHEET\nPeriod: {month}\nPrevious reading: {indian_grouping(before)}\n"
                f"Current reading: {indian_grouping(before + kwh)}\nMultiplier: 1 (readings in kWh)\n")
        value = float(kwh)
    else:
        mwh = kwh / 1000
        text = (f"HT CONSUMER ENERGY STATEMENT\nMonth: {month}\nActive energy import: {mwh:.2f} MWh\n"
                f"Net bill: Rs. {indian_grouping(amount)}\n")
        value = round(kwh / 1000 * 1000)  # reading is rounded to the MWh figure, so truth is that
        value = round(mwh, 2) * 1000
    return SyntheticDocument(f"elec_{i:04d}", "electricity_bill", layout, text, {"energy_kwh": value})


def _fuel(rng: random.Random, i: int, layouts) -> SyntheticDocument:
    layout = rng.choice(layouts or ["coal_tonnes", "gas_gj", "diesel_kl"])
    if layout == "coal_tonnes":
        qty = rng.randint(200, 20_000)
        text = (f"TAX INVOICE\nSeller: Bharat Coal Traders\nItem: Thermal coal (non-coking)\n"
                f"Quantity: {indian_grouping(qty)} MT\nRate: Rs {rng.randint(5000, 9000)} per MT\n")
        truth = {"fuel": "coal", "quantity": float(qty), "unit": "tonne"}
    elif layout == "coal_kg":
        tonnes = rng.randint(200, 20_000)
        text = (f"WEIGHBRIDGE SLIP\nMaterial: steam coal\nNet weight: {indian_grouping(tonnes * 1000)} kg\n"
                f"Truck: GJ{rng.randint(10, 39)}XY{rng.randint(1000, 9999)}\n")
        truth = {"fuel": "coal", "quantity": float(tonnes), "unit": "tonne"}
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


def _production(rng: random.Random, i: int, layouts) -> SyntheticDocument:
    product = rng.choice(["bolts", "nuts", "washers", "rivets"])
    tonnes = rng.randint(50, 3_000)
    layout = rng.choice(layouts or ["table_row", "sentence", "kg_style"])
    if layout == "table_row":
        text = f"PRODUCTION LOG - SHIFT SUMMARY\nProduct | Output (t)\n{product} | {indian_grouping(tonnes)}\n"
        value = float(tonnes)
    elif layout == "sentence":
        text = f"Monthly report: the plant produced {tonnes} tonnes of {product} this month.\n"
        value = float(tonnes)
    elif layout == "ledger_line":
        text = f"Stores ledger\nDate: 12/05/2026   {product.upper()}   Qty: {tonnes}.0 t   Status: dispatched\n"
        value = float(tonnes)
    else:
        text = f"Dispatch register\nItem: {product}\nTotal weight: {indian_grouping(tonnes * 1000)} kg\n"
        value = float(tonnes)
    return SyntheticDocument(f"prod_{i:04d}", "production_log", layout, text, {"product": product, "tonnes": value})


HELD_OUT = {
    "electricity_bill": ["meter_readings"],
    "fuel_invoice": ["coal_kg"],
    "production_log": ["ledger_line"],
}
HINDI = str.maketrans("0123456789", "\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f")


def add_scan_noise(text: str, rng: random.Random) -> str:
    """Make a clean document look like a poor scan. Answers stay valid."""
    lines = []
    for line in text.split("\n"):
        label, sep, rest = line.partition(":")
        if rng.random() < 0.3:
            label = label.replace("o", "0").replace("l", "1")   # in words only
        if rng.random() < 0.3:
            label = label.replace(" ", "  ")
        lines.append(label + sep + rest)
    noisy = "\n".join(lines)
    if rng.random() < 0.15:
        noisy = noisy.translate(HINDI)   # Hindi digits throughout
    return noisy


def generate(count_per_type: int = 40, seed: int = 7, noisy: bool = False,
             held_out: bool = False) -> list[SyntheticDocument]:
    """Make documents.

    noisy     add scan noise to every document
    held_out  use only the held out layouts (default: the known layouts)
    """
    rng = random.Random(seed)
    noise_rng = random.Random(seed + 1)   # separate, so noise never shifts the answers
    makers = {"electricity_bill": _electricity, "fuel_invoice": _fuel,
              "production_log": _production}
    docs = []
    for i in range(count_per_type):
        for doc_type, make in makers.items():
            layouts = HELD_OUT[doc_type] if held_out else None
            doc = make(rng, i, layouts)
            if noisy:
                text = add_scan_noise(doc.text, noise_rng)
                doc = SyntheticDocument(doc.doc_id, doc.doc_type, doc.layout,
                                        text, doc.truth)
            docs.append(doc)
    return docs


def hard_bench(count_per_type: int = 60) -> list[SyntheticDocument]:
    """The harder test: noisy known layouts plus noisy unseen layouts."""
    known = generate(count_per_type, seed=99, noisy=True)
    unseen = generate(count_per_type, seed=199, noisy=True, held_out=True)
    return known + unseen
