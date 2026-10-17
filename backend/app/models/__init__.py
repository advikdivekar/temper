"""models package

All database tables, grouped by topic:
    accounts.py    organizations, users, login tokens
    plant.py       installations, goods, evidence, activity records
    reference.py   emission factors and default values
    requests.py    data requests between organizations
    statements.py  statements, precursor links
    trust.py       share grants, verifier opinions, audit log

Importing this package registers every table with SQLAlchemy.
"""

from app.models.accounts import AuthToken, Organization, User
from app.models.plant import ActivityRecord, Evidence, Good, Installation
from app.models.requests import DataRequest
from app.models.reference import DefaultValueRow, EmissionFactorRow
from app.models.statements import PrecursorRef, Statement
from app.models.trust import AuditEntry, ShareGrant, VerificationOpinion

__all__ = [
    "ActivityRecord", "AuditEntry", "AuthToken", "DataRequest", "DefaultValueRow",
    "EmissionFactorRow", "Evidence", "Good", "Installation",
    "Organization", "PrecursorRef", "ShareGrant", "Statement", "User",
    "VerificationOpinion",
]
