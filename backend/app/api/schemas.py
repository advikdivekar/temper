"""schemas.py

WHAT THIS FILE DOES
    Describes the JSON the API accepts and returns, using Pydantic.

CONCEPTS IN THIS FILE
    Schema
        A checked shape for data. If a request does not match, FastAPI
        rejects it with a clear error before our code runs.
"""

from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class RegisterRequest(BaseModel):
    organization_name: str
    role: str  # supplier, importer or verifier
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class InstallationRequest(BaseModel):
    name: str
    country: str = "IN"


class GoodRequest(BaseModel):
    name: str
    cn_code: str


class RecordRequest(BaseModel):
    installation_id: int
    kind: str  # fuel, electricity or output
    name: str
    amount: Decimal
    unit: str
    valid_from: date
    valid_to: date
    evidence_id: int
    cn_code: str | None = None


class CorrectionRequest(BaseModel):
    new_amount: Decimal
    evidence_id: int


class PrecursorInput(BaseModel):
    material_name: str
    tonnes: Decimal
    cn_code: str
    upstream_statement_id: int | None = None
    upstream_product: str | None = None
    for_product: str | None = None


class BuildStatementRequest(BaseModel):
    installation_id: int
    period_start: date
    period_end: date
    methodology: str = "cbam_steel_and_aluminium:1"
    precursors: list[PrecursorInput] = []


class OpinionRequest(BaseModel):
    conclusion: str
    comments: str = ""


class ShareRequest(BaseModel):
    recipient_org_id: int
