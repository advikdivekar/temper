# Phases

Each phase has a goal and an exit check. Files marked LEARN are the ones
we walk through together. The rest are built without a deep dive.

## Phase 1: Calculation engine (engine/)
Goal: compute emissions per tonne exactly and repeatably.
- LEARN quantity.py, allocation.py, calculate_statement.py
- emission_factors.py, direct_emissions.py, indirect_emissions.py,
  precursors.py
Exit: golden tests and property tests pass.

## Phase 2: Backend, ledger, evidence (backend/)
Goal: store confirmed data, never overwrite it, keep file hashes.
- LEARN ledger (append only, bitemporal), evidence hashing
- API, database models, login and roles
Exit: a statement can be built from stored records with a full trace.

## Phase 3: AI extraction (ml/)
Goal: read bills and invoices into structured values.
- LEARN eval harness, prompting, chain of thought, structured output
- LEARN distillation, SFT with LoRA, quantization, local serving
- synthetic bill generator
Exit: measured accuracy of base vs fine tuned vs quantized models.

## Phase 4: Supply chain and trust (backend/)
Goal: link mill to fabricator, propagate changes, sign statements.
- LEARN dependency graph and stale marking, signatures, audit chain
- share grants, verifier and importer views
Exit: mill revision flags and recomputes the fabricator statement.

## Phase 5: Smarter AI and hardening
- LEARN RAG regulation assistant, DPO from review corrections
- data quality checks, security pass, demo, final report
Exit: ablation report with measured results only.

## Status
Phases 1, 2 and 4 are built. Phase 3 (ML) has started: synthetic documents,
schema, regex baseline and eval harness are in ml/ (baseline 63.3 percent on
synthetic documents). A 1B model fine tuned with LoRA reads them at 96.1 percent
on a final untouched test of new wording and 73.9 percent on new structures
(synthetic only). See docs/lessons/lesson_04, 05 and 06.
