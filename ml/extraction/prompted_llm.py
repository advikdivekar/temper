"""prompted_llm.py

WHAT THIS FILE DOES
    Extracts fields by asking a small open model, running locally through
    ollama, to read the document text and answer in JSON. No training.
    Three prompting styles can be compared:

      zero_shot   describe the task and the answer shape, nothing else
      few_shot    also show a few solved examples first
      cot         let the model think step by step in a "reasoning"
                  field before it writes the fields

CONCEPTS IN THIS FILE
    Prompting
        Steering a general model with instructions instead of changing
        its weights. Cheap and fast, but only as reliable as the model.
    Few shot examples
        Solved examples inside the prompt. They teach layouts and unit
        conversions by demonstration, and often lift accuracy a lot.
    Chain of thought
        Asking the model to write its reasoning before the answer. It
        helps with steps such as converting MWh to kWh, and can hurt
        small models that ramble. We measure it instead of assuming.
    JSON mode
        ollama's format option forces valid JSON, so a format slip can
        never be the reason an answer fails.
    Answer length cap
        Small models sometimes never stop writing. We cap the answer at 250
        tokens and the wait at 60 seconds, so one bad document cannot
        stall a whole run.
    Temperature zero
        No randomness, so the same document always gives the same answer
        and an eval run can be repeated.
    Confidence
        A prompted model has no honest confidence. We give 0.9 to a
        complete, well typed answer and 0.5 otherwise, and flag this as
        a placeholder. Real calibration is a later step (component 5).
"""

import json
import time
import urllib.error
import urllib.request

from ml.extraction.schema import REQUIRED_FIELDS, ExtractedField, Extraction

URL = "http://localhost:11434/api/generate"

SHAPES = {
    "electricity_bill": '{"energy_kwh": <number in kWh>}',
    "fuel_invoice": '{"fuel": "coal" | "natural_gas" | "diesel", "quantity": <number>, "unit": "tonne" | "gj" | "kl">}',
    "production_log": '{"product": "<product name>", "tonnes": <number in tonnes>}',
}

RULES = (
    "Rules: convert units (MWh to kWh, kg to tonnes, MT means tonnes). "
    "Indian numbers use groups like 1,25,000 which means 125000. "
    "Answer with numbers only, no commas."
)

# A few solved examples, from layouts and numbers unrelated to the test set.
SHOTS = {
    "electricity_bill": [("Monthly statement\nEnergy import: 41.50 MWh\nBill: Rs 3,10,000", '{"energy_kwh": 41500}')],
    "fuel_invoice": [("Delivery note\nHigh speed diesel\nVolume: 12 KL", '{"fuel": "diesel", "quantity": 12, "unit": "kl"}')],
    "production_log": [("Dispatch register\nItem: nuts\nTotal weight: 2,40,000 kg", '{"product": "nuts", "tonnes": 240}')],
}


def build_prompt(doc_type: str, text: str, mode: str) -> str:
    parts = [f"You read a factory document of type {doc_type}.", f"Return JSON shaped like {SHAPES[doc_type]}.", RULES]
    if mode == "few_shot":
        for sample, answer in SHOTS[doc_type]:
            parts.append(f"Document:\n{sample}\nAnswer: {answer}")
    if mode == "cot":
        parts[1] = ('Return JSON with a "reasoning" string first (short, step by step), then the fields: '
                    f'{SHAPES[doc_type][:-1]}, "reasoning": "<your steps>"}}')
    parts.append(f"Document:\n{text}\nAnswer:")
    return "\n\n".join(parts)


def _ask(model: str, prompt: str, tries: int = 3) -> dict:
    """Ask the model. A busy local server sometimes errors once, so retry."""
    for attempt in range(tries):
        try:
            return _ask_once(model, prompt)
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt == tries - 1:
                return {}
            time.sleep(2)
    return {}


def _ask_once(model: str, prompt: str) -> dict:
    body = json.dumps({"model": model, "prompt": prompt, "stream": False, "format": "json",
                       "options": {"temperature": 0, "num_predict": 250}}).encode()
    req = urllib.request.Request(URL, body, {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as response:
        raw = json.loads(response.read())["response"]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def make_extractor(model: str = "gemma3:4b", mode: str = "zero_shot"):
    def extract(doc_type: str, text: str) -> Extraction:
        answer = _ask(model, build_prompt(doc_type, text, mode))
        out = Extraction(doc_type)
        complete = all(name in answer for name in REQUIRED_FIELDS[doc_type])
        for name in REQUIRED_FIELDS[doc_type]:
            if name in answer:
                out.fields.append(ExtractedField(name, answer[name], 0.9 if complete else 0.5))
        return out
    return extract
