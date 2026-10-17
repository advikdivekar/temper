"""baseline_regex.py

WHAT THIS FILE DOES
    A deliberately simple extractor made of hand written patterns. It is
    the BASELINE: the number every smarter extractor has to beat.

WHY A BASELINE FIRST
    Without one we cannot tell whether a model is good or merely looks
    clever. If a few regular expressions already score 95 percent, a
    fine tuned model is a poor use of effort. If they score 40 percent,
    there is real room to improve, and we know by how much.

CONCEPTS IN THIS FILE
    Regular expression (regex)
        A pattern that finds text of a certain shape, such as a number
        followed by "kWh".
    Brittleness
        Patterns only know the layouts their author imagined. A new
        wording breaks them silently. That is the weakness we expect to
        see in the eval, and what learning based readers should fix.
    Confidence from the match
        A clean, specific pattern gets high confidence. A loose fallback
        gets low confidence, so a person reviews it.
"""

import re

from ml.extraction.schema import ExtractedField, Extraction


def _number(text: str) -> float:
    return float(text.replace(",", ""))


def extract(doc_type: str, text: str) -> Extraction:
    out = Extraction(doc_type)

    if doc_type == "electricity_bill":
        m = re.search(r"([\d,]+(?:\.\d+)?)\s*kWh", text, re.IGNORECASE)
        if m:
            out.fields.append(ExtractedField("energy_kwh", _number(m.group(1)), 0.9, m.group(0)))
        else:
            m = re.search(r"kWh\)?:\s*([\d,]+)", text, re.IGNORECASE)
            if m:
                out.fields.append(ExtractedField("energy_kwh", _number(m.group(1)), 0.9, m.group(0)))

    elif doc_type == "fuel_invoice":
        m = re.search(r"Quantity:\s*([\d,]+)\s*MT", text)
        if m:
            out.fields += [ExtractedField("fuel", "coal", 0.8, "coal"),
                           ExtractedField("quantity", _number(m.group(1)), 0.9, m.group(0)),
                           ExtractedField("unit", "tonne", 0.9, "MT")]
        m = re.search(r"([\d,]+)\s*GJ", text)
        if m and not out.fields:
            out.fields += [ExtractedField("fuel", "natural_gas", 0.8, "natural gas"),
                           ExtractedField("quantity", _number(m.group(1)), 0.9, m.group(0)),
                           ExtractedField("unit", "gj", 0.9, "GJ")]

    elif doc_type == "production_log":
        m = re.search(r"(\w+) \| ([\d,]+)\s*$", text.strip(), re.MULTILINE)
        if m:
            out.fields += [ExtractedField("product", m.group(1), 0.9, m.group(0)),
                           ExtractedField("tonnes", _number(m.group(2)), 0.9, m.group(0))]
        else:
            m = re.search(r"produced ([\d,]+) tonnes of (\w+)", text)
            if m:
                out.fields += [ExtractedField("product", m.group(2), 0.8, m.group(0)),
                               ExtractedField("tonnes", _number(m.group(1)), 0.8, m.group(0))]
    return out
