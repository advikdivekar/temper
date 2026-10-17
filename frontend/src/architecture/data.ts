// architecture/data.ts
// The facts behind the architecture page, written as plain data so
// the diagrams stay in sync with the real code. Every file path named
// here exists in the repository. Items marked "planned" are NOT built.

export type Status = "built" | "planned";

export interface ArchNode {
  id: string;
  layer: string;
  title: string;
  subtitle: string;
  status: Status;
  does: string[];
  files: string[];
  talksTo: string[];
  guarantees?: string[];
}

export const LAYERS = ["Clients", "API", "Domain services", "Calculation engine", "Data and stores", "ML plane"];

export const NODES: ArchNode[] = [
  { id: "web", layer: "Clients", title: "Web app", subtitle: "React, TypeScript, Vite", status: "built",
    does: ["Role based workspaces for suppliers, verifiers and importers", "Guided plant workspace, ledger explorer, evidence vault, supply chain graph", "Command palette, notifications, animated explainers"],
    files: ["frontend/src/pages", "frontend/src/features", "frontend/src/shell"], talksTo: ["api"],
    guarantees: ["Never calculates emissions. It only displays what the engine returned."] },
  { id: "verifier", layer: "Clients", title: "Public verifier", subtitle: "No login required", status: "built",
    does: ["Accepts a verification pack and checks it", "Lets anyone confirm a statement without trusting the website"],
    files: ["frontend/src/pages/VerifyPage.tsx", "backend/app/api/routes_verify.py"], talksTo: ["api"] },
  { id: "consumers", layer: "Clients", title: "API consumers", subtitle: "OpenAPI documented", status: "built",
    does: ["Any system can use the REST API with a bearer token", "Interactive docs are served at /docs"],
    files: ["backend/app/main.py"], talksTo: ["api"] },

  { id: "api", layer: "API", title: "FastAPI application", subtitle: "Routers, roles, CORS", status: "built",
    does: ["Eight routers: auth, plant, statements, trust, insights, requests, verify, demo", "Bearer token auth. Only a hash of each token is stored", "Role guards: supplier, verifier, importer, admin", "Pydantic schemas reject malformed input before any logic runs"],
    files: ["backend/app/main.py", "backend/app/api/deps.py", "backend/app/api/schemas.py"], talksTo: ["statements", "supply", "trust", "audit", "packs", "reference"],
    guarantees: ["App factory builds a fresh app from settings, so tests use an in memory database."] },

  { id: "statements", layer: "Domain services", title: "Statement builder", subtitle: "prepare, build, recompute", status: "built",
    does: ["Reads the ledger as it stands now", "Resolves each precursor: verified supplier data or EU default", "Runs the engine, stores the statement with its inputs hash", "Recomputes stale statements upstream first"],
    files: ["backend/app/services/statements.py", "backend/app/ledger.py"], talksTo: ["engine", "db", "supply", "audit"],
    guarantees: ["Every statement stores the exact record ids and factor rows it used, so it can be reproduced."] },
  { id: "supply", layer: "Domain services", title: "Supply chain graph", subtitle: "links, cycles, stale", status: "built",
    does: ["A statement links to another company's statement as a precursor", "Rejects circular links", "Marks everything built on an old version stale, through every tier", "Plans recomputation in dependency order"],
    files: ["backend/app/services/supply_chain.py"], talksTo: ["db"],
    guarantees: ["A cycle can never exist: the check runs before a link is stored."] },
  { id: "trust", layer: "Domain services", title: "Trust services", subtitle: "sign, verify, share", status: "built",
    does: ["Ed25519 signatures over the statement content hash", "Verifier opinions, signed separately", "Share grants that can be revoked", "Selective disclosure: recipients see results, not raw data"],
    files: ["backend/app/services/trust.py", "backend/app/services/signing.py"], talksTo: ["keys", "db", "audit"],
    guarantees: ["Changing any figure after signing breaks the signature."] },
  { id: "audit", layer: "Domain services", title: "Audit chain", subtitle: "hash chained log", status: "built",
    does: ["Every important action appends an entry", "Each entry stores the hash of the previous one", "verify_chain walks the whole log and finds the first break"],
    files: ["backend/app/services/audit.py", "backend/app/services/canonical.py"], talksTo: ["db"],
    guarantees: ["Editing or deleting any old entry invalidates every later hash."] },
  { id: "packs", layer: "Domain services", title: "Verification packs", subtitle: "independent checking", status: "built",
    does: ["Exports a self contained JSON pack for a statement", "Full packs let the content hash be recomputed. Attestation packs hide plant data", "A public endpoint checks hash, signatures and registered keys"],
    files: ["backend/app/services/packs.py"], talksTo: ["trust", "db"] },
  { id: "reference", layer: "Domain services", title: "Reference data", subtitle: "factors and defaults", status: "built",
    does: ["Loads emission factors and EU default values from versioned files", "Rows are only ever added; a new edition is a new version"],
    files: ["backend/app/services/reference_data.py", "data/"], talksTo: ["db"],
    guarantees: ["Current values are placeholders or unverified. The UI flags them."] },

  { id: "engine", layer: "Calculation engine", title: "certify_engine", subtitle: "pure Python, no I/O", status: "built",
    does: ["Quantity: numbers that carry units and refuse invalid mixes", "Methodology packs: electricity counted or not, mark ups, decimals", "Precursors: verified actual data or marked up default", "Allocation: largest remainder, parts always add to the total", "calculate_statement returns the result and a full trace"],
    files: ["engine/certify_engine/quantity.py", "engine/certify_engine/allocation.py", "engine/certify_engine/calculate_statement.py", "engine/certify_engine/methodology.py"], talksTo: [],
    guarantees: ["Same inputs always give the same output. No database, no network, no AI."] },

  { id: "db", layer: "Data and stores", title: "Relational database", subtitle: "SQLite dev, Postgres ready", status: "built",
    does: ["Append only activity ledger with two clocks (valid period, recorded at)", "Statements, precursor links, grants, opinions, audit entries, requests", "SQLAlchemy models, one file per topic"],
    files: ["backend/app/models", "backend/app/database.py"], talksTo: [],
    guarantees: ["Corrections add rows and never edit them. History is permanent."] },
  { id: "evidence", layer: "Data and stores", title: "Evidence store", subtitle: "content addressed files", status: "built",
    does: ["Files are saved under their SHA256 hash", "Identical files are stored once", "Verify re-hashes the stored bytes"],
    files: ["backend/app/evidence.py"], talksTo: [] },
  { id: "keys", layer: "Data and stores", title: "Key store", subtitle: "Ed25519 private keys", status: "built",
    does: ["Private keys live in files outside the database", "Only the public key is stored in the database"],
    files: ["backend/app/services/signing.py"], talksTo: [],
    guarantees: ["Stealing the database does not let anyone forge a signature."] },

  { id: "extractor", layer: "ML plane", title: "Document extractor", subtitle: "vision language model", status: "planned",
    does: ["Reads bills, invoices and logs into structured values with per field confidence", "A person confirms every value before it enters the ledger", "Fine tuned (LoRA) and quantized for local serving"],
    files: ["ml/ (not built yet)"], talksTo: ["statements"] },
  { id: "evalh", layer: "ML plane", title: "Eval harness", subtitle: "measured, not claimed", status: "planned",
    does: ["Synthetic bill generator and labelled corpus", "Accuracy by document type, correction rate, regressions"], files: ["ml/evals (not built yet)"], talksTo: ["extractor"] },
  { id: "rag", layer: "ML plane", title: "Regulation assistant", subtitle: "retrieval with citations", status: "planned",
    does: ["Answers questions from the regulation text with citations", "Proposes methodology updates for human review. Never edits live rules"], files: ["ml/ (not built yet)"], talksTo: ["reference"] },
  { id: "dpo", layer: "ML plane", title: "Preference tuning", subtitle: "from review corrections", status: "planned",
    does: ["Every correction in the review screen becomes a preference pair", "Trains the extractor with DPO"], files: ["ml/training (not built yet)"], talksTo: ["extractor"] },
];

