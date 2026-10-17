"""test_demo_and_packs.py

Seeds the demo workspace through the real services, then checks the
product features built on top of it: the seeded story, the dashboard,
the network, ledger time travel, and verification packs.
"""

import io
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import ROOT, Settings
from app.main import create_app


def make_client(tmp_path: Path) -> TestClient:
    settings = Settings(
        database_url="sqlite://", evidence_dir=tmp_path / "evidence",
        key_dir=tmp_path / "keys", data_dir=ROOT / "data",
    )
    return TestClient(create_app(settings))


def login(client, key):
    token = client.post(f"/demo/enter/{key}").json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_seed_story_and_features(tmp_path):
    client = make_client(tmp_path)
    assert client.post("/demo/seed").json()["seeded"] is True
    assert client.post("/demo/seed").json()["seeded"] is False  # idempotent

    bolts = login(client, "bolts")
    statements = client.get("/statements", headers=bolts).json()
    stale = [s for s in statements if s["status"] == "stale"]
    assert len(stale) == 1  # the Q2 statement after the mill's correction

    overview = client.get("/overview", headers=bolts).json()
    kinds = {a["kind"] for a in overview["attention"]}
    assert {"stale", "request"} <= kinds
    assert overview["kpis"]["plants"] == 2

    # Recompute fixes the stale statement.
    rebuilt = client.post("/statements/recompute", headers=bolts).json()
    assert len(rebuilt) == 1
    # The list shows only latest versions, so nothing is stale any more.
    after = client.get("/statements", headers=bolts).json()
    assert not [s for s in after if s["status"] == "stale"]

    # Network: the mill feeds the bolt works, and EU defaults feed Q4.
    network = client.get("/network", headers=bolts).json()
    names = {n["name"] for n in network["nodes"]}
    assert "Steel Mill Pvt Ltd" in names and "EU default values" in names

    # Audit chain is intact and scoped to the org.
    audit = client.get("/audit", headers=bolts).json()
    assert audit["intact"] and audit["entries"]

    # Time travel: the mill's coal figure before and after the correction.
    mill = login(client, "mill")
    plant = client.get("/installations", headers=mill).json()[0]["id"]
    ledger = client.get(f"/installations/{plant}/ledger", headers=mill).json()
    assert any(r["supersedes_id"] for r in ledger)


def test_pack_roundtrip_and_tamper(tmp_path):
    client = make_client(tmp_path)
    client.post("/demo/seed")
    mill = login(client, "mill")
    statements = client.get("/statements", headers=mill).json()
    verified = next(s for s in statements if s["verified"])

    pack = client.get(f"/statements/{verified['id']}/pack", headers=mill).json()
    assert pack["level"] == "full"
    result = client.post("/verify-pack", json=pack).json()
    assert result["valid"], result  # public, no login

    # Tamper with a figure inside the content: the hash check must fail.
    pack["content"]["total_tco2"] = "1.000000"
    broken = client.post("/verify-pack", json=pack).json()
    assert broken["valid"] is False
    assert not next(c for c in broken["checks"] if c["id"] == "hash")["ok"]

    # Importers get an attestation pack: signatures verify, hash not recomputable.
    importer = login(client, "importer")
    shared = client.get("/statements", headers=importer).json()[0]
    att = client.get(f"/statements/{shared['id']}/pack", headers=importer).json()
    assert att["level"] == "attestation" and "content" not in att
    checks = {c["id"]: c["ok"] for c in client.post("/verify-pack", json=att).json()["checks"]}
    assert checks["signature"] and checks["registered"] and not checks["hash"]


def test_requests_flow(tmp_path):
    client = make_client(tmp_path)
    client.post("/demo/seed")
    mill = login(client, "mill")
    inbox = client.get("/requests", headers=mill).json()
    incoming = [r for r in inbox if r["direction"] == "incoming" and r["status"] == "open"]
    assert incoming
    done = client.post(f"/requests/{incoming[0]['id']}/resolve", headers=mill).json()
    assert done["status"] == "resolved"
