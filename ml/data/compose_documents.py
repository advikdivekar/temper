"""compose_documents.py

WHAT THIS FILE DOES
    Builds fake factory documents from small interchangeable pieces
    (titles, labels, number styles, distractor lines) instead of writing
    each layout by hand. Millions of different pages come out of a few
    hundred words, and the correct answer is known for every one.

WHY IT EXISTS
    Hand written layouts taught the model those layouts and little else
    (96 percent on layouts we had tuned against, 32 percent on fresh
    ones). Variety is the cure, and a generator makes variety cheap.

CONCEPTS IN THIS FILE
    Vocabulary split
        Every list of words has a TRAIN part and a TEST part. Training
        pages use only train words. The fresh test bench uses test words
        for labels, titles and reference names, so it measures
        wording the model has truly never seen, and it can be remade
        with a new seed whenever a bench gets used up.
    Distractors
        Dates, reference numbers, rates and amounts placed next to the
        real quantity. Small models copy the wrong number unless they
        see many of these in training.
    Styles
        How the quantity is laid out: one per line, inline, a table, a
        pipe separated line, the unit in a header, or a sentence.
    Truth from code
        The answer comes from calculate.compute on the raw terms, the
        same code the product uses. No second copy of the arithmetic.
"""

import random
from decimal import Decimal

from ml.data.synthetic_documents import (BalancedRandom, SyntheticDocument,
                                         add_scan_noise, indian_grouping)
from ml.extraction.calculate import compute, to_decimal
from ml.extraction.raw_format import NUMBER

TITLES = {
    "train": ["TAX INVOICE", "DELIVERY NOTE", "STATEMENT", "RECEIPT",
              "WEIGHMENT SLIP", "MONTHLY REPORT", "LOG SHEET", "VOUCHER",
              "BILL", "FACTORY RECORD", "DISPATCH SLIP", "INWARD REGISTER"],
    "test": ["CHALLAN", "GOODS RECEIVED NOTE", "REGISTER EXTRACT",
             "GATE PASS", "SUMMARY SHEET", "ENTRY BOOK", "TALLY SHEET",
             "MATERIAL INWARD"],
}
REF_WORDS = {
    "train": ["Ref", "Invoice No", "Challan No", "Consumer No", "Vehicle", "LR No", "Order",
              "PO", "Batch ID"],
    "test": ["Bill ref", "Slip", "Folio", "Docket", "Token", "GRN", "Pass no"],
}
DATE_STYLES = {"train": ["{d:02d}/{m:02d}/{y}", "{d:02d}-{m:02d}-{y}"],
               "test": ["{d:02d}.{m:02d}.{y}", "{y}-{m:02d}-{d:02d}"]}
MONEY_WORDS = {"train": ["Rs", "Rs."], "test": ["INR", "Amount Rs"]}
SINGLE_LABELS = {
    "train": ["Quantity", "Qty", "Total", "Net weight", "Net", "Received",
              "Supplied", "Output", "Consumption", "Units", "Gross",
              "Dispatched", "Consumed", "Invoiced quantity", "Billed", "Issued"],
    "test": ["Amount", "Volume booked", "Weighed", "Posted", "Booked",
             "Recorded", "Closing stock received", "Lifted"],
}
PART_LABELS = {
    "train": ["Lot {k}", "Meter {A}", "Delivery {k}", "Week {k}",
              "Shift {A}", "Batch {k}", "Day {k}", "Load {k}", "Item {k}",
              "Slot {k}", "Run {k}", "Gate {k}"],
    "test": ["Truck {k}", "Feeder {k}", "Consignment {k}", "Part {k}",
             "Entry {k}", "Tanker {k}", "Block {A}", "Trip {k}", "Wagon {A}"],
}
DIFF_LABELS = {
    "train": [("Opening", "Closing"), ("Previous", "Present"),
              ("Start", "End"), ("Earlier reading", "Latest reading"),
              ("Prev. units", "Curr. units"), ("Meter start", "Meter stop"),
              ("Last month", "This month"), ("From", "To"),
              ("Reading A", "Reading B"), ("Beginning", "Ending")],
    "test": [("Reading on first", "Reading on last"),
             ("Old reading", "New reading"), ("Initial", "Final"),
             ("Meter in", "Meter out"),
             ("Counter on entry", "Counter on exit"), ("Before", "After")],
}
NOUNS = {
    "electricity_bill": {"train": ["Energy", "Units consumed", "Total import"],
                         "test": ["Power drawn", "Energy billed"]},
    "coal": {"train": ["Thermal coal", "Steam coal", "Coal (G11)"],
             "test": ["Coal G10", "Imported coal", "Washed coal"]},
    "diesel": {"train": ["High speed diesel", "HSD", "Diesel"],
               "test": ["Diesel oil", "Diesel (HSD)"]},
    "natural_gas": {"train": ["Natural gas", "PNG", "Gas supplied"],
                    "test": ["Piped natural gas", "Gas (PNG)"]},
}
PRODUCTS = ["bolts", "nuts", "washers", "rivets", "screws", "studs"]
STYLES = {
    "train": ["lines", "inline", "table", "pipe", "unit_header"],
    "test": ["lines", "inline", "table", "pipe", "unit_header", "sentence"],
}
# Written form of each unit, and the name the answer format uses.
SHOWN = {"kwh": ["kWh", "KWH"], "mwh": ["MWh", "MWH"], "gwh": ["GWh"],
         "kg": ["kg", "KG", "KGS"], "t": ["t", "MT"], "quintal": ["quintal"],
         "gj": ["GJ"], "kl": ["KL", "kl"]}
