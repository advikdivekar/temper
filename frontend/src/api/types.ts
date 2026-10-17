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

export interface Statement {
  id: number;
  supplier: string;
  installation: string;
  period_start: string;
  period_end: string;
  methodology: string;
  status: "draft" | "signed" | "stale";
  verified: boolean;
  see_by_product: Record<string, string>;
  content_hash: string;
  signature_valid: boolean;
  opinions: Opinion[];
  // Present only for the owner and verifiers (selective disclosure).
  total_tco2?: string;
  trace?: string[];
  precursors?: Precursor[];
  supersedes_id?: number | null;
  inputs_hash?: string;
}

export interface Savings {
  actual_see: number;
  default_see: number;
  difference_per_tonne: number;
  saving_eur: number;
  note: string;
}
