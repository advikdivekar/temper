"""calculate.py

WHAT THIS FILE DOES
    Turns what the model COPIED from a page into the final field values,
    and checks that what it copied is really on the page.

        model copies:  {"op": "diff", "terms": [[528063, "kwh"], [258540, "kwh"]]}
        code computes: energy_kwh = 269523

WHY IT EXISTS
    Small models copy numbers well and calculate badly (our run 2 scored
    0 percent on meter readings). So the model is asked only to read, and
    ordinary exact code does every subtraction, addition and unit change.
    This matches the project rule: AI reads, code calculates.

CONCEPTS IN THIS FILE
    Terms and op
        A page gives one number (single), several to add (sum, for
        example "640 MT 100 KG") or two readings to subtract (diff).
    Unit table
        Exact conversion factors, so "quintal" and "GWh" are handled by
        a rule and never guessed by a model.
    Decimal
        Exact decimal arithmetic. No floating point drift.
    Verbatim copy
        The model copies each number EXACTLY as written ("29,85,000"),
        and code removes the commas. Regrouping digits is where small
        models slip, copying is what they do well.
    Sanity guard
        A difference of two readings that is zero or negative is
        flagged for review.
    Grounding check
        Every number the model copied must literally appear on the
        page, after removing Indian commas and turning Hindi digits into
        ordinary ones. A number that is not on the page was invented or
        miscopied (17,759 becoming 1779). Such a field gets low
        confidence so a person reviews it. This catches silent errors.
"""

import re
from decimal import Decimal, InvalidOperation

from ml.extraction.schema import ExtractedField, Extraction

# Each unit: (family, how many base units it equals). Bases: kg, kwh, gj, kl.
UNITS = {
    "kg": ("mass", Decimal("1")), "t": ("mass", Decimal("1000")),
    "mt": ("mass", Decimal("1000")), "tonne": ("mass", Decimal("1000")),
    "quintal": ("mass", Decimal("100")),
    "kwh": ("energy", Decimal("1")), "mwh": ("energy", Decimal("1000")),
    "gwh": ("energy", Decimal("1000000")),
    "gj": ("gj", Decimal("1")),
    "kl": ("volume", Decimal("1")),
}

# What each document type reports, as (family, unit name, base per unit).
FIELD_UNIT = {
    "electricity_bill": ("energy", "kwh", Decimal("1")),
    "production_log": ("mass", "tonne", Decimal("1000")),
}
FUEL_UNIT = {
    "coal": ("mass", "tonne", Decimal("1000")),
    "natural_gas": ("gj", "gj", Decimal("1")),
    "diesel": ("volume", "kl", Decimal("1")),
}

HINDI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")


def to_decimal(value) -> Decimal:
    """A copied number as an exact Decimal. Accepts text exactly as written
    on the page: Indian commas, Hindi digits and decimals are all fine."""
    text = str(value).translate(HINDI_DIGITS).replace(",", "").replace(" ", "")
    return Decimal(text)


def _target(doc_type: str, raw: dict):
    if doc_type == "fuel_invoice":
        return FUEL_UNIT.get(raw.get("fuel"))
    return FIELD_UNIT.get(doc_type)


def compute(doc_type: str, raw: dict):
    """Return (value, unit_name) or None if the raw answer is unusable."""
    target = _target(doc_type, raw)
    terms = raw.get("terms")
    if target is None or not terms or raw.get("op") not in ("single", "sum", "diff"):
        return None
    family, unit_name, per_unit = target
    values = []
    try:
        for number, unit in terms:
            kind, factor = UNITS[str(unit).lower()]
            if kind != family:
                return None
            values.append(to_decimal(number) * factor / per_unit)
    except (KeyError, InvalidOperation, TypeError, ValueError):
        return None
    if raw["op"] == "single" and len(values) == 1:
        return values[0], unit_name
    if raw["op"] == "sum":
        return sum(values, Decimal(0)), unit_name
    if raw["op"] == "diff" and len(values) == 2:
        return values[0] - values[1], unit_name
    return None


def numbers_on_page(text: str) -> set:
    """Every number written on the page, as exact Decimals."""
    clean = text.translate(HINDI_DIGITS).replace(",", "")
    found = set()
    for token in re.findall(r"\d+(?:\.\d+)?", clean):
        found.add(Decimal(token))
    return found


def is_grounded(raw: dict, text: str) -> bool:
    """True when every copied number really appears on the page."""
    page = numbers_on_page(text)
    try:
        return all(to_decimal(term[0]) in page for term in raw["terms"])
    except (KeyError, InvalidOperation, TypeError, ValueError, IndexError):
        return False


def to_extraction(doc_type: str, raw: dict, text: str) -> Extraction:
    """Final fields from a raw answer, with a confidence from grounding."""
    out = Extraction(doc_type)
    result = compute(doc_type, raw)
    if result is None:
        return out
    value, unit_name = result
    sensible = value > 0 or raw.get("op") != "diff"   # a reading cannot go backwards
    confidence = 0.95 if is_grounded(raw, text) and sensible else 0.4
    number = float(value)
    if doc_type == "electricity_bill":
        out.fields.append(ExtractedField("energy_kwh", number, confidence))
    elif doc_type == "production_log" and raw.get("product"):
        out.fields.append(ExtractedField("product", raw["product"], confidence))
        out.fields.append(ExtractedField("tonnes", number, confidence))
    elif doc_type == "fuel_invoice":
        out.fields.append(ExtractedField("fuel", raw["fuel"], confidence))
        out.fields.append(ExtractedField("quantity", number, confidence))
        out.fields.append(ExtractedField("unit", unit_name, confidence))
    return out
