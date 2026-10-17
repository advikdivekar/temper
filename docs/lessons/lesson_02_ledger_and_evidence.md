# Lesson 2: Ledger and evidence

## Evidence hashing (backend/app/evidence.py)
A SHA256 hash is a fingerprint of a file. We save each uploaded bill
under its fingerprint. If the stored bytes ever stop matching the name,
we know the file was changed. Uploading the same bill twice stores it once.

## Append only ledger (backend/app/ledger.py)
We never edit or delete a confirmed value. To fix a mistake we add a new
row that points at the old one (supersedes_id). History stays intact.

## Two clocks (backend/app/models.py)
- valid_from / valid_to: the period the fact is about (March).
- recorded_at: when we stored it.
So we can answer "what did we believe on 1 May about March?".

## Try it
`cd backend && PYTHONPATH=. .venv/bin/pytest -q`
Read tests/test_ledger.py: the last test shows a correction and the
"as of" view before and after it.

## Next
A FastAPI layer to upload evidence and enter records, then the AI
extraction track (ml/).
