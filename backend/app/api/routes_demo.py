"""routes_demo.py

WHAT THIS FILE DOES
    Demo mode sign in. Lets the landing page open the app as a ready
    made persona (steel mill, bolt maker, verifier, importer) with no
    password. It creates the organization and user the first time.

SAFETY
    This bypasses passwords on purpose. It only exists when the
    environment variable DEMO_MODE is "1" (the default for local
    development). Set DEMO_MODE=0 for any real deployment and the
    routes are not even registered.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_settings
from app.api.routes_auth import _issue_token
from app.models import Organization, User
from app.security import hash_password
from app.services.demo_seed import seed_demo

router = APIRouter(prefix="/demo", tags=["demo"])

PERSONAS = {
    "mill": ("Steel Mill Pvt Ltd", "supplier",
             "Makes steel coil. Upstream supplier."),
    "bolts": ("Bolt Works Pvt Ltd", "supplier",
              "Makes bolts from the mill's steel. Downstream SME."),
    "verifier": ("Green Verify Co", "verifier",
                 "Accredited verifier. Reviews and signs opinions."),
    "importer": ("EU Imports GmbH", "importer",
                 "EU buyer. Sees verified data and its savings."),
}


@router.get("/personas")
def list_personas():
    return [
        {"key": key, "name": name, "role": role, "about": about}
        for key, (name, role, about) in PERSONAS.items()
    ]


def ensure_persona(session: Session, key: str) -> User:
    """Find or create the user and organization for a persona."""
    name, role, _ = PERSONAS[key]
    email = f"{key}@demo.temper"
    user = session.scalar(select(User).where(User.email == email))
    if user is None:
        org = Organization(name=name, role=role)
        session.add(org)
        session.flush()
        user = User(
            organization_id=org.id, email=email,
            password_hash=hash_password("demo"),
        )
        session.add(user)
        session.commit()
    return user


@router.post("/seed")
def seed(
    session: Session = Depends(get_session),
    settings=Depends(get_settings),
):
    """Create the demo workspace once. Safe to call again."""
    return seed_demo(session, settings, lambda key: ensure_persona(session, key))


@router.post("/enter/{key}")
def enter(key: str, session: Session = Depends(get_session)):
    if key not in PERSONAS:
        raise HTTPException(404, "Unknown persona")
    return {"token": _issue_token(session, ensure_persona(session, key))}


@router.get("/sample-pack")
def sample_pack(
    session: Session = Depends(get_session),
):
    """A real verification pack from the demo data, for trying the
    public verifier without an account."""
    from app.models import Statement
    from app.services.packs import build_pack
    from app.services.statements import is_verified
    for statement in session.scalars(select(Statement).order_by(Statement.id)):
        if is_verified(session, statement):
            return build_pack(session, statement, full=True)
    raise HTTPException(404, "Seed the demo workspace first")
