"""run_finetuned.py

Scores a LoRA adapter on the clean bench and the hard bench.

    ml/.venv/bin/python -m ml.evals.run_finetuned ml/adapters/test_run

Run from the repository root with the ml virtual environment.
The report also warns if the score looks too good to trust.
"""

import json
import sys
import time
from pathlib import Path

from ml.data.synthetic_documents import generate, hard_bench
from ml.evals.run_eval import evaluate
from ml.extraction.finetuned_mlx import make_extractor

TOO_GOOD = 0.97


def main() -> None:
    adapter = sys.argv[1]
    extract = make_extractor(adapter)
    results = {}
    for name, docs in [("clean", generate(60, seed=7)), ("hard", hard_bench(60))]:
        start = time.time()
        report = evaluate(extract, docs)
        report["seconds"] = round(time.time() - start, 1)
        results[name] = report
        print(f"{adapter} on {name} bench ({report['documents']} docs, {report['seconds']}s)")
        print(f"  document accuracy {report['document_accuracy']:.1%}   field accuracy {report['field_accuracy']:.1%}")
        for key, value in report["by_layout"].items():
            print(f"  {key:<42} {value:.0%}")
    if results["hard"]["document_accuracy"] > TOO_GOOD:
        print("WARNING: hard bench score above 97 percent. Suspect an easy or leaky bench.")
    out = Path(__file__).parent / f"report_{Path(adapter).name}.json"
    out.write_text(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
