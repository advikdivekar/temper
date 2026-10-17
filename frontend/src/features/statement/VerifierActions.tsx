// features/statement/VerifierActions.tsx
// The verifier's review desk. The verifier ticks what they checked,
// writes a comment, and signs an opinion. The buttons stay locked
// until every check is ticked, which nudges a proper review.

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { api } from "../../api/client";
import type { Statement } from "../../api/types";
import { Button } from "../../ui/Button";
import { Icon } from "../../ui/Icons";
import { useToast } from "../../ui/Toast";

const CHECKS = [
  "Evidence fingerprints are intact",
  "Calculation trace reproduces the figure",
  "Precursor sources are valid and verified",
];

export function VerifierActions({ statement, onChange }: { statement: Statement; onChange: () => Promise<void> }) {
  const toast = useToast();
  const [ticked, setTicked] = useState<boolean[]>(CHECKS.map(() => false));
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState("");
  const done = statement.opinions.length > 0;

  async function sign(conclusion: string) {
    setBusy(conclusion);
    try {
      await api(`/statements/${statement.id}/opinion`, { body: { conclusion, comments } });
      await onChange();
      toast.success("Opinion signed", conclusion);
    } catch (problem) {
      toast.error("Could not sign the opinion", (problem as Error).message);
    } finally { setBusy(""); }
  }

  if (statement.status !== "signed") {
    return (
      <div className="card sticky"><span className="eyebrow">Review desk</span>
        <p className="muted" style={{ marginTop: 8 }}>The supplier must sign this statement before it can be verified.</p></div>
    );
  }

  return (
    <div className="card stack sticky">
      <span className="eyebrow">Review desk</span>
      <AnimatePresence>
        {done && (
          <motion.div initial={{ scale: 2, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -4 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}>
            <span className="stamp">{statement.opinions[0].conclusion}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="checklist">
        {CHECKS.map((label, i) => (
          <div key={label} className={`check ${ticked[i] ? "on" : ""}`}
            onClick={() => setTicked(ticked.map((t, j) => (j === i ? !t : t)))}>
            <span className="box">{ticked[i] && <Icon name="check" size={13} />}</span>{label}
          </div>
        ))}
      </div>
      <input className="input" placeholder="Comments (optional)" value={comments}
        onChange={(e) => setComments(e.target.value)} />
      <div className="row">
        <Button variant="ember" loading={busy === "satisfactory"}
          disabledReason={ticked.every(Boolean) ? undefined : "Tick every check first."}
          onClick={() => sign("satisfactory")}>Sign: satisfactory</Button>
        <Button variant="ghost" loading={busy === "unsatisfactory"}
          disabledReason={ticked.every(Boolean) ? undefined : undefined}
          onClick={() => sign("unsatisfactory")}>Raise concerns</Button>
      </div>
    </div>
  );
}
