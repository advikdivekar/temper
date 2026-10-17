"""signing.py

WHAT THIS FILE DOES
    Creates signing keys for organizations and signs or verifies data.

CONCEPTS IN THIS FILE
    Digital signature (Ed25519)
        The owner holds a private key and signs data with it. Anyone
        with the matching public key can check the signature, but only
        the owner could have made it. This proves who vouched for a
        statement, and that it has not changed since.
    Key storage
        Private keys live in files in KEY_DIR, never in the database.
        The database holds only the public key.
"""

from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

from app.models.accounts import Organization


def _key_path(key_dir: Path, org_id: int) -> Path:
    return key_dir / f"org_{org_id}.key"


def ensure_keypair(key_dir: Path, org: Organization) -> str:
    """Create a key pair for the organization if needed. Return public hex."""
    path = _key_path(key_dir, org.id)
    if path.exists():
        private = serialization.load_pem_private_key(
            path.read_bytes(), password=None
        )
    else:
        key_dir.mkdir(parents=True, exist_ok=True)
        private = Ed25519PrivateKey.generate()
        path.write_bytes(
            private.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            )
        )
        path.chmod(0o600)
    public = private.public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw
    )
    org.public_key = public.hex()
    return org.public_key


def sign(key_dir: Path, org: Organization, message: bytes) -> str:
    private = serialization.load_pem_private_key(
        _key_path(key_dir, org.id).read_bytes(), password=None
    )
    return private.sign(message).hex()


def verify(public_key_hex: str, message: bytes, signature_hex: str) -> bool:
    public = Ed25519PublicKey.from_public_bytes(bytes.fromhex(public_key_hex))
    try:
        public.verify(bytes.fromhex(signature_hex), message)
        return True
    except InvalidSignature:
        return False
