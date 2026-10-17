"""accounts.py

WHAT THIS FILE DOES
    Tables for who can use the system.

TABLES
    Organization  a company. Its role says what it does on the platform:
                  supplier (makes goods), importer (EU buyer),
                  verifier (accredited auditor) or admin.
    User          a person who belongs to one organization.
    AuthToken     a login session. We store only a hash of the token,
                  so a stolen database cannot be used to log in.
"""

from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

ROLES = ("supplier", "importer", "verifier", "admin")


class Organization(Base):
    __tablename__ = "organization"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20))
    public_key: Mapped[str | None] = mapped_column(String(100), default=None)


class User(Base):
    __tablename__ = "app_user"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organization.id"))
    email: Mapped[str] = mapped_column(String(200), unique=True)
    password_hash: Mapped[str] = mapped_column(String(300))


class AuthToken(Base):
    __tablename__ = "auth_token"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_user.id"))
    created_at: Mapped[datetime]
