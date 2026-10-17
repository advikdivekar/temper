"""packs.py

WHAT THIS FILE DOES
    Builds a "verification pack" for a statement and checks one.

WHY IT EXISTS
    Trust should not depend on trusting Temper's website. A pack is a
    plain JSON file holding everything an outside auditor needs to
    check a statement on their own: the signed content, the hash, the
    signatures, and the public keys. Anyone can drop it into the public
    verifier (or write their own in ten lines) and get a yes or no.

CONCEPTS IN THIS FILE
    Full pack versus attestation pack
        Owners and verifiers get the full content, so the hash can be
        recomputed from scratch. Recipients such as importers get an
        attestation pack: the hash, signature and opinions, but not the
        plant level inputs. It proves who vouched for the number
        without revealing volumes (selective disclosure).
    Independent verification
        verify_pack uses only what is inside the pack plus a lookup of
        which public key each organization registered.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Installation, Organization, PrecursorRef, Statement, VerificationOpinion,
)
from app.services import signing
from app.services.canonical import canonical_bytes, canonical_hash
from app.services.statements import content_of, normalize_tonnes

PACK_FORMAT = "temper.pack.v1"


def _iso(value) -> str:
    return value.isoformat()


def build_pack(session: Session, statement: Statement, full: bool) -> dict:
    installation = session.get(Installation, statement.installation_id)
    owner = session.get(Organization, installation.organization_id)
    refs = session.scalars(
        select(PrecursorRef).where(PrecursorRef.statement_id == statement.id)
    ).all()
    precursors = [
        {
            "material": r.material_name,
            "tonnes": normalize_tonnes(r.tonnes_used),
            "upstream": r.upstream_statement_id,
            "upstream_hash": r.upstream_hash,
            "default_id": r.default_value_id,
        }
        for r in refs
    ]
    opinions = []
    for op in session.scalars(
        select(VerificationOpinion).where(
            VerificationOpinion.statement_id == statement.id
        )
    ):
        verifier = session.get(Organization, op.verifier_org_id)
        opinions.append(
            {
                "verifier": verifier.name,
                "verifier_org_id": verifier.id,
                "public_key": verifier.public_key,
                "conclusion": op.conclusion,
                "comments": op.comments,
                "signed_at": _iso(op.signed_at),
                "signature": op.signature,
            }
        )
    pack = {
        "format": PACK_FORMAT,
        "level": "full" if full else "attestation",
        "generated_at": _iso(datetime.now(timezone.utc).replace(tzinfo=None)),
        "statement": {
            "id": statement.id,
            "supplier": owner.name,
            "methodology": statement.methodology,
            "see_by_product": statement.see_by_product,
            "content_hash": statement.content_hash,
            "signature": statement.signature,
            "signed_at": _iso(statement.signed_at) if statement.signed_at else None,
        },
        "signer": {
            "organization": owner.name,
            "organization_id": owner.id,
            "public_key": owner.public_key,
        },
        "opinions": opinions,
    }
    if full:
        pack["content"] = json_safe(content_of(statement, precursors))
        pack["trace"] = statement.trace
    return pack


def json_safe(content: dict) -> dict:
    """The same content, with dates and decimals written as text."""
    import json
    from app.services.canonical import _default
    return json.loads(json.dumps(content, default=_default))


def verify_pack(session: Session, pack: dict) -> dict:
    """Check a pack. Returns a list of named checks, each pass or fail."""
    checks = []

    def add(key, label, ok, detail=""):
        checks.append({"id": key, "label": label, "ok": bool(ok), "detail": detail})

    if pack.get("format") != PACK_FORMAT:
        add("format", "Recognised pack format", False, f"expected {PACK_FORMAT}")
        return {"valid": False, "checks": checks}
    add("format", "Recognised pack format", True, PACK_FORMAT)

    st = pack["statement"]
    signer = pack["signer"]

    if "content" in pack:
        recomputed = canonical_hash(pack["content"])
        add("hash", "Content hash recomputed from the data",
            recomputed == st["content_hash"],
            f"computed {recomputed[:16]}... stored {st['content_hash'][:16]}...")
    else:
        add("hash", "Content hash recomputed from the data", False,
            "attestation pack: plant data withheld, hash cannot be recomputed")

    sig_ok = bool(st.get("signature")) and bool(signer.get("public_key")) and signing.verify(
        signer["public_key"], st["content_hash"].encode(), st["signature"]
    )
    add("signature", f"Supplier signature valid ({signer['organization']})", sig_ok)

    registered = session.get(Organization, signer["organization_id"])
    add("registered", "Signer key matches the key registered with Temper",
        registered is not None and registered.public_key == signer.get("public_key"))

    for i, op in enumerate(pack.get("opinions", [])):
        message = canonical_bytes({
            "statement": st["content_hash"], "conclusion": op["conclusion"],
            "comments": op["comments"], "signed_at": op["signed_at"],
        })
        ok = bool(op.get("public_key")) and signing.verify(
            op["public_key"], message, op["signature"]
        )
        reg = session.get(Organization, op["verifier_org_id"])
        add(f"opinion{i}", f"Verifier opinion valid ({op['verifier']}: {op['conclusion']})",
            ok and reg is not None and reg.public_key == op["public_key"])

    if not pack.get("opinions"):
        add("opinions", "Verifier opinion present", False, "no verifier has signed yet")

    return {"valid": all(c["ok"] for c in checks), "checks": checks}