export interface Table { id: string; x: number; y: number; fields: string[]; note: string }
export const TABLES: Table[] = [
  { id: "organization", x: 20, y: 20, fields: ["id", "name", "role", "public_key"], note: "A company. Role: supplier, importer, verifier, admin." },
  { id: "app_user", x: 20, y: 150, fields: ["id", "organization_id", "email", "password_hash"], note: "A person. Password stored as a salted scrypt hash." },
  { id: "installation", x: 260, y: 20, fields: ["id", "organization_id", "name", "country"], note: "A production site. The unit CBAM monitors." },
  { id: "evidence", x: 260, y: 150, fields: ["id", "organization_id", "sha256", "filename"], note: "A source file, identified by its hash." },
  { id: "activity_record", x: 500, y: 20, fields: ["id", "installation_id", "evidence_id", "supersedes_id", "valid_from / valid_to", "recorded_at"], note: "One confirmed quantity. Append only, two clocks." },
  { id: "statement", x: 500, y: 210, fields: ["id", "installation_id", "supersedes_id", "inputs_hash", "content_hash", "signature", "record_ids"], note: "An engine result with its trace, hash and signature." },
  { id: "precursor_ref", x: 740, y: 120, fields: ["statement_id", "upstream_statement_id", "upstream_hash", "default_value_id"], note: "A link to another company's statement, or to a default." },
  { id: "share_grant", x: 740, y: 260, fields: ["statement_id", "recipient_org_id", "revoked_at"], note: "Permission for one organization to read one statement." },
  { id: "verification_opinion", x: 740, y: 370, fields: ["statement_id", "verifier_org_id", "conclusion", "signature"], note: "A verifier's signed conclusion." },
  { id: "audit_entry", x: 260, y: 290, fields: ["id", "actor_user_id", "action", "prev_hash", "entry_hash"], note: "One link in the tamper evident chain." },
  { id: "emission_factor", x: 20, y: 290, fields: ["name", "value", "per_unit", "source", "version"], note: "Versioned reference number." },
  { id: "default_value", x: 20, y: 400, fields: ["cn_code", "country", "base_tco2_per_tonne", "version"], note: "EU default per product and country." },
  { id: "data_request", x: 500, y: 430, fields: ["from_org_id", "to_org_id", "statement_id", "status"], note: "One company asking another for data." },
];
export const RELATIONS: [string, string, string][] = [
  ["app_user", "organization", "belongs to"], ["installation", "organization", "owned by"], ["evidence", "organization", "owned by"],
  ["activity_record", "installation", "at"], ["activity_record", "evidence", "backed by"], ["statement", "installation", "for"],
  ["precursor_ref", "statement", "part of"], ["precursor_ref", "default_value", "may use"], ["share_grant", "statement", "grants"],
  ["verification_opinion", "statement", "about"], ["audit_entry", "app_user", "by"], ["data_request", "statement", "about"],
];