RAW_NAME = {"MT": "mt", "KGS": "kg", "KG": "kg", "kWh": "kwh", "KWH": "kwh",
            "MWh": "mwh", "MWH": "mwh", "GWh": "gwh", "GJ": "gj", "KL": "kl",
            "kl": "kl", "kg": "kg", "t": "t", "quintal": "quintal"}


def _pick(rng, pool, split):
    return rng.choice(pool[split])


def _fmt(rng, value, decimals=0):
    """A number as a page might write it."""
    if decimals:
        return f"{value:,.{decimals}f}" if rng.random() < 0.5 else f"{value:.{decimals}f}"
    value = int(value)
    kind = rng.choice(["indian", "western", "plain"])
    if value < 1000 or kind == "plain":
        return str(value)
    return indian_grouping(value) if kind == "indian" else f"{value:,}"


def _amount(rng, low, high, unit):
    """(raw value, written text) for one quantity. Value is a Decimal."""
    if unit == "mwh":
        value = Decimal(rng.randint(low, high)) / 100
        return value, _fmt(rng, value, 2)
    if unit == "gwh":
        value = Decimal(rng.randint(20, 900)) / 1000
        return value, f"{value:.3f}"
    value = Decimal(rng.randint(low, high))
    return value, _fmt(rng, value)


def _distractors(rng, split, count, avoid):
    """Lines with dates, references and money that are NOT the answer.
    Any line sharing a number with the answer terms is thrown away."""
    lines = []
    for _ in range(count * 3):
        if len(lines) == count:
            break
        kind = rng.choice(["ref", "date", "money", "rate"])
        d, m, y = rng.randint(1, 28), rng.randint(1, 12), rng.choice([2025, 2026])
        if kind == "ref":
            line = f"{_pick(rng, REF_WORDS, split)}: {rng.randint(1000, 99_999_999)}"
        elif kind == "date":
            style = _pick(rng, DATE_STYLES, split)
            line = f"Date: {style.format(d=d, m=m, y=y)}"
        elif kind == "money":
            line = f"{_pick(rng, MONEY_WORDS, split)} {indian_grouping(rng.randint(5000, 90_000_000))}"
        else:
            line = f"Rate: {_pick(rng, MONEY_WORDS, split)} {rng.randint(4000, 9000)} per unit"
        tokens = {to_decimal(t) for t in _numbers(line)}
        if not tokens & avoid:
            lines.append(line)
    return lines


def _numbers(line):
    return [m.group().rstrip(",") for m in NUMBER.finditer(line)]


def _plan(rng, doc_type, fuel):
    """Which operation, units and size ranges this document uses."""
    kinds = (["single", "single", "sum", "sum", "diff", "diff"]
             if doc_type == "electricity_bill" else ["single", "sum", "sum"])
    op = rng.choice(kinds)
    if doc_type == "electricity_bill":
        unit = rng.choice(["kwh", "kwh", "mwh"]) if op != "single" else \
            rng.choice(["kwh", "kwh", "mwh", "gwh"])
        return op, unit, (20_000, 900_000) if unit == "kwh" else (2_000, 90_000)
    if doc_type == "fuel_invoice":
        unit = {"coal": rng.choice(["t", "t", "kg", "quintal"]),
                "diesel": "kl", "natural_gas": "gj"}[fuel]
        spans = {"t": (20, 20_000), "kg": (20_000, 2_000_000), "quintal": (200, 90_000),
                 "kl": (3, 400), "gj": (1000, 90_000)}
        return op, unit, spans[unit]
    unit = rng.choice(["t", "t", "t", "kg", "quintal"])
    return op, unit, {"t": (5, 3000), "kg": (5_000, 3_000_000), "quintal": (50, 30_000)}[unit]


