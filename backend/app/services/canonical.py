"""canonical.py

WHAT THIS FILE DOES
    Turns data into one exact byte string, so hashing and signing it
    always gives the same answer.

CONCEPTS IN THIS FILE
    Canonical JSON
        The same data can be written many ways (key order, spaces).
        A hash of each would differ. Canonical JSON fixes one way:
        sorted keys, no spaces, Decimals written as text.
"""

import hashlib
import json
from decimal import Decimal


def _default(value):
    if isinstance(value, Decimal):
        return format(value, "f")
    if hasattr(value, "isoformat"):
        return value.isoformat()
    raise TypeError(f"Cannot encode {type(value)}")


def canonical_bytes(data) -> bytes:
    text = json.dumps(
        data, sort_keys=True, separators=(",", ":"), default=_default
    )
    return text.encode()


def canonical_hash(data) -> str:
    return hashlib.sha256(canonical_bytes(data)).hexdigest()
