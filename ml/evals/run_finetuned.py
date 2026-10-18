"""run_finetuned.py

Scores a LoRA adapter on the clean bench and the hard bench.

    ml/.venv/bin/python -m ml.evals.run_finetuned ml/adapters/test_run
    ml/.venv/bin/python -m ml.evals.run_finetuned ml/adapters/run3 raw   (copy format)

Run from the repository root with the ml virtual environment.
The report also warns if the score looks too good to trust.
"""

import json
import sys
import time
from pathlib import Path

from ml.data.compose_documents import compose
from ml.data.synthetic_documents import fresh_bench, generate, hard_bench
from ml.evals.run_eval import evaluate
from ml.extraction import finetuned_mlx, finetuned_raw

TOO_GOOD = 0.97


def main() -> None:
    adapter = sys.argv[1]
    use_raw = len(sys.argv) > 2 and sys.argv[2] == "raw"
    extract = (finetuned_raw if use_raw else finetuned_mlx).make_extractor(adapter)
    results = {}
    # fresh: layouts we looked at after run 6, so now a dev set.
    # mixed: composed pages with TEST words, partly read after run 7.
    # final: the same recipe, new seed, never read. The number to quote.
    benches = [("clean", generate(60, seed=7)), ("hard", hard_bench(60)),
               ("fresh", fresh_bench(60)),
               ("mixed", compose(60, seed=31337, split="test")),
               ("final", compose(60, seed=9090, split="test"))]
    if "final" in sys.argv:   # only the untouched test, once per model
        benches = benches[-1:]
    for name, docs in benches:
        start = time.time()
        report = evaluate(extract, docs)
        report["seconds"] = round(time.time() - start, 1)
        results[name] = report
        print(f"{adapter} on {name} bench ({report['documents']} docs, {report['seconds']}s)")
        print(f"  document accuracy {report['document_accuracy']:.1%}   field accuracy {report['field_accuracy']:.1%}"
              f"   silent errors {report['silent_error_rate']:.1%}   caught {report['caught_error_rate']:.1%}")
        for key, value in report["by_layout"].items():
            print(f"  {key:<42} {value:.0%}")
    hard = results.get("hard", results["final"])
    if hard["document_accuracy"] > TOO_GOOD:
        print("WARNING: hard bench score above 97 percent. Suspect an easy or leaky bench.")
    out = Path(__file__).parent / f"report_{Path(adapter).name}{'_final' if 'hard' not in results else ''}.json"
    out.write_text(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
