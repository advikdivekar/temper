# Lesson 3: Supply chain and trust

## Where to read the code
- backend/app/services/supply_chain.py  links, cycles, stale, order
- backend/app/services/trust.py         signing, opinions, sharing
- backend/app/services/signing.py       Ed25519 keys and signatures
- backend/app/services/audit.py         the hash chained log
- backend/tests/test_supply_chain.py    the mill and bolt maker story

## Ideas
1. A statement points at another company's statement (PrecursorRef).
2. A supplier number counts as real data only if it is signed AND a
   verifier has said satisfactory. Otherwise the EU default is used.
3. Statements are never edited. A recalculation is a new version.
4. A new mill version marks everything built on the old one stale,
   through every tier. Recompute then runs upstream first.
5. A signature covers the content hash. Change any figure and the
   signature fails. The audit log is a hash chain, so editing an old
   entry breaks all later ones.
6. Importers see results and status, never the raw trace.

## Try it
Run the tests and read test_chain_stale_and_recompute from top to
bottom. The numbers in the comments show the arithmetic.
