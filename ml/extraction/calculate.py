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
        A difference of two readings that is zero is flagged for review.
        The difference is always bigger minus smaller, because meters
        only count up and a model cannot tell which reading is later.
    Page words decide the fuel and the product
        The model used to tie "coal" to a layout it had seen, so a page
        about diesel came back as coal. Now code looks for the words
        (diesel, HSD, gas, PNG, coal) on the page and, if there are
        none, falls back on the unit (kl is diesel, GJ is gas). If the
        model disagrees with the page, the page wins. If nothing
        agrees, the field is flagged for review.
    Coverage check
        A small model sometimes drops the last item of a list (four
        weekly figures, only three copied). Code finds every number
        written with its unit on the page ("25 t", "100 KG"). If one of
        them was not copied, the field is flagged for review.
    Grounding check
        Every number the model copied must literally appear on the
        page, after removing Indian commas and turning Hindi digits into
        ordinary ones. A number that is not on the page was invented or
        miscopied (17,759 becoming 1779). Such a field gets low
        confidence so a person reviews it. This catches silent errors.
"""

import re
from collections import Counter
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


# Words that name a fuel, and the unit each fuel is reported in.
FUEL_WORDS = {
    "natural_gas": ("natural gas", "png", "gas"),
    "diesel": ("diesel", "hsd"),
    "coal": ("coal", "coke"),
}
UNIT_FUEL = {"mass": "coal", "gj": "natural_gas", "volume": "diesel"}
PRODUCTS = ("bolts", "nuts", "washers", "rivets", "screws", "studs")
# Scan noise swaps o and l for 0 and 1 (also Hindi digits) inside words.
UNNOISE = str.maketrans("01\u0966\u0967", "olol")


def _words(text: str) -> str:
    return " ".join(text.translate(UNNOISE).lower().split())


def fuel_from_page(text: str, raw: dict):
    """(fuel, sure). The page words win, then the unit, then the model."""
    page = _words(text)
    named = [f for f, words in FUEL_WORDS.items() if any(w in page for w in words)]
    unit = str(raw["terms"][0][1]).lower() if raw.get("terms") else ""
    by_unit = UNIT_FUEL.get(UNITS.get(unit, ("",))[0])
    if len(named) == 1:
        return named[0], named[0] == by_unit
    return (by_unit or raw.get("fuel")), by_unit is not None


def product_from_page(text: str, raw: dict):
    """(product, sure). A product word on the page beats the model."""
    page = _words(text)
    found = [p for p in PRODUCTS if p in page]
    if len(found) == 1:
        return found[0], True
    guess = str(raw.get("product", "")).lower()
    return raw.get("product"), bool(guess) and guess in page


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
        # Meters only count up, so the bigger reading is the later one.
        # The page order does not matter, which the model cannot know.
        return abs(values[0] - values[1]), unit_name
    return None


def numbers_on_page(text: str) -> Counter:
    """Every number written on the page, with how many times it appears."""
    clean = text.translate(HINDI_DIGITS).replace(",", "")
    return Counter(Decimal(t) for t in re.findall(r"\d+(?:\.\d+)?", clean))


UNIT_WORD = (r"(?:kwh|mwh|gwh|kgs?|mt|t|tonnes?|quintals?|gj|kl)")
WITH_UNIT = re.compile(rf"(?<![A-Za-z0-9.])(\d+(?:\.\d+)?)\s*{UNIT_WORD}\b", re.IGNORECASE)


def unused_amounts(raw: dict, text: str) -> list:
    """Numbers written with a unit on the page that the model did not copy.
    Lines with an equals sign (1 quintal = 100 kg) are conversion notes."""
    try:
        copied = Counter(to_decimal(term[0]) for term in raw["terms"])
    except (KeyError, InvalidOperation, TypeError, ValueError, IndexError):
        return []
    page = text.translate(HINDI_DIGITS).replace(",", "")
    found = Counter()
    for line in page.split("\n"):
        if "=" not in line:
            found.update(Decimal(n) for n in WITH_UNIT.findall(line))
    return [n for n, times in found.items() if copied[n] < times]


def is_grounded(raw: dict, text: str) -> bool:
    """True when every copied number really appears on the page, and no
    number is used more often than the page writes it (this catches a
    model that loops and repeats the same terms)."""
    page = numbers_on_page(text)
    try:
        copied = Counter(to_decimal(term[0]) for term in raw["terms"])
    except (KeyError, InvalidOperation, TypeError, ValueError, IndexError):
        return False
    return all(page[number] >= times for number, times in copied.items())


def to_extraction(doc_type: str, raw: dict, text: str) -> Extraction:
    """Final fields from a raw answer, with a confidence from grounding."""
    out = Extraction(doc_type)
    labelled = True
    if doc_type == "fuel_invoice" and raw.get("terms"):
        fuel, labelled = fuel_from_page(text, raw)
        raw = dict(raw, fuel=fuel)
    if doc_type == "production_log" and raw.get("product"):
        product, labelled = product_from_page(text, raw)
        raw = dict(raw, product=product)
    result = compute(doc_type, raw)
    if result is None:
        return out
    value, unit_name = result
    sensible = value > 0 or raw.get("op") != "diff"   # no use at all is odd
    complete = not unused_amounts(raw, text)
    confidence = 0.95 if (is_grounded(raw, text) and sensible and labelled
                          and complete) else 0.4
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
