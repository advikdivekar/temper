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
    Balanced digit lengths
        Training numbers are spread over short and long values. A model
        cannot extrapolate to a length it never saw.
    Raw terms
        What a reader copies from the page before any arithmetic, kept
        beside the truth so we can train and test copying separately.
    Seeded randomness
        The same seed always gives the same documents, so results are
        reproducible and tests are stable.
    Indian number grouping
        India writes 125000 as 1,25,000. A common trap for readers.
    Skills layouts
        Training only. New wordings that need subtraction or unit
        conversion, so the model learns the skill, not one format.
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
    # What a reader should COPY from the page, before any arithmetic:
    # {"op": "single" | "sum" | "diff", "terms": [[number, "unit"], ...]}
    # plus "fuel" or "product" where the type has one. Code turns this into
    # the truth. See ml/extraction/calculate.py.
    raw: dict | None = None


class BalancedRandom(random.Random):
    """A random generator whose randint spreads over digit LENGTHS.

    Plain randint(20000, 900000) almost never gives a short number, so a
    model trained on it never learns short ones. Here a big range first
    picks a digit count, then a number with that many digits. Used for
    training data only: the test benches keep the plain generator.
    """

    def randint(self, a, b):
        if b < 100:
            return super().randint(a, b)
        digits = super().randint(max(len(str(a)) - 2, 1), len(str(b)) + 1)
        return super().randint(10 ** (digits - 1), 10 ** digits - 1)


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
    raw = {"op": "single", "terms": [[kwh, "kwh"]]}
    if layout == "state_board":
        text = (f"STATE ELECTRICITY BOARD\nBill for {month}\nConsumer No {rng.randint(10**8, 10**9)}\n"
                f"Units consumed (kWh): {indian_grouping(kwh)}\nEnergy charges: Rs {indian_grouping(amount)}\n")
        value = float(kwh)
    elif layout == "private_utility":
        text = (f"Tata-style Power Distribution Ltd\nStatement period: {month}\n"
                f"Total energy used ..... {kwh:,} kWh\nAmount payable ..... INR {amount:,}\n")
        value = float(kwh)
    elif layout == "opening_closing":
        before = rng.randint(10_000, 500_000)
        text = (f"ENERGY CONSUMPTION NOTE\nBilling month: {month}\nOpening: {before:,} kWh\n"
                f"Closing: {before + kwh:,} kWh\n")
        value = float(kwh)
        raw = {"op": "diff", "terms": [[before + kwh, "kwh"], [before, "kwh"]]}
    elif layout == "gwh_style":
        gwh = rng.randint(20, 900) / 1000
        text = f"ANNUAL TARIFF STATEMENT\nMonth: {month}\nTotal import: {gwh:.3f} GWh\nDemand charge: Rs {amount:,}\n"
        value = round(gwh * 1_000_000)
        raw = {"op": "single", "terms": [[gwh, "gwh"]]}
    elif layout == "dated_readings":
        before = rng.randint(10_000, 500_000)
        text = (f"READING LOG\nOn 01 {month.split()[0]}: {indian_grouping(before)}\n"
                f"On 30 {month.split()[0]}: {indian_grouping(before + kwh)}\nUnit: kWh. Usage is the difference.\n")
        value = float(kwh)
        raw = {"op": "diff", "terms": [[before + kwh, "kwh"], [before, "kwh"]]}
    elif layout == "counter_start_end":
        before = rng.randint(10_000, 500_000)
        text = (f"TRANSFORMER LOG\nMonth: {month}\nCounter at start: {indian_grouping(before)}\n"
                f"Counter at end: {indian_grouping(before + kwh)}\nAll values in kWh\n")
        value = float(kwh)
        raw = {"op": "diff", "terms": [[before + kwh, "kwh"], [before, "kwh"]]}
    elif layout == "present_previous_mwh":
        start = rng.randint(1_000, 90_000)          # hundredths of an MWh
        step = rng.randint(100, 9_000)
        text = (f"HT METER STATEMENT\nMonth: {month}\nPrevious: {start / 100:.2f} MWh\n"
                f"Present: {(start + step) / 100:.2f} MWh\n")
        value = float(step * 10)
        raw = {"op": "diff", "terms": [[round((start + step) / 100, 2), "mwh"],
                                       [round(start / 100, 2), "mwh"]]}
    elif layout == "two_meters":
        first = rng.randint(5_000, 400_000)
        second = rng.randint(5_000, 400_000)
        text = (f"PLANT ENERGY SUMMARY\nMonth: {month}\nMeter A: {first:,} kWh\n"
                f"Meter B: {second:,} kWh\nTotal is the sum of both meters.\n")
        value = float(first + second)
        raw = {"op": "sum", "terms": [[first, "kwh"], [second, "kwh"]]}
    elif layout == "meter_readings":
        before = rng.randint(10_000, 500_000)
        text = (f"METER READING SHEET\nPeriod: {month}\nPrevious reading: {indian_grouping(before)}\n"
                f"Current reading: {indian_grouping(before + kwh)}\nMultiplier: 1 (readings in kWh)\n")
        value = float(kwh)
        raw = {"op": "diff", "terms": [[before + kwh, "kwh"], [before, "kwh"]]}
    else:
        mwh = kwh / 1000
        text = (f"HT CONSUMER ENERGY STATEMENT\nMonth: {month}\nActive energy import: {mwh:.2f} MWh\n"
                f"Net bill: Rs. {indian_grouping(amount)}\n")
        value = round(mwh, 2) * 1000   # the page shows MWh to 2 decimals, so truth is that
        raw = {"op": "single", "terms": [[round(mwh, 2), "mwh"]]}
    return SyntheticDocument(f"elec_{i:04d}", "electricity_bill", layout, text,
                             {"energy_kwh": value}, raw)


