"""routes_auth.py

WHAT THIS FILE DOES
    Sign up (creates an organization and its first user) and log in.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import Caller, get_caller, get_session
from app.api.schemas import LoginRequest, RegisterRequest
from app.models import AuthToken, Organization, User
from app.security import hash_password, hash_token, new_token, verify_password
from app.services.audit import append_audit

router = APIRouter(prefix="/auth", tags=["auth"])

PUBLIC_ROLES = ("supplier", "importer", "verifier")


def _issue_token(session: Session, user: User) -> str:
    token = new_token()
    session.add(
        AuthToken(
            token_hash=hash_token(token),
            user_id=user.id,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
    )
    session.commit()
    return token


@router.post("/register")
def register(body: RegisterRequest, session: Session = Depends(get_session)):
    if body.role not in PUBLIC_ROLES:
        raise HTTPException(400, f"Role must be one of {PUBLIC_ROLES}")
    if session.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(409, "Email already registered")
    org = Organization(name=body.organization_name, role=body.role)
    session.add(org)
    session.flush()
    user = User(
        organization_id=org.id, email=body.email,
        password_hash=hash_password(body.password),
    )
    session.add(user)
    session.commit()
    append_audit(session, user.id, "registered", f"org {org.id}")
    return {"token": _issue_token(session, user), "organization_id": org.id}


@router.post("/login")
def login(body: LoginRequest, session: Session = Depends(get_session)):
    user = session.scalar(select(User).where(User.email == body.email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Wrong email or password")
    return {"token": _issue_token(session, user)}


@router.get("/me")
def me(caller: Caller = Depends(get_caller)):
    return {
        "email": caller.user.email,
        "organization_id": caller.org.id,
        "organization_name": caller.org.name,
        "role": caller.org.role,
    }


@router.get("/organizations")
def list_organizations(
    caller: Caller = Depends(get_caller),
    session: Session = Depends(get_session),
):
    """Names and roles only, so suppliers can pick a recipient."""
    rows = session.scalars(select(Organization)).all()
    return [{"id": o.id, "name": o.name, "role": o.role} for o in rows]
