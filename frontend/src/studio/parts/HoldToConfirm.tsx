// studio/parts/HoldToConfirm.tsx
// A "press and hold" confirmation, for actions that matter (signing a
// statement, signing a verifier opinion). A ring fills while you hold,
// and the action only happens when it completes. Let go early and the
// ring drains. This is the same gesture as the landing page, used where
// a stray click must not be enough.
//
// Space or Enter held works as well, and there is no mouse only path.

import { motion, useTransform } from "motion/react";
import { useState } from "react";
import { useHold } from "./useHold";

interface Props {
  label: string;
  doneLabel?: string;
  onConfirm: () => Promise<void> | void;
  disabledReason?: string;
}

export function HoldToConfirm({ label, doneLabel = "Done", onConfirm, disabledReason }: Props) {
  const [done, setDone] = useState(false);
  const hold = useHold({
    holdMs: 1300, drainMs: 700,
    onComplete: async () => { try { await onConfirm(); setDone(true); } catch { hold.reset(); } },
  });
  const dash = useTransform(hold.progress, (p) => (1 - p) * 213.6);
  const blocked = Boolean(disabledReason);

  return (
    <div className="hold-confirm">
      <button className={`hold-ring ${done ? "done" : ""}`} disabled={blocked || done}
        aria-label={`${label}. Press and hold Space or Enter.`}
        onPointerDown={blocked ? undefined : hold.begin} onPointerUp={hold.end} onPointerLeave={hold.end} onPointerCancel={hold.end}
        onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat && !blocked) { e.preventDefault(); hold.begin(); } }}
        onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") hold.end(); }}>
        <svg viewBox="0 0 80 80" aria-hidden>
          <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
          <motion.circle cx="40" cy="40" r="34" fill="none" stroke={done ? "#3fd9a0" : "#ff5a1f"} strokeWidth="3" strokeLinecap="round"
            strokeDasharray="213.6" style={{ strokeDashoffset: done ? 0 : dash }} transform="rotate(-90 40 40)" />
        </svg>
        <span className="mono">{done ? "✓" : "HOLD"}</span>
      </button>
      <span className="hold-label">{done ? doneLabel : label}</span>
      {disabledReason && <small className="muted-light">{disabledReason}</small>}
    </div>
  );
}