def _fuel(rng: random.Random, i: int, layouts) -> SyntheticDocument:
    layout = rng.choice(layouts or ["coal_tonnes", "gas_gj", "diesel_kl"])
    fuel = "coal"
    if layout == "coal_tonnes":
        qty = rng.randint(200, 20_000)
        text = (f"TAX INVOICE\nSeller: Bharat Coal Traders\nItem: Thermal coal (non-coking)\n"
                f"Quantity: {indian_grouping(qty)} MT\nRate: Rs {rng.randint(5000, 9000)} per MT\n")
        truth = {"fuel": "coal", "quantity": float(qty), "unit": "tonne"}
        terms, op = [[qty, "mt"]], "single"
    elif layout == "coal_kgs_invoice":
        tonnes = rng.randint(200, 20_000)
        text = (f"TAX INVOICE No {rng.randint(1000, 9999)}\nGoods: Thermal coal G11\n"
                f"Qty: {indian_grouping(tonnes * 1000)} KGS\nRate/KG: {rng.randint(5, 9)}.{rng.randint(10, 99)}\n")
        truth = {"fuel": "coal", "quantity": float(tonnes), "unit": "tonne"}
        terms, op = [[tonnes * 1000, "kg"]], "single"
    elif layout == "coal_quintal":
        tonnes = rng.randint(200, 20_000)
        text = (f"PURCHASE VOUCHER\nItem: Coal (steam)\nQuantity: {indian_grouping(tonnes * 10)} quintal\n"
                f"(1 quintal = 100 kg)\n")
        truth = {"fuel": "coal", "quantity": float(tonnes), "unit": "tonne"}
        terms, op = [[tonnes * 10, "quintal"]], "single"
    elif layout == "coal_mt_kg_split":
        tonnes = rng.randint(20, 900)
        extra = rng.choice([100, 250, 500, 750])
        text = f"DELIVERY RECEIPT\nCoal received: {tonnes} MT {extra} KG\nSupplier ref: {rng.randint(10000, 99999)}\n"
        truth = {"fuel": "coal", "quantity": tonnes + extra / 1000, "unit": "tonne"}
        terms, op = [[tonnes, "mt"], [extra, "kg"]], "sum"
    elif layout == "coal_lots":
        lots = [rng.randint(20, 900) for _ in range(rng.randint(2, 4))]
        text = "COAL RECEIPTS\n" + "".join(f"Lot {k + 1}: {v} MT\n" for k, v in enumerate(lots))
        truth = {"fuel": "coal", "quantity": float(sum(lots)), "unit": "tonne"}
        terms, op = [[v, "mt"] for v in lots], "sum"
    elif layout == "coal_t_kg":
        tonnes = rng.randint(20, 900)
        extra = rng.choice([150, 300, 450, 600, 850])
        text = f"WEIGHMENT NOTE\nCoal, net weight: {tonnes} t {extra} kg\nBay: {rng.randint(1, 9)}\n"
        truth = {"fuel": "coal", "quantity": tonnes + extra / 1000, "unit": "tonne"}
        terms, op = [[tonnes, "t"], [extra, "kg"]], "sum"
    elif layout == "coal_kg":
        tonnes = rng.randint(200, 20_000)
        text = (f"WEIGHBRIDGE SLIP\nMaterial: steam coal\nNet weight: {indian_grouping(tonnes * 1000)} kg\n"
                f"Truck: GJ{rng.randint(10, 39)}XY{rng.randint(1000, 9999)}\n")
        truth = {"fuel": "coal", "quantity": float(tonnes), "unit": "tonne"}
        terms, op = [[tonnes * 1000, "kg"]], "single"
    elif layout == "gas_gj":
        qty = rng.randint(1_000, 90_000)
        text = (f"GAS SUPPLY INVOICE\nProduct: Natural gas (PNG)\nSupplied energy: {qty:,} GJ\n"
                f"Billing period: {rng.choice(['Q1', 'Q2', 'Q3'])} 2026\n")
        truth = {"fuel": "natural_gas", "quantity": float(qty), "unit": "gj"}
        fuel, terms, op = "natural_gas", [[qty, "gj"]], "single"
    else:
        qty = rng.randint(5, 400)
        text = (f"FUEL DELIVERY NOTE\nHigh speed diesel\nVolume delivered: {qty} KL\n"
                f"Vehicle: MH{rng.randint(10, 49)}AB{rng.randint(1000, 9999)}\n")
        truth = {"fuel": "diesel", "quantity": float(qty), "unit": "kl"}
        fuel, terms, op = "diesel", [[qty, "kl"]], "single"
    return SyntheticDocument(f"fuel_{i:04d}", "fuel_invoice", layout, text, truth,
                             {"fuel": fuel, "op": op, "terms": terms})


