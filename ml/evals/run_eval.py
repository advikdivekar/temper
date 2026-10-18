"""run_eval.py

WHAT THIS FILE DOES
    The eval harness. It runs an extractor over a set of synthetic
    documents, compares every field with the known answer, and prints
    accuracy overall, by document type and by layout. It also writes a
    JSON report so results can be compared across models and over time.

CONCEPTS IN THIS FILE
    Evaluation harness
        The fixed, repeatable test bench every model runs on. Same
        documents, same scoring, so numbers are comparable. Changing the
        bench changes the meaning of every past result, so we version it.
    Field accuracy
        A field is right if its value matches the truth. Numbers match
        within a tiny relative tolerance, text matches exactly.
    Document accuracy
        A document counts only if EVERY required field is right. This
        is the strict, honest number: one wrong field means a person
        must fix the document.
    Review rate
        The share of fields below a confidence threshold. These go to a
        human. A good extractor is accurate AND knows when it is unsure.
    Slicing
        Reporting by layout shows where a reader fails. An average can
        hide a layout that scores zero.
"""

import json
from collections import defaultdict
from pathlib import Path

from ml.data.synthetic_documents import SyntheticDocument, generate, hard_bench
from ml.extraction import baseline_regex
from ml.extraction.schema import REQUIRED_FIELDS

REVIEW_THRESHOLD = 0.85


def _same(truth, got) -> bool:
    if isinstance(truth, float):
        try:
            return abs(float(got) - truth) <= 1e-6 * max(abs(truth), 1.0)
        except (TypeError, ValueError):
            return False
    return str(got).lower() == str(truth).lower()


def evaluate(extract, docs: list[SyntheticDocument]) -> dict:
    by_type = defaultdict(lambda: [0, 0, 0])      # docs right, docs, fields right
    by_layout = defaultdict(lambda: [0, 0])       # docs right, docs
    fields_total = fields_right = review = 0
    for doc in docs:
        extraction = extract(doc.doc_type, doc.text)
        doc_right = True
        for name in REQUIRED_FIELDS[doc.doc_type]:
            fields_total += 1
            item = extraction.get(name)
            ok = item is not None and _same(doc.truth[name], item.value)
            fields_right += ok
            doc_right &= ok
            if item is None or item.confidence < REVIEW_THRESHOLD:
                review += 1
        by_type[doc.doc_type][0] += doc_right
        by_type[doc.doc_type][1] += 1
        by_layout[f"{doc.doc_type}/{doc.layout}"][0] += doc_right
        by_layout[f"{doc.doc_type}/{doc.layout}"][1] += 1
    docs_right = sum(v[0] for v in by_type.values())
    return {
        "documents": len(docs),
        "document_accuracy": docs_right / len(docs),
        "field_accuracy": fields_right / fields_total,
        "review_rate": review / fields_total,
        "by_type": {k: v[0] / v[1] for k, v in by_type.items()},
        "by_layout": {k: v[0] / v[1] for k, v in sorted(by_layout.items())},
        "note": "SYNTHETIC documents only. Not a claim about real Indian documents.",
    }


def main() -> None:
    docs = generate(count_per_type=60, seed=7)
    report = evaluate(baseline_regex.extract, docs)
    print(f"Baseline regex extractor on {report['documents']} synthetic documents")
    print(f"  document accuracy {report['document_accuracy']:.1%}   field accuracy {report['field_accuracy']:.1%}   review rate {report['review_rate']:.1%}")
    for key, value in report["by_layout"].items():
        print(f"  {key:<42} {value:.0%}")
    hard = evaluate(baseline_regex.extract, hard_bench(60))
    print(f"Hard bench: document accuracy {hard['document_accuracy']:.1%}")
    for key, value in hard["by_layout"].items():
        print(f"  {key:<42} {value:.0%}")
    out = Path(__file__).parent / "report_baseline.json"
    out.write_text(json.dumps({"clean": report, "hard": hard}, indent=2))
    print(f"Report written to {out}")


if __name__ == "__main__":
    main()
