// architecture/flow.ts
// The single architecture, told as one journey from a person's action
// down to what an importer receives. Each step names the real files
// that implement it. Branches are the stores a step touches, or the
// planned ML parts. Nothing here is invented: "planned" means not
// built yet.

export interface Branch { label: string; planned?: boolean }

export interface FlowStep {
  id: string;
  title: string;
  text: string;
  files: string;
  branch?: Branch;
  highlight?: boolean;
}

export const FLOW: FlowStep[] = [
  { id: "client", title: "A person acts", files: "frontend/src",
    text: "A supplier uploads evidence and confirms records. A verifier or importer opens a statement." },
  { id: "api", title: "The API checks who and what", files: "backend/app/api",
    text: "FastAPI verifies the token and the role, and validates every request before any logic runs." },
  { id: "ledger", title: "Evidence and ledger", files: "backend/app/evidence.py, ledger.py",
    text: "Files are stored under their SHA256 hash. Records are appended and never edited.",
    branch: { label: "Evidence store" } },
  { id: "extract", title: "Document extraction", files: "ml/ (not built yet)",
    text: "A model will read bills into values. A person confirms each one before it reaches the ledger.",
    branch: { label: "ML plane, planned", planned: true } },
  { id: "builder", title: "The statement builder", files: "backend/app/services/statements.py",
    text: "Reads the ledger, then uses a supplier's verified statement or the EU default for each input.",
    branch: { label: "Relational database" } },
  { id: "engine", title: "The calculation engine", files: "engine/certify_engine", highlight: true,
    text: "Pure maths. No database, no network, no AI. The same inputs always give the same result." },
  { id: "chain", title: "The supply chain", files: "backend/app/services/supply_chain.py",
    text: "A statement can depend on another company's. A revision marks dependents stale and rebuilds them in order." },
  { id: "trust", title: "Signatures and the audit log", files: "services/trust.py, signing.py, audit.py",
    text: "Suppliers and verifiers sign with Ed25519 keys. Every action joins a hash chained log.",
    branch: { label: "Key store, kept apart" } },
  { id: "delivery", title: "What the importer receives", files: "services/packs.py",
    text: "Results and status, never raw volumes. A pack lets anyone verify it with no account." },
];
