// features/statement/TrustTimeline.tsx
// The journey of a statement: built, signed, verified, shared.
// Each event slides in one after another.

import { motion } from "motion/react";
import type { TimelineEvent } from "../../api/types";

const LABELS: Record<string, string> = {
  built: "Calculated by the engine",
  signed: "Signed by the supplier",
  verified_satisfactory: "Verified: satisfactory",
  verified_unsatisfactory: "Verifier raised concerns",
  shared: "Shared with",
};

export function TrustTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="timeline">
      {events.map((e, i) => (
        <motion.div key={i} className="tl-item" initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.15 }}>
          <span className={`tl-dot ${e.event === "verified_satisfactory" ? "good" : ""}`} />
          <div>
            <strong>
              {LABELS[e.event] ?? e.event}
              {e.event === "shared" ? ` ${e.by}` : e.by ? `: ${e.by}` : ""}
              {e.revoked ? " (revoked)" : ""}
            </strong>
            <div className="muted">{new Date(e.at + "Z").toLocaleString()}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
