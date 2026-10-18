"""make_raw_training_set.py

WHAT THIS FILE DOES
    Writes the training set for the COPY format: each example is a page
    and the numbers a reader should copy from it (no arithmetic). Files
    go to ml/data/raw/train.jsonl and valid.jsonl.

CONCEPTS IN THIS FILE
    Natural and balanced numbers
        Half the numbers follow realistic ranges, half are spread over
        short and long values. Only balanced numbers pulled training
        away from the lengths real pages have.
    Hand written plus composed
        The hand written known and skills layouts, plus pages composed
        from interchangeable pieces (compose_documents.py) using TRAIN
        words only. The held out layouts and the TEST words are never
        included.
"""

import json
import random
from pathlib import Path

from ml.data.compose_documents import compose
from ml.data.synthetic_documents import generate
from ml.extraction.raw_format import build_prompt, completion_for

OUT = Path(__file__).parent / "raw"


def _write(path: Path, docs) -> None:
    with path.open("w") as out:
        for doc in docs:
            row = {"prompt": build_prompt(doc.doc_type, doc.text), "completion": completion_for(doc)}
            out.write(json.dumps(row) + "\n")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    train = (generate(700, seed=3001, noisy=True)
             + generate(500, seed=3002, noisy=True, balanced=True)
             + generate(700, seed=3003, noisy=True, group="skills")
             + generate(500, seed=3004, noisy=True, group="skills", balanced=True)
             + compose(3500, seed=3005)
             + compose(2000, seed=3006, balanced=True))
    random.Random(5).shuffle(train)
    valid = (generate(60, seed=4002, noisy=True)
             + generate(40, seed=4004, noisy=True, group="skills")
             + compose(40, seed=4006))
    _write(OUT / "train.jsonl", train)
    _write(OUT / "valid.jsonl", valid)
    print(f"train {len(train)} documents, validation {len(valid)} documents")


if __name__ == "__main__":
    main()
