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


def test_page_words_beat_a_wrong_fuel_label():
    raw = {"fuel": "coal", "op": "sum", "terms": [["83", "kl"], ["88", "kl"]]}
    page = "DIESEL RECEIPT BOOK\nDe1ivery 1: 83 KL\nDelivery 2: 88 KL"
    out = to_extraction("fuel_invoice", raw, page)
    assert out.get("fuel").value == "diesel"
    assert out.get("quantity").value == 171
    assert out.get("fuel").confidence > 0.85


def test_fuel_that_fits_nothing_is_flagged():
    raw = {"fuel": "coal", "op": "single", "terms": [["50", "kl"]]}
    out = to_extraction("fuel_invoice", raw, "Delivery note 50 KL of coal")
    assert out.get("fuel") is None   # nothing returned means a person reads it


def test_product_comes_from_the_page():
    raw = {"product": "bolt", "op": "single", "terms": [["20", "t"]]}
    out = to_extraction("production_log", raw, "Output of nuts: 20 t")
    assert out.get("product").value == "nuts"


def test_composed_documents_round_trip():
    import json
    from ml.data.compose_documents import compose
    from ml.extraction.raw_format import completion_for, parse
    for split in ("train", "test"):
        for doc in compose(120, seed=21, split=split):
            raw = parse(completion_for(doc))
            result = to_extraction(doc.doc_type, raw, doc.text)
            for name, expected in doc.truth.items():
                got = result.get(name)
                assert got is not None, (doc.text, doc.truth)
                if isinstance(expected, float):
                    assert abs(got.value - expected) < 1e-6 * max(1, expected), (doc.text, doc.truth, got.value)
                else:
                    assert got.value == expected, (doc.text, doc.truth)
            assert got.confidence > 0.85, (doc.text, raw)


def test_dropped_last_item_is_flagged():
    raw = {"product": "bolts", "op": "sum",
           "terms": [["47", "t"], ["26", "t"], ["30", "t"]]}
    page = "Wk1: 47 t; Wk2: 26 t; Wk3: 30 t; Wk4: 25 t;"
    out = to_extraction("production_log", raw, page)
    assert out.get("tonnes").confidence < 0.85


def test_conversion_note_is_not_an_unused_amount():
    raw = {"fuel": "coal", "op": "single", "terms": [["20", "quintal"]]}
    page = "Coal 20 quintal\n(1 quintal = 100 kg)"
    out = to_extraction("fuel_invoice", raw, page)
    assert out.get("quantity").confidence > 0.85


def test_padded_number_is_accepted():
    from ml.extraction.raw_format import parse
    raw = parse('{"op": "single", "terms": [["104,061     ", "kwh"]]}')
    assert raw["terms"] == [["104,061", "kwh"]]
