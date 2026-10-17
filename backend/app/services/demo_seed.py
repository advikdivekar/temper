"""demo_seed.py

WHAT THIS FILE DOES
    Fills a fresh database with a realistic demo workspace so the
    product can be explored without an empty first screen.

THE STORY IT TELLS (all synthetic)
    * A steel mill reports four quarters of 2026. Its fuel use falls a
      little each quarter. Q1 to Q3 are signed and verified.
    * A bolt works buys that steel. Q1 to Q3 link to the mill's verified
      numbers. Q4 falls back to the EU default because the mill's Q4
      statement is not verified yet.
    * Later the mill corrects a Q2 fuel figure. That creates a new Q2
      version, so the bolt works' Q2 statement is now stale and shows
      up as something to recompute.
    * A second bolt plant has no mill link, so it sits on defaults.
    * Open requests wait in the inboxes.

Everything goes through the same services the real API uses, so the
seeded data has genuine hashes, signatures and audit entries.
"""

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.evidence import save_evidence
from app.ledger import add_record, correct_record, records_as_of
from app.models import DataRequest, Good, Installation, Organization
from app.services import trust
from app.services.audit import append_audit
from app.services.reference_data import load_reference_data
from app.services.statements import build_statement

METHOD = "cbam_steel_and_aluminium:1"

QUARTERS = [
    (date(2026, 1, 1), date(2026, 3, 31)),
    (date(2026, 4, 1), date(2026, 6, 30)),
    (date(2026, 7, 1), date(2026, 9, 30)),
    (date(2026, 10, 1), date(2026, 12, 31)),
]

# Per quarter: product tonnes, coal tonnes, natural gas GJ, power kWh.
MILL = [(9800, 12650, 29000, 5_200_000), (10400, 12800, 30500, 5_450_000),
        (10900, 12950, 31000, 5_700_000), (11200, 12900, 31500, 5_850_000)]
BOLTS = [(800, 0, 2400, 410_000), (860, 0, 2500, 432_000),
         (910, 0, 2650, 455_000), (950, 0, 2700, 470_000)]
STEEL_BOUGHT = [832, 894, 946, 988]
NUTS = [(380, 0, 1100, 190_000), (400, 0, 1150, 198_000),
        (420, 0, 1180, 205_000), (440, 0, 1200, 214_000)]


def _evidence(session, settings, org, label: str):
    record = save_evidence(
        session, settings.evidence_dir, f"{label}.pdf",
        f"SYNTHETIC DEMO DOCUMENT: {label}".encode(),
    )
    if record.organization_id is None:
        record.organization_id = org.id
        session.commit()
    return record


# When each quarter's records were entered. They are spread over past
# months so the ledger's time travel has real moments to travel between.
ENTERED = [datetime(2026, 4, 10, 9, 30), datetime(2026, 7, 12, 11, 15),
           datetime(2026, 10, 8, 14, 5), datetime(2026, 10, 15, 16, 40)]


def _record_quarter(session, settings, org, plant, quarter, product, row):
    start, end = quarter
    q = f"Q{QUARTERS.index(quarter) + 1} 2026"
    out_t, coal_t, gas_gj, kwh = row
    fuel_doc = _evidence(session, settings, org, f"{plant.name} fuel invoices {q}")
    power_doc = _evidence(session, settings, org, f"{plant.name} electricity bills {q}")
    log_doc = _evidence(session, settings, org, f"{plant.name} production log {q}")
    rows = [("output", product, out_t, "tonne", log_doc),
            ("fuel", "natural_gas", gas_gj, "gj", fuel_doc),
            ("electricity", "grid_india", kwh, "kwh", power_doc)]
    if coal_t:
        rows.insert(1, ("fuel", "coal", coal_t, "tonne", fuel_doc))
    for kind, name, amount, unit, doc in rows:
        add_record(session, kind, name, Decimal(amount), unit, start, end,
                   doc.id, recorded_at=ENTERED[QUARTERS.index(quarter)],
                   installation_id=plant.id)


def _publish(session, settings, owner, statement, user_id, recipients,
             verifier=None, verify=True):
    trust.sign_statement(session, settings.key_dir, owner, statement, user_id)
    for recipient in recipients:
        trust.grant_share(session, owner, statement, recipient.id, user_id)
    if verifier and verify:
        trust.add_opinion(
            session, settings.key_dir, verifier, statement, "satisfactory",
            "Evidence sampled, trace reproduced, precursors checked.",
            verifier_user_id(session, verifier),
        )


