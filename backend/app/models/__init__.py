"""models package

All database tables, grouped by topic:
    accounts.py    organizations, users, login tokens
    plant.py       installations, goods, evidence, activity records
    document_read.py  the AI reader's suggestions and what people decided
    reference.py   emission factors and default values
    requests.py    data requests between organizations
    statements.py  statements, precursor links
    trust.py       share grants, verifier opinions, audit log

Importing this package registers every table with SQLAlchemy.
"""

from app.models.accounts import AuthToken, Organization, User
from app.models.document_read import DocumentRead
from app.models.plant import ActivityRecord, Evidence, Good, Installation
from app.models.requests import DataRequest
from app.models.reference import DefaultValueRow, EmissionFactorRow
from app.models.statements import PrecursorRef, Statement
from app.models.trust import AuditEntry, ShareGrant, VerificationOpinion

__all__ = [
    "ActivityRecord", "AuditEntry", "AuthToken", "DataRequest", "DefaultValueRow", "DocumentRead",
    "EmissionFactorRow", "Evidence", "Good", "Installation",
    "Organization", "PrecursorRef", "ShareGrant", "Statement", "User",
    "VerificationOpinion",
]