export interface FlowStep { from: string; to: string; label: string; detail: string }
export interface Flow { id: string; title: string; summary: string; steps: FlowStep[] }
export const ACTORS = ["Client", "API", "Services", "Engine", "Database", "Audit"];
export const FLOWS: Flow[] = [
  { id: "build", title: "Build a statement", summary: "From confirmed records to a reproducible result with a full trace.",
    steps: [
      { from: "Client", to: "API", label: "POST /statements", detail: "Installation, period, and where each precursor comes from." },
      { from: "API", to: "API", label: "Authenticate, check role", detail: "The bearer token is hashed and looked up. Only suppliers may build." },
      { from: "API", to: "Services", label: "build_statement()", detail: "The route hands over to the statement builder." },
      { from: "Services", to: "Database", label: "Read the ledger as of now", detail: "Superseded records are dropped. Only current rows remain." },
      { from: "Services", to: "Database", label: "Resolve precursors", detail: "A supplier statement counts as actual only if signed AND verified. Otherwise the EU default is used." },
      { from: "Services", to: "Engine", label: "calculate_statement()", detail: "Pure function: direct emissions, precursors, allocation, rounding." },
      { from: "Engine", to: "Services", label: "result + trace", detail: "Specific embedded emissions per product and a line by line trace." },
      { from: "Services", to: "Database", label: "Store statement + links", detail: "With the inputs hash, record ids, content hash and a version link." },
      { from: "Services", to: "Audit", label: "append entry", detail: "The action is added to the hash chain." },
      { from: "API", to: "Client", label: "200 statement", detail: "Result, breakdown, trace. Nothing here came from a language model." },
    ] },
  { id: "trust", title: "Sign, verify, share", summary: "How a number becomes something an importer can rely on.",
    steps: [
      { from: "Client", to: "API", label: "POST /statements/{id}/sign", detail: "The supplier signs its own statement." },
      { from: "API", to: "Services", label: "sign_statement()", detail: "Only the owner may sign, and only a draft." },
      { from: "Services", to: "Services", label: "Ed25519 sign(content_hash)", detail: "The private key comes from the key store, never the database." },
      { from: "Services", to: "Database", label: "status = signed", detail: "The signature and time are saved." },
      { from: "Services", to: "Audit", label: "append entry", detail: "statement_signed is logged." },
      { from: "Client", to: "API", label: "POST /statements/{id}/opinion", detail: "A verifier reads the evidence trail and signs an opinion." },
      { from: "Services", to: "Database", label: "store opinion", detail: "Signed over the content hash, conclusion and comments." },
      { from: "Client", to: "API", label: "POST /statements/{id}/share", detail: "A named, revocable grant to an importer." },
      { from: "API", to: "Client", label: "importer reads result", detail: "Recipients see result and status. Raw records stay private." },
    ] },
  { id: "revise", title: "Upstream revision", summary: "A mill corrects a number. Everything downstream is flagged and rebuilt.",
    steps: [
      { from: "Client", to: "API", label: "POST /records/{id}/correct", detail: "The mill corrects a fuel figure." },
      { from: "Services", to: "Database", label: "append superseding row", detail: "The old row stays. History is never edited." },
      { from: "Client", to: "API", label: "POST /statements", detail: "The mill builds a new version for the same period." },
      { from: "Services", to: "Services", label: "mark_dependents_stale()", detail: "Walks the dependency graph through every tier and marks dependents stale." },
      { from: "Services", to: "Audit", label: "append entry", detail: "The revision is logged." },
      { from: "Client", to: "API", label: "POST /statements/recompute", detail: "A downstream supplier rebuilds its stale statements." },
      { from: "Services", to: "Services", label: "topological order", detail: "Upstream statements are rebuilt before the ones that rely on them." },
      { from: "Services", to: "Engine", label: "recalculate", detail: "Links are upgraded to the newest upstream version." },
      { from: "API", to: "Client", label: "new versions", detail: "The old versions remain, so the change is visible and explainable." },
    ] },
];