def _terms(rng, op, unit, span):
    """[(value, unit)] the page will show, for one document."""
    if op == "single":
        return [(_amount(rng, *span, unit)[0], unit)]
    if op == "diff":
        before, _ = _amount(rng, *span, unit)
        step, _ = _amount(rng, *(span[0] // 4 or 1, span[1] // 2), unit)
        return [(before, unit), (before + step, unit)]
    count = rng.randint(2, 6)
    return [(_amount(rng, *span, unit)[0], unit) for _ in range(count)]


def _show(rng, value, unit):
    """(written number, written unit) for a term. kg and quintal pages
    count in thousands so the answer stays in a sensible range."""
    decimals = 2 if unit == "mwh" else 3 if unit == "gwh" else 0
    return _fmt(rng, value, decimals), rng.choice(SHOWN[unit])


def _labels(rng, split, op, count):
    if op == "single":
        return [_pick(rng, SINGLE_LABELS, split)]
    if op == "diff":
        first, second = rng.choice(DIFF_LABELS[split])
        return [first, second]
    form = _pick(rng, PART_LABELS, split)
    return [form.format(k=k + 1, A="ABCDEF"[k]) for k in range(count)]


def _body(rng, style, noun, labels, shown, op):
    """The quantity lines for one style."""
    pairs = [f"{n} {u}" for n, u in shown]
    if style == "sentence":
        return [f"{noun} {rng.choice(['received', 'recorded', 'booked'])}: " + " and ".join(pairs) + "."]
    if style == "inline":
        return [f"{noun}: " + rng.choice([", ", "; ", " + "]).join(
            f"{l} {p}" for l, p in zip(labels, pairs))]
    if style == "pipe":
        return [" | ".join(f"{l}: {p}" for l, p in zip(labels, pairs))]
    if style == "table":
        return [f"{noun} | quantity"] + [f"{l} | {p}" for l, p in zip(labels, pairs)]
    if style == "unit_header":
        return [f"{l} ({u}): {n}" for l, (n, u) in zip(labels, shown)]
    return [f"{l}: {p}" for l, p in zip(labels, pairs)]


def _document(rng, i, doc_type, split):
    fuel = rng.choice(["coal", "coal", "diesel", "natural_gas"])
    op, unit, span = _plan(rng, doc_type, fuel)
    terms = _terms(rng, op, unit, span)
    if op == "sum" and fuel == "coal" and unit == "t" and rng.random() < 0.3:
        terms = terms[:1] + [(Decimal(rng.choice([100, 250, 500, 750])), "kg")]
    shown = [_show(rng, v, u) for v, u in terms]
    labels = _labels(rng, split, op, len(terms))
    order = list(range(len(terms)))
    if op == "diff" and rng.random() < 0.3:
        order.reverse()
    noun_key = "electricity_bill" if doc_type == "electricity_bill" else fuel
    product = rng.choice(PRODUCTS)
    noun = product if doc_type == "production_log" else _pick(rng, NOUNS[noun_key], split)
    style = _pick(rng, STYLES, split)
    shown = [shown[k] for k in order]
    labels = labels[: len(shown)]
    body = _body(rng, style, noun, labels, shown, op)
    avoid = {to_decimal(n) for n, _ in shown}
    lines = [_pick(rng, TITLES, split)] + _distractors(rng, split, rng.randint(1, 3), avoid)
    at = rng.randint(1, len(lines))
    lines[at:at] = body
    if doc_type == "production_log":
        lines.insert(1, f"Item: {product}")
    elif style in ("lines", "unit_header") and rng.random() < 0.7:
        lines.insert(1, f"Material: {noun}")
    return _finish(i, doc_type, fuel, product, op, shown, "\n".join(lines) + "\n", style)


def _finish(i, doc_type, fuel, product, op, shown, text, style):
    terms = [[to_decimal(n), RAW_NAME[u]] for n, u in shown]
    raw = {"op": op, "terms": terms}
    if doc_type == "fuel_invoice":
        raw["fuel"] = fuel
    if doc_type == "production_log":
        raw["product"] = product
    value, unit_name = compute(doc_type, raw)
    number = float(value)
    truth = {"electricity_bill": {"energy_kwh": number},
             "production_log": {"product": product, "tonnes": number},
             "fuel_invoice": {"fuel": fuel, "quantity": number, "unit": unit_name}}[doc_type]
    return SyntheticDocument(f"mix_{doc_type[:4]}_{i:05d}", doc_type, f"mixed_{style}",
                             text, truth, raw)


def compose(count_per_type: int, seed: int, split: str = "train",
            noisy: bool = True, balanced: bool = False) -> list[SyntheticDocument]:
    """Mixed documents. split is train (training words) or test (words the
    model never sees in training). Same seed, same documents."""
    rng = BalancedRandom(seed) if balanced else random.Random(seed)
    noise = random.Random(seed + 1)
    docs = []
    for i in range(count_per_type):
        for doc_type in ("electricity_bill", "fuel_invoice", "production_log"):
            doc = _document(rng, i, doc_type, split)
            if noisy:
                text = add_scan_noise(doc.text, noise)
                doc = SyntheticDocument(doc.doc_id, doc.doc_type, doc.layout,
                                        text, doc.truth, doc.raw)
            docs.append(doc)
    return docs
