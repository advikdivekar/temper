"""deps.py

WHAT THIS FILE DOES
    Shared building blocks for routes: a database session per request,
    and who is making the request.

CONCEPTS IN THIS FILE
    Dependency injection
        FastAPI calls these functions for us and passes the results
        into route functions that ask for them.
    Bearer token
        The client sends "Authorization: Bearer <token>". We hash it
        and look it up in the AuthToken table.
    require_role
        Builds a dependency that only lets certain roles through.
"""

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuthToken, Organization, User
from app.security import hash_token


def get_session(request: Request):
    session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


def get_settings(request: Request):
    return request.app.state.settings


class Caller:
    """The signed in user and their organization."""

    def __init__(self, user: User, org: Organization):
        self.user = user
        self.org = org


def get_caller(
    authorization: str = Header(default=""),
    session: Session = Depends(get_session),
) -> Caller:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token_hash = hash_token(authorization.removeprefix("Bearer "))
    token = session.scalar(
        select(AuthToken).where(AuthToken.token_hash == token_hash)
    )
    if token is None:
        raise HTTPException(401, "Invalid token")
    user = session.get(User, token.user_id)
    return Caller(user, session.get(Organization, user.organization_id))


def require_role(*roles: str):
    def check(caller: Caller = Depends(get_caller)) -> Caller:
        if caller.org.role not in roles:
            raise HTTPException(403, "Your role cannot do this")
        return caller

    return check
