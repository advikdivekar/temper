"""test_calculate.py

Checks the code that does the arithmetic and the grounding check, and
that the generator's raw terms always reproduce its own truth, including
on noisy pages with Hindi digits.
"""

from ml.data.synthetic_documents import generate
from ml.extraction.calculate import compute, is_grounded, to_extraction


def test_unit_conversions_are_exact():
    assert compute("electricity_bill", {"op": "single", "terms": [[0.174, "gwh"]]})[0] == 174000
    assert compute("production_log", {"op": "single", "terms": [[8350, "quintal"]]})[0] == 835
    fuel = {"fuel": "coal", "op": "sum", "terms": [[640, "mt"], [100, "kg"]]}
    assert str(compute("fuel_invoice", fuel)[0]) == "640.1"


def test_subtraction_and_bad_answers():
    diff = {"op": "diff", "terms": [[528063, "kwh"], [258540, "kwh"]]}
    assert compute("electricity_bill", diff)[0] == 269523
    assert compute("electricity_bill", {"op": "single", "terms": [[5, "kg"]]}) is None
    assert compute("electricity_bill", {"op": "diff", "terms": [[5, "kwh"]]}) is None
    assert compute("electricity_bill", {}) is None


def test_grounding_catches_a_miscopied_number():
    page = "Quantity: 17,759 MT"
    assert is_grounded({"terms": [[17759, "mt"]]}, page)
    assert not is_grounded({"terms": [[1779, "mt"]]}, page)
    low = to_extraction("fuel_invoice", {"fuel": "coal", "op": "single", "terms": [[1779, "mt"]]}, page)
    assert low.get("quantity").confidence < 0.85


def test_hindi_digits_are_grounded():
    page = "Units: ४२,१२२ kWh"
    assert is_grounded({"terms": [[42122, "kwh"]]}, page)


def test_raw_terms_reproduce_truth_on_every_layout():
    docs = []
    for group in ["base", "skills", "held_out", "held_out_new", "fresh"]:
        docs += generate(80, seed=11, noisy=True, group=group)
        docs += generate(40, seed=12, noisy=True, group=group, balanced=True)
    for doc in docs:
        result = to_extraction(doc.doc_type, doc.raw, doc.text)
        for name, expected in doc.truth.items():
            got = result.get(name)
            assert got is not None, (doc.layout, doc.truth)
            if isinstance(expected, float):
                assert abs(got.value - expected) < 1e-6 * max(1, abs(expected)), (doc.layout, doc.truth, got.value)
            else:
                assert got.value == expected
        assert result.get(next(iter(doc.truth))).confidence > 0.85, (doc.layout, doc.text)


def test_verbatim_round_trip_on_every_layout():
    import json
    from ml.extraction.raw_format import completion_for, parse
    docs = []
    for group in ["base", "skills", "held_out", "held_out_new", "fresh"]:
        docs += generate(80, seed=21, noisy=True, group=group)
        docs += generate(40, seed=22, noisy=True, group=group, balanced=True)
    for doc in docs:
        raw = parse(completion_for(doc))
        assert all(isinstance(term[0], str) for term in raw["terms"]), doc.layout
        result = to_extraction(doc.doc_type, raw, doc.text)
        for name, expected in doc.truth.items():
            got = result.get(name)
            if isinstance(expected, float):
                assert abs(got.value - expected) < 1e-6 * max(1, abs(expected)), (doc.layout, got.value, expected)
            else:
                assert got.value == expected
        assert result.get(next(iter(doc.truth))).confidence > 0.85, (doc.layout, doc.text)


def test_reading_order_does_not_matter():
    raw = {"op": "diff", "terms": [["100", "kwh"], ["900", "kwh"]]}
    out = to_extraction("electricity_bill", raw, "readings 100 and 900")
    assert out.get("energy_kwh").value == 800


def test_equal_readings_are_flagged():
    raw = {"op": "diff", "terms": [["500", "kwh"], ["500", "kwh"]]}
    out = to_extraction("electricity_bill", raw, "readings 500 and 500")
    assert out.get("energy_kwh").confidence < 0.85


def test_looping_answer_is_flagged():
    raw = {"op": "sum", "terms": [["47", "t"], ["26", "t"], ["47", "t"]]}
    page = "Wk1: 47 t; Wk2: 26 t"
    out = to_extraction("production_log", dict(raw, product="bolts"), page)
    assert out.get("tonnes").confidence < 0.85


def test_cut_off_answer_is_salvaged():
    from ml.extraction.raw_format import parse
    raw = parse('{"op": "sum", "terms": [["47", "t"], ["26", "t"], ["Add the')
    assert raw["terms"] == [["47", "t"], ["26", "t"]]


def test_glued_number_and_unit_is_split():
    from ml.extraction.raw_format import parse
    raw = parse('{"op": "single", "terms": [["804.94mwh"]]}')
    assert raw["terms"] == [["804.94", "mwh"]]