def _production(rng: random.Random, i: int, layouts) -> SyntheticDocument:
    product = rng.choice(["bolts", "nuts", "washers", "rivets"])
    tonnes = rng.randint(50, 3_000)
    layout = rng.choice(layouts or ["table_row", "sentence", "kg_style"])
    op, terms = "single", None
    if layout == "table_row":
        text = f"PRODUCTION LOG - SHIFT SUMMARY\nProduct | Output (t)\n{product} | {indian_grouping(tonnes)}\n"
    elif layout == "sentence":
        text = f"Monthly report: the plant produced {tonnes} tonnes of {product} this month.\n"
    elif layout == "quintal_register":
        text = f"GODOWN REGISTER\nItem: {product}\nTotal: {indian_grouping(tonnes * 10)} quintals\n"
        terms = [[tonnes * 10, "quintal"]]
    elif layout == "weekly_totals":
        parts = [rng.randint(5, 50) for _ in range(3)]
        tonnes = sum(parts) + (tonnes % 50)
        weeks_list = parts + [tonnes - sum(parts)]
        weeks = " ".join(f"Wk{k + 1}: {v} t;" for k, v in enumerate(weeks_list))
        text = f"MONTH SUMMARY ({product})\n{weeks}\nAdd the weeks for the month.\n"
        op, terms = "sum", [[v, "t"] for v in weeks_list]
    elif layout == "shift_totals":
        shifts = [rng.randint(5, 400) for _ in range(3)]
        text = (f"PRODUCTION BY SHIFT ({product})\nShift A: {shifts[0]} t   Shift B: {shifts[1]} t   "
                f"Shift C: {shifts[2]} t\n")
        tonnes = sum(shifts)
        op, terms = "sum", [[v, "t"] for v in shifts]
    elif layout == "daily_log":
        days = [rng.randint(2, 60) for _ in range(rng.randint(5, 7))]
        text = f"DAILY OUTPUT ({product})\n" + "".join(f"Day {k + 1}: {v} t\n" for k, v in enumerate(days))
        tonnes = sum(days)
        op, terms = "sum", [[v, "t"] for v in days]
    elif layout == "ledger_line":
        text = f"Stores ledger\nDate: 12/05/2026   {product.upper()}   Qty: {tonnes}.0 t   Status: dispatched\n"
    else:
        text = f"Dispatch register\nItem: {product}\nTotal weight: {indian_grouping(tonnes * 1000)} kg\n"
        terms = [[tonnes * 1000, "kg"]]
    if terms is None:
        terms = [[tonnes, "t"]]
    return SyntheticDocument(f"prod_{i:04d}", "production_log", layout, text,
                             {"product": product, "tonnes": float(tonnes)},
                             {"product": product, "op": op, "terms": terms})


