// components/StatusBadge.tsx
// A small coloured label showing a statement's state.

import type { Statement } from "../api/types";

export function StatusBadge({ statement }: { statement: Statement }) {
  if (statement.status === "stale") {
    return <span className="badge bad">stale: recompute</span>;
  }
  if (statement.verified) {
    return <span className="badge good">signed and verified</span>;
  }
  if (statement.status === "signed") {
    return <span className="badge warn">signed, awaiting verifier</span>;
  }
  return <span className="badge">draft</span>;
}
