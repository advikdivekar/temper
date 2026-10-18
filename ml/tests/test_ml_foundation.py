"""test_ml_foundation.py

Checks the pieces the ML track stands on: the number formatter, that the
generator is reproducible and its answers are self consistent, and that
the eval harness scores correctly (including a perfect and a useless
extractor, which pin down the scoring itself).
"""

from ml.data.synthetic_documents import generate, indian_grouping
from ml.evals.run_eval import evaluate
from ml.extraction.schema import ExtractedField, Extraction


def test_indian_grouping():
    assert indian_grouping(125000) == "1,25,000"
    assert indian_grouping(999) == "999"
    assert indian_grouping(12345678) == "1,23,45,678"


def test_generator_is_reproducible():
    first = generate(10, seed=3)
    second = generate(10, seed=3)
    assert [d.text for d in first] == [d.text for d in second]
    assert len({d.layout for d in generate(60, seed=1)}) >= 6


def test_perfect_extractor_scores_100_percent():
    docs = generate(20, seed=5)
    truth = {d.text: d for d in docs}

    def oracle(doc_type, text):
        t = truth[text].truth
        return Extraction(doc_type, [ExtractedField(k, v, 1.0) for k, v in t.items()])

    report = evaluate(oracle, docs)
    assert report["document_accuracy"] == 1.0 and report["review_rate"] == 0.0


def test_empty_extractor_scores_zero_and_asks_for_review():
    report = evaluate(lambda doc_type, text: Extraction(doc_type), generate(10, seed=5))
    assert report["document_accuracy"] == 0.0 and report["review_rate"] == 1.0


def test_held_out_layouts_are_separate_from_known_ones():
    known = {d.layout for d in generate(60, seed=1)}
    groups = ["skills", "held_out", "held_out_new"]
    sets = [{d.layout for d in generate(60, seed=1, group=g)} for g in groups]
    seen = known | sets[0]
    assert len(sets[1]) == 3 and len(sets[2]) == 3
    assert seen.isdisjoint(sets[1]) and seen.isdisjoint(sets[2])
    assert sets[1].isdisjoint(sets[2])


def test_noise_keeps_truth_checkable_and_is_reproducible():
    first = generate(20, seed=4, noisy=True)
    second = generate(20, seed=4, noisy=True)
    assert [d.text for d in first] == [d.text for d in second]
    clean = generate(20, seed=4)
    assert [d.truth for d in first] == [d.truth for d in clean]
    assert any(a.text != b.text for a, b in zip(first, clean))


def test_skill_answers_are_exact():
    for doc in generate(50, seed=8, group="skills") + generate(50, seed=8, group="held_out_new"):
        if doc.layout == "coal_quintal":
            assert "quintal" in doc.text and doc.truth["unit"] == "tonne"
        if doc.layout == "coal_mt_kg_split":
            assert round(doc.truth["quantity"] * 1000) % 50 == 0
