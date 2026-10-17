"""schema.py

WHAT THIS FILE DOES
    Defines what an extractor must return for one document, as plain
    typed objects. Every extractor, from the simple baseline to a fine
    tuned vision model, returns the same shape, so the eval harness can
    compare them fairly.

CONCEPTS IN THIS FILE
    Structured output
        Instead of free text, the extractor returns named fields with
        values. This is what lets software check the answer.
    Confidence
        How sure the extractor is, from 0 to 1. Low confidence values
        are sent to a person for review. Later, confidence is what we
        calibrate and improve.
    Source text
        The snippet the value came from. A reviewer can see at a glance
        why the extractor believed it.
"""

from dataclasses import dataclass, field

DOC_TYPES = ("electricity_bill", "fuel_invoice", "production_log")

# The fields each document type must yield.
REQUIRED_FIELDS = {
    "electricity_bill": ("energy_kwh",),
    "fuel_invoice": ("fuel", "quantity", "unit"),
    "production_log": ("product", "tonnes"),
}


@dataclass(frozen=True)
class ExtractedField:
    name: str
    value: str | float
    confidence: float
    source_text: str = ""


@dataclass
class Extraction:
    doc_type: str
    fields: list[ExtractedField] = field(default_factory=list)

    def get(self, name: str):
        for item in self.fields:
            if item.name == name:
                return item
        return None
