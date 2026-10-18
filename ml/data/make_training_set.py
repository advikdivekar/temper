"""make_training_set.py

WHAT THIS FILE DOES
    Writes the TRAINING set to ml/data/train.jsonl: thousands of noisy
    documents on the known layouts only, each as a prompt and the exact
    answer the model should give. Also writes a small validation file.

CONCEPTS IN THIS FILE
    Training example
        One pair: what the model sees (the prompt) and what it should
        write back (the completion). Fine tuning repeats this many times.
    Train, validation and test
        Train teaches the model. Validation is a small separate set used
        during training to notice if it is memorizing. Test is the hard
        bench and is NEVER used for either. The seeds differ so no
        document appears in two sets.
    JSONL
        One JSON object per line. The usual file format for training.
    Held out layouts
        Not included here on purpose. The hard bench uses them to check
        whether the model learned the skill or only the formats.
"""

import json
from pathlib import Path

from ml.data.synthetic_documents import generate
from ml.extraction.prompted_llm import build_prompt
from ml.extraction.schema import REQUIRED_FIELDS

HERE = Path(__file__).parent


def _plain(value):
    """Write 855349.0 as 855349 so the model learns clean numbers."""
    return int(value) if isinstance(value, float) and value == int(value) else value


def _write(path: Path, docs) -> None:
    with path.open("w") as out:
        for doc in docs:
            answer = {name: _plain(doc.truth[name]) for name in REQUIRED_FIELDS[doc.doc_type]}
            row = {"prompt": build_prompt(doc.doc_type, doc.text, "zero_shot"),
                   "completion": json.dumps(answer)}
            out.write(json.dumps(row) + "\n")


def main() -> None:
    train = generate(count_per_type=1500, seed=1001, noisy=True)
    valid = generate(count_per_type=100, seed=2002, noisy=True)
    _write(HERE / "train.jsonl", train)
    _write(HERE / "valid.jsonl", valid)
    print(f"train {len(train)} documents, validation {len(valid)} documents")


if __name__ == "__main__":
    main()
