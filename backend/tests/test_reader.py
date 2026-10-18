"""test_reader.py

The AI reader through the HTTP API. The real reader service is replaced
by a fake, so these tests need no model. What they prove is the rule:
the reader suggests, a person confirms, and only then does a ledger
record exist.
"""

import io

from app.services import reader
from tests.test_api_flow import make_client, register

BILL = b"Previous reading: 2,58,540\nCurrent reading: 5,28,063 kWh\n"


def fake_answer(value=269523.0, review=False, fields=None):
    return {"doc_type": "electricity_bill", "model": "fake", "missing": [],
            "needs_review": review, "seconds": 0.1,
            "fields": fields or [{"name": "energy_kwh", "value": value,
                                  "confidence": 0.95,
                                  "how": "5,28,063 kwh minus 2,58,540 kwh"}]}


def setup(tmp_path, monkeypatch, answer=None):
    monkeypatch.setattr(reader, "read_document",
                        lambda url, doc_type, text, timeout=60: answer or fake_answer())
    client = make_client(tmp_path)
    headers, _ = register(client, "Bolts Ltd", "supplier", "s@x.com")
    plant = client.post("/installations", json={"name": "P"}, headers=headers).json()["id"]
    return client, headers, plant


def upload(client, headers, data=BILL, name="bill.txt"):
    return client.post("/evidence", headers=headers, files={
        "file": (name, io.BytesIO(data), "text/plain")}).json()["id"]


def confirm_body(plant, amount="269523"):
    return {"installation_id": plant, "kind": "electricity", "name": "grid_india",
            "amount": amount, "unit": "kwh", "valid_from": "2026-01-01",
            "valid_to": "2026-12-31"}


def test_suggestion_is_not_a_record_until_confirmed(tmp_path, monkeypatch):
    client, headers, plant = setup(tmp_path, monkeypatch)
    ev = upload(client, headers)
    read = client.post(f"/evidence/{ev}/read", headers=headers,
                       json={"doc_type": "electricity_bill"}).json()
    assert read["status"] == "pending"
    assert read["suggested"]["amount"] == 269523.0
    assert client.get(f"/installations/{plant}/records", headers=headers).json() == []
    done = client.post(f"/reads/{read['id']}/confirm", headers=headers,
                       json=confirm_body(plant)).json()
    assert done["status"] == "confirmed" and done["corrected"] is False
    records = client.get(f"/installations/{plant}/records", headers=headers).json()
    assert len(records) == 1 and records[0]["evidence_id"] == ev


def test_a_correction_is_remembered(tmp_path, monkeypatch):
    client, headers, plant = setup(tmp_path, monkeypatch)
    ev = upload(client, headers)
    read = client.post(f"/evidence/{ev}/read", headers=headers,
                       json={"doc_type": "electricity_bill"}).json()
    done = client.post(f"/reads/{read['id']}/confirm", headers=headers,
                       json=confirm_body(plant, "270000")).json()
    assert done["corrected"] is True
    again = client.post(f"/reads/{read['id']}/confirm", headers=headers,
                        json=confirm_body(plant))
    assert again.status_code == 409


def test_reject_leaves_no_record(tmp_path, monkeypatch):
    client, headers, plant = setup(tmp_path, monkeypatch)
    ev = upload(client, headers)
    read = client.post(f"/evidence/{ev}/read", headers=headers,
                       json={"doc_type": "electricity_bill"}).json()
    assert client.post(f"/reads/{read['id']}/reject", headers=headers).json()["status"] == "rejected"
    assert client.get(f"/installations/{plant}/records", headers=headers).json() == []


def test_image_and_offline_reader_give_clear_errors(tmp_path, monkeypatch):
    client, headers, plant = setup(tmp_path, monkeypatch)
    image = upload(client, headers, bytes(range(256)) * 4, "scan.png")
    bad = client.post(f"/evidence/{image}/read", headers=headers,
                      json={"doc_type": "electricity_bill"})
    assert bad.status_code == 422 and "image or a PDF" in bad.json()["detail"]

    def down(*args, **kwargs):
        raise reader.ReaderUnavailable("connection refused")
    monkeypatch.setattr(reader, "read_document", down)
    ev = upload(client, headers)
    offline = client.post(f"/evidence/{ev}/read", headers=headers,
                          json={"doc_type": "electricity_bill"})
    assert offline.status_code == 503 and "type the numbers" in offline.json()["detail"]


def test_kilolitres_must_be_converted_first(tmp_path, monkeypatch):
    client, headers, plant = setup(tmp_path, monkeypatch, {
        "doc_type": "fuel_invoice", "model": "fake", "missing": [], "needs_review": False,
        "fields": [{"name": "fuel", "value": "diesel", "confidence": .95, "how": ""},
                   {"name": "quantity", "value": 171.0, "confidence": .95, "how": ""},
                   {"name": "unit", "value": "kl", "confidence": .95, "how": ""}]})
    ev = upload(client, headers, b"Diesel 83 KL and 88 KL")
    read = client.post(f"/evidence/{ev}/read", headers=headers,
                       json={"doc_type": "fuel_invoice"}).json()
    body = {"installation_id": plant, "kind": "fuel", "name": "diesel", "amount": "171",
            "unit": "kl", "valid_from": "2026-01-01", "valid_to": "2026-12-31"}
    assert client.post(f"/reads/{read['id']}/confirm", headers=headers, json=body).status_code == 422
    body["unit"], body["amount"] = "gj", "6500"
    assert client.post(f"/reads/{read['id']}/confirm", headers=headers, json=body).status_code == 200


def test_another_organization_cannot_see_or_confirm(tmp_path, monkeypatch):
    client, headers, plant = setup(tmp_path, monkeypatch)
    ev = upload(client, headers)
    read = client.post(f"/evidence/{ev}/read", headers=headers,
                       json={"doc_type": "electricity_bill"}).json()
    other, _ = register(client, "Other Ltd", "supplier", "o@x.com")
    assert client.get("/reads", headers=other).json() == []
    assert client.post(f"/reads/{read['id']}/reject", headers=other).status_code == 404
    assert client.post(f"/evidence/{ev}/read", headers=other,
                       json={"doc_type": "electricity_bill"}).status_code == 404
