// ui/StatePill.tsx
// Turns a statement's state into the right coloured label.

import type { Statement } from "../api/types";
import { Pill } from "./Pill";

export function StatePill({ statement }: { statement: Statement }) {
  if (statement.status === "stale") return <Pill tone="bad" dot>Out of date</Pill>;
  if (statement.verified) return <Pill tone="good" dot>Verified</Pill>;
  if (statement.status === "signed") return <Pill tone="warn" dot>Awaiting verifier</Pill>;
  return <Pill dot>Draft</Pill>;
}
