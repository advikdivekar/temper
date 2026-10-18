// api/types.ts
// The shapes of data the backend sends us. Keeping them in one file
// means a backend change is fixed in one place.

export type Role = "supplier" | "importer" | "verifier" | "admin";

export interface Me {
  email: string;
  organization_id: number;
  organization_name: string;
  role: Role;
}

export interface Organization {
  id: number;
  name: string;
  role: Role;
}

export interface Installation {
  id: number;
  name: string;
  country: string;
}

export interface ActivityRecord {
  id: number;
  kind: string;
  name: string;
  amount: string;
  unit: string;
  valid_from: string;
  valid_to: string;
  evidence_id: number;
}

export interface Opinion {
  verifier_org_id: number;
  conclusion: string;
  signed_at: string;
}

export interface Precursor {
  material: string;
  tonnes: string;
  upstream_statement_id: number | null;
  uses_default: boolean;
}

export interface TimelineEvent {
  event: string;
  at: string;
  by: string;
  revoked?: boolean;
  grant_id?: number;
}

export interface Lot {
  material: string;
  tonnes: string;
  intensity: string;
  basis: "actual" | "default";
  tco2: string;
  used_for?: string | null;
}

export interface ProductBreakdown {
  tonnes: string;
  cn_code: string;
  direct: string;
  precursor: string;
  total: string;
}

export interface Breakdown {
  direct: string;
  indirect: string;
  precursor: string;
  lots: Lot[];
  products?: Record<string, ProductBreakdown>;
}

export interface ChainNode {
  id: number;
  supplier: string;
  see_by_product: Record<string, string>;
  status: string;
  verified: boolean;
}

export interface ChainEdge {
  from: number | null;
  to: number;
  material: string;
  tonnes: string;
  uses_default: boolean;
}

export interface Chain {
  root: number;
  nodes: ChainNode[];
  edges: ChainEdge[];
}

export interface Statement {
  id: number;
  supplier: string;
  supplier_org_id: number;
  installation: string;
  period_start: string;
  period_end: string;
  methodology: string;
  status: "draft" | "signed" | "stale";
  verified: boolean;
  see_by_product: Record<string, string>;
  default_see_by_product: Record<string, string>;
  created_at: string;
  content_hash: string;
  signature_valid: boolean;
  opinions: Opinion[];
  // Present only for the owner and verifiers (selective disclosure).
  total_tco2?: string;
  trace?: string[];
  breakdown?: Breakdown;
  timeline?: TimelineEvent[];
  precursors?: Precursor[];
  inputs?: StatementInput[];
  supersedes_id?: number | null;
  inputs_hash?: string;
}

export interface Savings {
  actual_see: string;
  default_see: string;
  difference_per_tonne: string;
  saving_eur: string;
  note: string;
}

export interface StatementInput {
  record_id: number;
  kind: string;
  name: string;
  amount: string;
  unit: string;
  evidence_id: number;
  filename: string;
  sha256: string;
}

export interface Attention {
  kind: "stale" | "unsigned" | "unverified" | "request";
  severity: "high" | "medium";
  title: string;
  detail: string;
  link: string;
}

export interface ActivityItem {
  id: number;
  at: string;
  action: string;
  detail: string;
  actor: string;
  hash: string;
}

export interface Overview {
  role: Role;
  kpis: {
    statements: number;
    verified: number;
    verified_share: number;
    stale: number;
    avg_cut_vs_default: number;
    plants: number;
    open_requests: number;
  };
  attention: Attention[];
  activity: ActivityItem[];
  statements: Statement[];
}

export interface AuditLog {
  intact: boolean;
  first_bad_entry: number | null;
  total_entries: number;
  entries: ActivityItem[];
}

export interface NetNode {
  id: number;
  name: string;
  role: string;
  statements: number;
  verified: number;
  you: boolean;
}

export interface NetEdge {
  from: number;
  to: number;
  material: string;
  links: number;
  verified: number;
  kind?: string;
}

export interface NetworkData { nodes: NetNode[]; edges: NetEdge[] }

export interface RequestRow {
  id: number;
  direction: "incoming" | "outgoing";
  other: string;
  other_role: string;
  kind: string;
  message: string;
  status: string;
  statement_id: number | null;
  created_at: string;
  resolved_at: string | null;
}

export interface LedgerRow {
  id: number;
  kind: string;
  name: string;
  amount: string;
  unit: string;
  valid_from: string;
  valid_to: string;
  evidence_id: number;
  recorded_at: string;
  supersedes_id: number | null;
}

export interface EvidenceRow {
  id: number;
  filename: string;
  sha256: string;
  size_bytes: number;
  uploaded_at: string;
  used_by_records: number;
}

export interface ReferenceData {
  factors: { id: number; name: string; value: string; per_unit: string; source: string; version: string; status: string }[];
  defaults: { id: number; cn_code: string; country: string; base: string; source: string; version: string; status: string; description: string; route: string; marked_up: Record<string, string> }[];
  methodologies: { key: string; includes_indirect: boolean; see_decimals: number; markup: Record<string, string> }[];
}

export interface OrgInfo {
  id: number;
  name: string;
  role: Role;
  public_key: string;
  key_fingerprint: string;
  members: { id: number; email: string }[];
}

export interface PackCheck { id: string; label: string; ok: boolean; detail: string }
export interface PackResult { valid: boolean; checks: PackCheck[] }

export interface VersionRow {
  id: number;
  status: string;
  created_at: string;
  total_tco2: string;
  see_by_product: Record<string, string>;
  supersedes_id: number | null;
  current: boolean;
}

// The AI reader's suggestion for one uploaded document.
export interface ReadField { name: string; value: string | number; confidence: number; how: string }
export interface DocumentReading {
  id: number;
  evidence_id: number;
  doc_type: string;
  status: "pending" | "confirmed" | "rejected";
  needs_review: boolean;
  model: string;
  text: string;
  fields: ReadField[];
  missing: string[];
  suggested: { kind: string; name: string; amount: number | string; unit: string; cn_code: string | null } | null;
  record_id: number | null;
  corrected: boolean | null;
}
