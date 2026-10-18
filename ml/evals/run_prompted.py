"""run_prompted.py

Runs the prompted local model on the SAME synthetic documents as the
regex baseline, so the numbers are directly comparable.

    backend/.venv/bin/python -m ml.evals.run_prompted gemma3:4b zero_shot 60
Arguments: model, mode (zero_shot, few_shot, cot), documents per type,
and optionally the word hard to use the hard bench.
"""

import json
import sys
import time
from pathlib import Path

from ml.data.synthetic_documents import generate, hard_bench
from ml.evals.run_eval import evaluate
from ml.extraction.prompted_llm import make_extractor


def main() -> None:
    model = sys.argv[1] if len(sys.argv) > 1 else "gemma3:4b"
    mode = sys.argv[2] if len(sys.argv) > 2 else "zero_shot"
    per_type = int(sys.argv[3]) if len(sys.argv) > 3 else 60
    hard = len(sys.argv) > 4 and sys.argv[4] == "hard"
    docs = hard_bench(per_type) if hard else generate(count_per_type=per_type, seed=7)
    start = time.time()
    report = evaluate(make_extractor(model, mode), docs)
    seconds = time.time() - start
    report["model"], report["mode"], report["seconds"] = model, mode, round(seconds, 1)
    print(f"{model} / {mode} on {report['documents']} synthetic documents ({seconds:.0f}s, {seconds / len(docs):.2f}s each)")
    print(f"  document accuracy {report['document_accuracy']:.1%}   field accuracy {report['field_accuracy']:.1%}")
    for key, value in report["by_layout"].items():
        print(f"  {key:<42} {value:.0%}")
    name = f"report_{model.replace(':', '_')}_{mode}{'_hard' if hard else ''}.json"
    (Path(__file__).parent / name).write_text(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
