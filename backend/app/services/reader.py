"""reader.py

WHAT THIS FILE DOES
    Talks to the local AI reader service (ml/serving/extract_service.py)
    and turns what it says into a suggested ledger record.

CONCEPTS IN THIS FILE
    Reader client
        A small HTTP call with a short timeout. If the reader is not
        running we say so plainly, and manual entry still works.
    Text from a file
        The reader takes text. A plain text file is read as is. Scanned
        images and PDFs need OCR, which is not built yet, so we refuse
        them with a clear message instead of guessing.
    Suggested record
        The reader's fields mapped to the shape of a ledger record. A
        person checks and confirms it before anything is stored.
"""

import json
import urllib.error
import urllib.request

from certify_engine.quantity import UNITS

MAX_CHARS = 20_000

# Customs codes we know for products the reader can name.
KNOWN_CN = {"bolts": "73181590", "nuts": "73181600", "washers": "73182200"}


class ReaderUnavailable(Exception):
    """The reader service did not answer."""


class UnreadableFile(Exception):
    """The file is not text the reader can use."""


def text_from_bytes(data: bytes) -> str:
    """Decode a plain text document, or explain why we cannot."""
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        text = ""
    printable = sum(ch.isprintable() or ch in "\n\r\t" for ch in text)
    if not text.strip() or "\x00" in text or printable < 0.95 * len(text):
        raise UnreadableFile(
            "This looks like an image or a PDF. Reading scans is not built "
            "yet. Upload the text of the document, or type the numbers."
        )
    return text[:MAX_CHARS]


def reader_status(url: str) -> bool:
    try:
        with urllib.request.urlopen(f"{url}/health", timeout=2) as reply:
            return reply.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def read_document(url: str, doc_type: str, text: str, timeout: int = 60) -> dict:
    body = json.dumps({"doc_type": doc_type, "text": text}).encode()
    request = urllib.request.Request(
        f"{url}/extract", data=body, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as reply:
            return json.loads(reply.read())
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
        raise ReaderUnavailable(str(error)) from error


def suggested_record(doc_type: str, fields: list[dict]) -> dict | None:
    """Map reader fields to a ledger record. None if a field is missing."""
    by_name = {f["name"]: f["value"] for f in fields}
    if doc_type == "electricity_bill" and "energy_kwh" in by_name:
        return {"kind": "electricity", "name": "grid_india",
                "amount": by_name["energy_kwh"], "unit": "kwh", "cn_code": None}
    if doc_type == "fuel_invoice" and {"fuel", "quantity", "unit"} <= by_name.keys():
        return {"kind": "fuel", "name": by_name["fuel"],
                "amount": by_name["quantity"], "unit": by_name["unit"],
                "cn_code": None}   # diesel comes in kl, see engine_supports
    if doc_type == "production_log" and {"product", "tonnes"} <= by_name.keys():
        return {"kind": "output", "name": by_name["product"],
                "amount": by_name["tonnes"], "unit": "tonne",
                "cn_code": KNOWN_CN.get(by_name["product"])}
    return None


def engine_supports(unit: str) -> bool:
    """The engine has no kl (diesel in kilolitres needs a density and a
    heating value), so a person must convert it before confirming."""
    return unit in UNITS
