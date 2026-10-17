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

## Run it

Backend (API docs at http://localhost:8000/docs):

    cd backend
    PYTHONPATH=. .venv/bin/uvicorn app.main:create_app --factory --reload

Frontend (http://localhost:3000):

    cd frontend && npm install && npm run dev

Everything with Docker (untested so far): `docker compose up --build`

Tests:

    cd engine && .venv/bin/pytest -q
    cd backend && PYTHONPATH=. .venv/bin/pytest -q

## Reference data warning

`data/default_values.json` and `data/emission_factors.json` hold
placeholder or unverified numbers. Replace them from the official
Commission publications before trusting any output.
