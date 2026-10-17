# ml/ : the AI that reads documents

AI reads, suggests and explains. It never calculates emissions, and a
person confirms every value before it counts.

    data/        synthetic bills, invoices and logs, with the right answers
    extraction/  the schema, and the extractors (baseline first, models later)
    evals/       the harness that measures how well an extractor reads
    tests/       checks that the generator and harness behave

Run from the repository root:

    backend/.venv/bin/python -m ml.evals.run_eval
    backend/.venv/bin/python -m pytest ml/tests -q

Lesson: docs/lessons/lesson_04_evals_and_baseline.md