export const THREATS: { threat: string; control: string; where: string; status: "done" | "partial" | "todo" }[] = [
  { threat: "A bill or invoice is swapped after upload", control: "Files stored under their SHA256 hash. Verify re-hashes the stored bytes.", where: "backend/app/evidence.py", status: "done" },
  { threat: "A figure is edited after signing", control: "Ed25519 signature over the canonical content hash.", where: "services/trust.py, signing.py", status: "done" },
  { threat: "History is rewritten", control: "Hash chained audit log and an append only ledger.", where: "services/audit.py, ledger.py", status: "done" },
  { threat: "The database is stolen", control: "Scrypt password hashes, hashed tokens, private keys held outside the database.", where: "security.py, signing.py", status: "done" },
  { threat: "An importer sees a supplier's raw volumes", control: "Selective disclosure and attestation packs without plant data.", where: "routes_statements.py, packs.py", status: "done" },
  { threat: "Unverified supplier data is treated as real", control: "Only signed AND verified upstream statements count as actual. Otherwise the marked up default.", where: "services/statements.py", status: "done" },
  { threat: "Stale upstream numbers keep flowing downstream", control: "Version pinning, stale marking, recompute in dependency order.", where: "services/supply_chain.py", status: "done" },
  { threat: "Circular supply links", control: "Cycle check before any link is stored.", where: "services/supply_chain.py", status: "done" },
  { threat: "Rules change and old reports cannot be reproduced", control: "Versioned methodology, pinned factor rows, stored record ids.", where: "engine/methodology.py", status: "done" },
  { threat: "Key rotation and hardware key custody", control: "Keys are files today. A managed key service and rotation are not built.", where: "not built", status: "todo" },
  { threat: "Brute force and abuse", control: "No rate limiting yet.", where: "not built", status: "todo" },
  { threat: "Personal data duties (DPDP Act)", control: "Roles and access control exist. Consent, retention and erasure flows are not built.", where: "partial", status: "partial" },
];

export const ROADMAP = {
  built: ["Deterministic engine with units, allocation, methodology packs", "Append only bitemporal ledger and evidence vault", "Statements, supply chain links, stale propagation, recompute", "Signing, verifier opinions, share grants, selective disclosure", "Hash chained audit log with integrity check", "Verification packs and a public verifier", "Role based workspaces, requests, network view, command palette", "Seeded multi quarter demo workspace"],
  planned: ["Official default values and factors from Commission annexes", "Golden tests from the Commission's worked examples", "Document extraction agent, then LoRA fine tune and quantization", "Eval harness with measured accuracy", "RAG regulation assistant with citations", "DPO from review corrections", "Postgres migrations, key management, rate limiting", "Docker deployment verified end to end"],
};
