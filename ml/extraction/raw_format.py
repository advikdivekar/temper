"""raw_format.py

WHAT THIS FILE DOES
    The one answer format the fine tuned model is trained to write, and
    the prompt that asks for it. The model writes what it SEES (the
    numbers and their units, and how to combine them). It does no math.

CONCEPTS IN THIS FILE
    Verbatim numbers
        Numbers are copied as written, commas and all. Code cleans them.
    One format from the start
        Switching formats later makes a model unlearn the old one, so
        training, scoring and serving all use exactly this format.
    Short answer
        Only the copied numbers. Short answers keep the small model fast.
"""

import json
import re
from decimal import Decimal

from ml.data.synthetic_documents import SyntheticDocument
from ml.extraction.calculate import to_decimal

SHAPES = {
    "electricity_bill": '{"op": "single|sum|diff", "terms": [[number, "unit"], ...]}',
    "fuel_invoice": '{"fuel": "coal|natural_gas|diesel", "op": "single|sum|diff", "terms": [[number, "unit"], ...]}',
    "production_log": '{"product": "name", "op": "single|sum|diff", "terms": [[number, "unit"], ...]}',
}

RULES = (
    "Copy each number exactly as it is written on the page, including commas, and give each its unit "
    "(kwh, mwh, gwh, kg, t, mt, quintal, gj, kl). Do not calculate anything. "
    "List numbers in the order they appear on the page. "
    "Use op diff when two meter readings are given, "
    "sum when several amounts must be added, otherwise single."
)


def build_prompt(doc_type: str, text: str) -> str:
    return (f"You read a factory document of type {doc_type}.\n\n"
            f"Answer with JSON shaped like {SHAPES[doc_type]}.\n\n{RULES}\n\n"
            f"Document:\n{text}\nAnswer:")


NUMBER = re.compile("[0-9\u0966-\u096f][0-9\u0966-\u096f,]*(?:\\.[0-9\u0966-\u096f]+)?")


def written_form(number, text: str):
    """The number exactly as the page writes it (commas, Hindi digits and
    all), found by looking for a token on the page with the same value."""
    for match in NUMBER.finditer(text):
        token = match.group().rstrip(",")
        if to_decimal(token) == Decimal(str(number)):
            return token
    return None


def completion_for(doc: SyntheticDocument) -> str:
    raw = dict(doc.raw)
    terms = []
    for number, unit in raw["terms"]:
        terms.append([written_form(number, doc.text) or str(number), unit])
    if raw["op"] == "diff":
        terms.sort(key=lambda t: doc.text.find(t[0]))   # page order
    raw["terms"] = terms
    return json.dumps(raw, ensure_ascii=False)


PAIR = re.compile(r'\[\s*"([^"]+)"\s*,\s*"([A-Za-z]+)"\s*\]')


def parse(answer: str) -> dict:
    """Read the model's answer. A cut off or rambling answer is salvaged:
    we keep the leading fields and every well formed [number, unit] pair
    that has a numeric first part. The page check judges the rest."""
    try:
        raw = json.loads(answer.strip())
        if not isinstance(raw, dict):
            return {}
        terms = raw.get("terms")
        if isinstance(terms, list):   # drop junk such as a copied sentence
            raw["terms"] = [t for t in terms if isinstance(t, list)
                            and len(t) == 2 and NUMBER.fullmatch(str(t[0]))]
        return raw
    except json.JSONDecodeError:
        pass
    raw = {}
    for key in ("op", "fuel", "product"):
        found = re.search(rf'"{key}"\s*:\s*"([^"]+)"', answer)
        if found:
            raw[key] = found.group(1)
    pairs = [[n, u] for n, u in PAIR.findall(answer) if NUMBER.fullmatch(n)]
    if pairs:
        raw["terms"] = pairs
    return raw