def verifier_user_id(session, org) -> int:
    from app.models import User
    return session.scalars(select(User).where(User.organization_id == org.id)).first().id


def seed_demo(session: Session, settings, ensure_user) -> dict:
    load_reference_data(session, settings.data_dir)
    mill_user = ensure_user("mill")
    bolts_user = ensure_user("bolts")
    verifier_user = ensure_user("verifier")
    importer_user = ensure_user("importer")
    mill, bolts, verifier, importer = (
        session.get(Organization, u.organization_id)
        for u in (mill_user, bolts_user, verifier_user, importer_user)
    )

    if session.scalars(
        select(Installation).where(Installation.organization_id == mill.id)
    ).first():
        return {"seeded": False}

    # Plants
    jamshedpur = Installation(organization_id=mill.id, name="Jamshedpur integrated works")
    pune = Installation(organization_id=bolts.id, name="Pune fastener works")
    coimbatore = Installation(organization_id=bolts.id, name="Coimbatore nut and washer unit")
    session.add_all([jamshedpur, pune, coimbatore])
    session.commit()

    # The customs (CN) code of each product, so the EU default for the
    # finished good can be looked up. Codes from the Commission's table.
    session.add_all([
        Good(installation_id=jamshedpur.id, name="steel_rods", cn_code="7213"),
        Good(installation_id=pune.id, name="bolts", cn_code="73181590"),
        Good(installation_id=coimbatore.id, name="nuts", cn_code="73181600"),
    ])
    session.commit()

    # Four quarters of confirmed records for each plant.
    for i, quarter in enumerate(QUARTERS):
        _record_quarter(session, settings, mill, jamshedpur, quarter, "steel_rods", MILL[i])
        _record_quarter(session, settings, bolts, pune, quarter, "bolts", BOLTS[i])
        _record_quarter(session, settings, bolts, coimbatore, quarter, "nuts", NUTS[i])

    # Mill statements: signed and shared for all four quarters,
    # verified for the first three.
    mill_statements = []
    for i, (start, end) in enumerate(QUARTERS):
        statement = build_statement(session, jamshedpur, start, end, [], METHOD, mill_user.id)
        _publish(session, settings, mill, statement, mill_user.id,
                 [verifier, bolts, importer], verifier, verify=i < 3)
        mill_statements.append(statement)

    # Bolt works: link to the mill's quarter. Q4 falls back to default.
    bolts_statements = []
    for i, (start, end) in enumerate(QUARTERS):
        link = [{"material_name": "steel rods", "tonnes": str(STEEL_BOUGHT[i]),
                 "cn_code": "7213", "for_product": "bolts",
                 "upstream_statement_id": mill_statements[i].id,
                 "upstream_product": "steel_rods"}]
        statement = build_statement(session, pune, start, end, link, METHOD, bolts_user.id)
        _publish(session, settings, bolts, statement, bolts_user.id,
                 [verifier, importer], verifier, verify=i < 2)
        bolts_statements.append(statement)

    # Second bolt plant: steel from a supplier with no data, so defaults.
    for i in (2, 3):
        start, end = QUARTERS[i]
        statement = build_statement(
            session, coimbatore, start, end,
            [{"material_name": "steel rods", "tonnes": str(int(NUTS[i][0] * 1.05)),
              "cn_code": "7213", "for_product": "nuts"}], METHOD, bolts_user.id)
        _publish(session, settings, bolts, statement, bolts_user.id,
                 [verifier, importer], verifier, verify=False)

    # The mill corrects a Q2 fuel figure. That makes a new Q2 version,
    # and the bolt works' Q2 statement is flagged stale.
    start, end = QUARTERS[1]
    coal = next(r for r in records_as_of(session)
                if r.installation_id == jamshedpur.id and r.name == "coal"
                and r.valid_from == start)
    correct_record(session, coal, Decimal("12480"), coal.evidence_id)
    build_statement(session, jamshedpur, start, end, [], METHOD, mill_user.id)

    # Requests waiting in inboxes.
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    session.add_all([
        DataRequest(from_org_id=importer.id, to_org_id=bolts.id, kind="verify",
                    message="Please get Q3 and Q4 verified before our September declaration.",
                    created_at=now),
        DataRequest(from_org_id=bolts.id, to_org_id=mill.id, kind="verify",
                    statement_id=mill_statements[3].id,
                    message="Your Q4 statement is unverified, so we are still on the EU default. Can you send it to your verifier?",
                    created_at=now),
    ])
    session.commit()
    append_audit(session, None, "demo_seeded", "synthetic demo workspace created")
    return {"seeded": True, "statements": 11}
