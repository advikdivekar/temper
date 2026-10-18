# CertifyAI

A platform that turns a factory's everyday records (bills, invoices, logs)
into signed, auditable carbon emissions statements for EU CBAM reporting.

## Where to find things

| Folder | What lives there | Concepts you learn there |
|---|---|---|
| `engine/` | The calculation core. Pure Python, no database, no AI. | Decimal math, units, versioned rules, golden tests |
| `backend/` | The web API, database, signing, audit log. | FastAPI, Postgres, ledgers, hashing, signatures |
| `frontend/` | The screens people use. | Review screen, statement view, supply chain view |
| `ml/` | Everything AI. | Evals, prompting, SFT, quantization, DPO, RAG |
| `data/` | Emission factors and default values with their sources. | Versioned reference data |
| `fixtures/` | Test examples and synthetic documents. | Golden tests, synthetic data |
| `docs/` | Plan, lessons, decision records. | Why we built things this way |

## The one rule

AI reads, suggests and explains. The deterministic engine calculates and a
human confirms. No emissions number ever comes from a language model.

## Build order

1. Engine (calculation core)
2. Backend and database (ledger, evidence)
3. ML: evals, baseline extraction, then fine tuning
4. Supply chain links, signing, verifier and importer views
5. RAG assistant, preference tuning, hardening

## Code style we follow

- Simple folder and file names in snake_case, one concept per file.
- Every file begins with a header comment saying what it does.
- Short functions, short lines (about 80 characters), plain comments.
- No hyphens in file names or in comments.

## What is in the product

The signed in product is calm and editorial: warm paper pages, dark ink, thin
rules, one big thing and one action per page. Four pages in the bar, the rest
in the avatar menu.

| Page | What it is |
|---|---|
| Home | One big number for your role, one sentence, and what needs you |
| Statements | Each plant and product with four quarter cells; a dot and a word show the state |
| A statement | The number, a few buttons (sign, share, review, estimate a saving, download pack), and three sections |
| Build | Three steps: plant and period, documents and data, steel and run. In step two the AI reader can suggest the numbers from a text document; you check and confirm |
| Chain | The supply chain around you as a simple graph |
| Records (menu) | Ledger with "as it stood" time travel, evidence with re-verify, audit log with chain check |
| Requests, Library, Organization (menu) | Data requests, EU default values by CN code, your signing key |
| Public | Landing page, one scroll linked architecture flow, a pack verifier anyone can use |

The demo workspace is seeded the first time you enter as a persona: four
quarters across four organizations, signed and verified statements, a mid
flight upstream revision (one statement is stale), and open requests. All of
it is synthetic.

## Where the numbers come from

See `docs/sources.md`. Default values come from the Commission's Excel for
IR (EU) 2026/1740 (India and other countries, iron, steel and aluminium). The
engine reproduces the Commission's own worked examples (Guidance No. 5d
Example 3, Guidance No. 3 section 4.3.3) as golden tests. Natural gas is
confirmed; the other fuel factors are flagged unverified in the UI.

## Run it

Backend (API docs at http://localhost:8000/docs):

    cd backend
    PYTHONPATH=. .venv/bin/uvicorn app.main:create_app --factory --reload

Frontend (http://localhost:3000):

    cd frontend && npm install && npm run dev

The AI reader (optional, Apple silicon, needs the ml virtual environment and
the model folder `ml/models/run8_q4`, which is not in git):

    ml/.venv/bin/python -m ml.serving.extract_service ml/models/run8_q4

Without it the Build page still works, you type the numbers. The reader only
suggests: nothing reaches the ledger until a person confirms it.

Everything with Docker (untested so far): `docker compose up --build`

To reset the demo, stop the backend, delete `backend/temper.db` and
`backend/storage/`, and start it again.

Tests:

    cd engine && .venv/bin/pytest -q
    cd backend && PYTHONPATH=. .venv/bin/pytest -q

## Honest limits

The reader reads plain text documents only (scans and PDFs need OCR, not built),
was measured on synthetic documents only, and cannot yet use diesel in kilolitres.
Coal, diesel and grid factors are unverified (IPCC fuel values are confirmed;
Annex II section G still needs the PDF), and savings ignore the free allocation adjustment. The raw
regulation files are kept out of git (see .gitignore).