# Layout groups. "base" is the default of each maker. "skills" teaches
# subtraction, addition and unit conversion in several wordings each, so a
# model can learn the OPERATION and not one layout (training only).
# "held_out" and "held_out_new" are never trained on: they are the test.
GROUPS = {
    "skills": {
        "electricity_bill": ["opening_closing", "gwh_style", "counter_start_end",
                             "present_previous_mwh", "two_meters"],
        "fuel_invoice": ["coal_kgs_invoice", "coal_quintal", "coal_lots", "coal_t_kg"],
        "production_log": ["quintal_register", "shift_totals", "daily_log"],
    },
    "held_out": {
        "electricity_bill": ["meter_readings"],
        "fuel_invoice": ["coal_kg"],
        "production_log": ["ledger_line"],
    },
    "held_out_new": {
        "electricity_bill": ["dated_readings"],
        "fuel_invoice": ["coal_mt_kg_split"],
        "production_log": ["weekly_totals"],
    },
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
             group: str = "base", balanced: bool = False) -> list[SyntheticDocument]:
    """Make documents.

    noisy  add scan noise to every document
    group  base, skills, held_out or held_out_new (see GROUPS)
    balanced  spread numbers over digit lengths (training data only)
    """
    rng = BalancedRandom(seed) if balanced else random.Random(seed)
    noise_rng = random.Random(seed + 1)   # separate, so noise never shifts the answers
    makers = {"electricity_bill": _electricity, "fuel_invoice": _fuel,
              "production_log": _production}
    docs = []
    for i in range(count_per_type):
        for doc_type, make in makers.items():
            layouts = None if group == "base" else GROUPS[group][doc_type]
            doc = make(rng, i, layouts)
            if noisy:
                text = add_scan_noise(doc.text, noise_rng)
                doc = SyntheticDocument(doc.doc_id, doc.doc_type, doc.layout,
                                        text, doc.truth, doc.raw)
            docs.append(doc)
    return docs


def hard_bench(count_per_type: int = 60) -> list[SyntheticDocument]:
    """The harder test: noisy known layouts plus two sets of unseen ones."""
    return (generate(count_per_type, seed=99, noisy=True)
            + generate(count_per_type, seed=199, noisy=True, group="held_out")
            + generate(count_per_type, seed=299, noisy=True, group="held_out_new"))
