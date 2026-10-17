"""test_supply_chain.py

The key scenario of the product: a steel mill and a bolt maker.

1. The mill builds, signs and gets a statement verified.
2. The bolt maker links to it and gets a lower number than on defaults.
3. The mill revises its statement. The bolt maker's statement goes
   stale and is recomputed to the new number.
4. A circular link is refused.
"""

from datetime import date, datetime
from decimal import Decimal

import pytest

from app.database import make_session_factory
from app.ledger import add_record, correct_record, records_as_of
from app.models import Installation, Organization, Statement
from app.services import trust
from app.services.evidence_helper import make_evidence
from app.services.reference_data import load_reference_data
from app.services.statements import build_statement, recompute_stale
from app.config import ROOT

START, END = date(2026, 1, 1), date(2026, 12, 31)
METHOD = "cbam_steel_and_aluminium:1"


@pytest.fixture
def world(tmp_path):
    session = make_session_factory("sqlite://")()
    load_reference_data(session, ROOT / "data")
    mill_org = Organization(name="Mill", role="supplier")
    fab_org = Organization(name="Fab", role="supplier")
    verifier = Organization(name="Verifier", role="verifier")
    session.add_all([mill_org, fab_org, verifier])
    session.commit()
    mill = Installation(organization_id=mill_org.id, name="Mill plant")
    fab = Installation(organization_id=fab_org.id, name="Fab plant")
    session.add_all([mill, fab])
    session.commit()
    evidence = make_evidence(session, tmp_path)
    return session, tmp_path, mill_org, fab_org, verifier, mill, fab, evidence


def add(session, installation, kind, name, amount, unit, evidence):
    return add_record(
        session, kind, name, Decimal(amount), unit, START, END,
        evidence.id, installation_id=installation.id,
    )


def publish(session, keys, org, verifier, statement):
    trust.sign_statement(session, keys, org, statement, 1)
    trust.add_opinion(session, keys, verifier, statement,
                      "satisfactory", "ok", 1)


def test_chain_stale_and_recompute(world):
    session, keys, mill_org, fab_org, verifier, mill, fab, ev = world

    add(session, mill, "fuel", "coal", "1000", "tonne", ev)
    add(session, mill, "output", "steel_coil", "1000", "tonne", ev)
    mill_stmt = build_statement(
        session, mill, START, END, [], METHOD, 1
    )
    assert mill_stmt.see_by_product["steel_coil"] == "2.40000"
    publish(session, keys, mill_org, verifier, mill_stmt)

    add(session, fab, "fuel", "coal", "10", "tonne", ev)
    add(session, fab, "output", "bolts", "100", "tonne", ev)
    link = [{"material_name": "steel", "tonnes": "100", "cn_code": "7208",
             "upstream_statement_id": mill_stmt.id,
             "upstream_product": "steel_coil"}]
    fab_stmt = build_statement(session, fab, START, END, link, METHOD, 1)
    # 10 t coal x 2.4 = 24, steel 100 t x 2.4 actual = 240, over 100 t.
    assert fab_stmt.see_by_product["bolts"] == "2.64000"

    # Mill corrects its coal use and builds a new version.
    first_coal = [
        r for r in records_as_of(session)
        if r.installation_id == mill.id and r.name == "coal"
    ][0]
    correct_record(session, first_coal, Decimal("500"), ev.id)
    new_mill = build_statement(session, mill, START, END, [], METHOD, 1)
    assert new_mill.supersedes_id == mill_stmt.id

    session.refresh(fab_stmt)
    assert fab_stmt.status == "stale"

    publish(session, keys, mill_org, verifier, new_mill)
    rebuilt = recompute_stale(session, 1)
    assert len(rebuilt) == 1
    assert rebuilt[0].see_by_product["bolts"] == "1.44000"


def test_cycle_is_refused(world):
    session, keys, mill_org, fab_org, verifier, mill, fab, ev = world
    add(session, mill, "fuel", "coal", "100", "tonne", ev)
    add(session, mill, "output", "steel_coil", "100", "tonne", ev)
    mill_stmt = build_statement(session, mill, START, END, [], METHOD, 1)
    publish(session, keys, mill_org, verifier, mill_stmt)

    add(session, fab, "fuel", "coal", "10", "tonne", ev)
    add(session, fab, "output", "bolts", "10", "tonne", ev)
    link = [{"material_name": "steel", "tonnes": "5", "cn_code": "7208",
             "upstream_statement_id": mill_stmt.id,
             "upstream_product": "steel_coil"}]
    fab_stmt = build_statement(session, fab, START, END, link, METHOD, 1)
    publish(session, keys, fab_org, verifier, fab_stmt)

    # The mill now tries to buy from the fabricator it supplies.
    back = [{"material_name": "bolts", "tonnes": "1", "cn_code": "7208",
             "upstream_statement_id": fab_stmt.id,
             "upstream_product": "bolts"}]
    with pytest.raises(ValueError, match="cycle"):
        build_statement(session, mill, START, END, back, METHOD, 1)
