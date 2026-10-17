// lib/format.ts
// Small helpers that turn raw values into readable text. Keeping them
// in one place means every page words things the same way.

/** "3 hours ago" style text for a timestamp from the API. */
export function timeAgo(iso: string): string {
  const then = new Date(iso.endsWith("Z") ? iso : iso + "Z").getTime();
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

export function dateTime(iso: string): string {
  return new Date(iso.endsWith("Z") ? iso : iso + "Z").toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

const ACTIONS: Record<string, string> = {
  registered: "Account created",
  installation_created: "Plant added",
  evidence_uploaded: "Evidence uploaded",
  evidence_verified: "Evidence re-verified",
  record_added: "Record added to ledger",
  record_corrected: "Ledger record corrected",
  statement_built: "Statement calculated",
  statement_signed: "Statement signed",
  opinion_added: "Verifier opinion signed",
  share_granted: "Statement shared",
  share_revoked: "Share revoked",
  request_sent: "Data request sent",
  request_resolved: "Request resolved",
  demo_seeded: "Demo workspace created",
};

export function actionLabel(action: string): string {
  return ACTIONS[action] ?? action.replace(/_/g, " ");
}

/** "Q2 2026" from a period start date like 2026-04-01. */
export function quarterOf(periodStart: string): string {
  const month = Number(periodStart.slice(5, 7));
  return `Q${Math.floor((month - 1) / 3) + 1} ${periodStart.slice(0, 4)}`;
}

export function shortHash(hash: string, length = 10): string {
  return hash.length > length ? `${hash.slice(0, length)}...` : hash;
}
