"""test_api_flow.py

Walks the whole product through the HTTP API, as real clients would:
supplier uploads and builds, signs, a verifier gives an opinion, the
supplier shares with an importer, and the importer sees the result
without the raw trace.
"""

import io
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import ROOT, Settings
from app.main import create_app


def make_client(tmp_path: Path) -> TestClient:
    settings = Settings(
        database_url="sqlite://",
        evidence_dir=tmp_path / "evidence",
        key_dir=tmp_path / "keys",
        data_dir=ROOT / "data",
    )
    return TestClient(create_app(settings))


def register(client, name, role, email):
    response = client.post("/auth/register", json={
        "organization_name": name, "role": role,
        "email": email, "password": "pw12345"})
    assert response.status_code == 200
    body = response.json()
    return {"Authorization": f"Bearer {body['token']}"}, body["organization_id"]


def test_full_flow(tmp_path):
    client = make_client(tmp_path)
    supplier, _ = register(client, "Bolts Ltd", "supplier", "s@x.com")
    verifier, _ = register(client, "Verify Co", "verifier", "v@x.com")
    importer, importer_id = register(client, "EU Imports", "importer", "i@x.com")

    inst = client.post("/installations", json={"name": "Plant 1"},
                       headers=supplier).json()["id"]
    ev = client.post("/evidence", headers=supplier, files={
        "file": ("bill.txt", io.BytesIO(b"bill"), "text/plain")}).json()["id"]

    def record(kind, name, amount, unit):
        return client.post("/records", headers=supplier, json={
            "installation_id": inst, "kind": kind, "name": name,
            "amount": amount, "unit": unit, "valid_from": "2026-01-01",
            "valid_to": "2026-12-31", "evidence_id": ev})

    assert record("fuel", "coal", "10", "tonne").status_code == 200
    assert record("output", "bolts", "100", "tonne").status_code == 200

    built = client.post("/statements", headers=supplier, json={
        "installation_id": inst, "period_start": "2026-01-01",
        "period_end": "2026-12-31",
        "precursors": [{"material_name": "steel", "tonnes": "100",
                        "cn_code": "7208"}]})
    assert built.status_code == 200, built.text
    statement = built.json()
    # 24.4068 direct + 100 t x 4.28 x 1.10 = 495.2068 over 100 t
    assert statement["see_by_product"]["bolts"] == "4.95207"
    sid = statement["id"]

    assert client.post(f"/statements/{sid}/sign",
                       headers=supplier).json()["status"] == "signed"
    opinion_before_share = client.post(
        f"/statements/{sid}/opinion", headers=verifier,
        json={"conclusion": "satisfactory"})
    assert opinion_before_share.status_code == 404  # not shared yet

    verifier_id = client.get("/auth/organizations", headers=supplier).json()[1]["id"]
    client.post(f"/statements/{sid}/share", headers=supplier,
                json={"recipient_org_id": verifier_id})
    done = client.post(f"/statements/{sid}/opinion", headers=verifier,
                       json={"conclusion": "satisfactory"})
    assert done.json()["verified"] is True

    grant = client.post(f"/statements/{sid}/share", headers=supplier,
                        json={"recipient_org_id": importer_id}).json()
    seen = client.get(f"/statements/{sid}", headers=importer).json()
    assert seen["verified"] is True and seen["signature_valid"] is True
    assert "trace" not in seen  # selective disclosure

    client.post(f"/shares/{grant['grant_id']}/revoke", headers=supplier)
    assert client.get(f"/statements/{sid}", headers=importer).status_code == 404
    assert client.get("/audit/verify", headers=supplier).json()["intact"]


def test_role_is_enforced(tmp_path):
    client = make_client(tmp_path)
    importer, _ = register(client, "EU Imports", "importer", "i@x.com")
    response = client.post("/installations", json={"name": "x"},
                           headers=importer)
    assert response.status_code == 403
    assert client.get("/installations").status_code == 401


def test_savings_versus_default(tmp_path):
    client = make_client(tmp_path)
    supplier, _ = register(client, "Bolts Ltd", "supplier", "s@x.com")
    inst = client.post("/installations", json={"name": "P"},
                       headers=supplier).json()["id"]
    ev = client.post("/evidence", headers=supplier, files={
        "file": ("b.txt", io.BytesIO(b"b"), "text/plain")}).json()["id"]
    for kind, name, amount in (("fuel", "coal", "10"),
                               ("output", "bolts", "100")):
        client.post("/records", headers=supplier, json={
            "installation_id": inst, "kind": kind, "name": name,
            "amount": amount, "unit": "tonne", "valid_from": "2026-01-01",
            "valid_to": "2026-12-31", "evidence_id": ev})
    sid = client.post("/statements", headers=supplier, json={
        "installation_id": inst, "period_start": "2026-01-01",
        "period_end": "2026-12-31",
        "precursors": [{"material_name": "steel", "tonnes": "100",
                        "cn_code": "7208"}]}).json()["id"]
    result = client.get(
        f"/statements/{sid}/savings?product=bolts&tonnes=50"
        "&certificate_price_eur=80", headers=supplier).json()
    # Nothing verified upstream, so actual equals default: no saving.
    assert result["saving_eur"] == "0.00"


def test_incoming_chain_and_breakdown(tmp_path):
    client = make_client(tmp_path)
    mill, _ = register(client, "Mill", "supplier", "m@x.com")
    fab, fab_id = register(client, "Fab", "supplier", "f@x.com")
    verifier, verifier_id = register(client, "Ver", "verifier", "v@x.com")

    def make(headers, coal, product, tonnes, precursors):
        inst = client.post("/installations", json={"name": "P"},
                           headers=headers).json()["id"]
        ev = client.post("/evidence", headers=headers, files={
            "file": ("b.txt", io.BytesIO(coal.encode()), "text/plain")
        }).json()["id"]
        for kind, name, amount in (("fuel", "coal", coal),
                                   ("output", product, tonnes)):
            client.post("/records", headers=headers, json={
                "installation_id": inst, "kind": kind, "name": name,
                "amount": amount, "unit": "tonne",
                "valid_from": "2026-01-01", "valid_to": "2026-12-31",
                "evidence_id": ev})
        return client.post("/statements", headers=headers, json={
            "installation_id": inst, "period_start": "2026-01-01",
            "period_end": "2026-12-31", "precursors": precursors}).json()

    mill_stmt = make(mill, "100", "steel_coil", "100", [])
    assert mill_stmt["breakdown"]["direct"] == "244.068000"
    client.post(f"/statements/{mill_stmt['id']}/sign", headers=mill)
    client.post(f"/statements/{mill_stmt['id']}/share", headers=mill,
                json={"recipient_org_id": verifier_id})
    client.post(f"/statements/{mill_stmt['id']}/opinion", headers=verifier,
                json={"conclusion": "satisfactory"})
    client.post(f"/statements/{mill_stmt['id']}/share", headers=mill,
                json={"recipient_org_id": fab_id})

    incoming = client.get("/statements/incoming", headers=fab).json()
    assert [s["id"] for s in incoming] == [mill_stmt["id"]]
    assert incoming[0]["verified"] is True

    fab_stmt = make(fab, "10", "bolts", "100", [
        {"material_name": "steel", "tonnes": "100", "cn_code": "7208",
         "upstream_statement_id": mill_stmt["id"],
         "upstream_product": "steel_coil"}])
    chain = client.get(f"/statements/{fab_stmt['id']}/chain",
                       headers=fab).json()
    assert len(chain["nodes"]) == 2 and len(chain["edges"]) == 1
    events = [e["event"] for e in fab_stmt["timeline"]]
    assert events == ["built"]
