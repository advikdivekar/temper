// features/plant/BuildPanel.tsx
// The last step: choose how purchased steel (a precursor) is counted,
// then run the calculation.
//
// Two choices for the steel:
//   EU default   punitive number set by the Commission
//   Linked       the mill's own statement, used only if verified
// Clicking Calculate plays a short "ceremony" that names each stage
// the engine goes through, so the work feels real and understood.

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Statement } from "../../api/types";
import { Button } from "../../ui/Button";
import { Icon } from "../../ui/Icons";
import { Pill } from "../../ui/Pill";

export interface PrecursorChoice {
  tonnes: string;
  cnCode: string;
  upstream: Statement | null;
  product: string;
}

interface Props {
  incoming: Statement[];
  blockedReason?: string;
  onCalculate: (choice: PrecursorChoice | null) => Promise<void>;
}

const STAGES = [
  "Reading the ledger",
  "Resolving precursors",
  "Applying methodology rules",
  "Allocating across products",
  "Hashing inputs for the audit trail",
];

export function BuildPanel({ incoming, blockedReason, onCalculate }: Props) {
  const [buysSteel, setBuysSteel] = useState(false);
  const [tonnes, setTonnes] = useState("");
  const [cnCode, setCnCode] = useState("7208");
  const [upstreamId, setUpstreamId] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);

  const upstream = incoming.find((s) => s.id === upstreamId) ?? null;
  const product = upstream ? Object.keys(upstream.see_by_product)[0] : "";

  const reason = blockedReason
    ?? (buysSteel && !(Number(tonnes) > 0) ? "Enter how many tonnes of steel you bought." : undefined);

  async function run() {
    setRunning(true);
    setStage(0);
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 420);
    try {
      await Promise.all([
        onCalculate(buysSteel ? { tonnes, cnCode, upstream, product } : null),
        new Promise((done) => setTimeout(done, STAGES.length * 420)),
      ]);
    } finally {
      clearInterval(timer);
      setRunning(false);
    }
  }

  return (
    <div className="stack">
      <label className={`check ${buysSteel ? "on" : ""}`} style={{ width: "fit-content" }} onClick={() => setBuysSteel(!buysSteel)}>
        <span className="box">{buysSteel && <Icon name="check" size={13} />}</span>
        I buy steel or other precursor materials
      </label>

      <AnimatePresence initial={false}>
        {buysSteel && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div className="stack" style={{ paddingTop: 4 }}>
              <div className="row">
                <div className="field grow">
                  <label>Steel bought (tonnes)</label>
                  <input className="input" inputMode="decimal" value={tonnes}
                    onChange={(e) => setTonnes(e.target.value)} placeholder="e.g. 100" />
                </div>
                <div className="field" style={{ width: 160 }}>
                  <label>CN code</label>
                  <select className="input" value={cnCode} onChange={(e) => setCnCode(e.target.value)}>
                    <option value="7208">7208 flat steel</option>
                    <option value="7201">7201 pig iron</option>
                  </select>
                </div>
              </div>

              <span className="eyebrow">Where does the steel's carbon number come from?</span>
              <div className="stack" style={{ gap: 10 }}>
                <label className={`check ${upstreamId === null ? "on" : ""}`} onClick={() => setUpstreamId(null)}>
                  <span className="box">{upstreamId === null && <Icon name="check" size={13} />}</span>
                  EU default value <Pill tone="warn">penalty mark-up</Pill>
                </label>
                {incoming.map((s) => (
                  <label key={s.id} className={`check ${upstreamId === s.id ? "on" : ""}`}
                    onClick={() => setUpstreamId(s.id)}>
                    <span className="box">{upstreamId === s.id && <Icon name="check" size={13} />}</span>
                    {s.supplier}: {Object.entries(s.see_by_product).map(([k, v]) => `${k} ${v}`).join(", ")}
                    {s.verified ? <Pill tone="good" dot>Verified</Pill> : <Pill tone="warn">Not verified yet, default will apply</Pill>}
                  </label>
                ))}
                {incoming.length === 0 && (
                  <p className="muted">No mill has shared a statement with you yet. Ask your supplier to share one.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <Button variant="ember" size="big" loading={running} disabledReason={reason} onClick={run}>
          Calculate emissions <Icon name="arrow" />
        </Button>
      </div>

      <AnimatePresence>
        {running && (
          <motion.div className="ceremony" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="ceremony-steps">
              <span className="eyebrow">Engine running</span>
              {STAGES.map((label, i) => (
                <motion.div key={label} className="cstep" initial={{ opacity: 0.25, x: -8 }}
                  animate={{ opacity: i <= stage ? 1 : 0.25, x: i <= stage ? 0 : -8 }}>
                  <span style={{ color: i < stage ? "var(--good)" : "var(--ember)" }}>
                    {i < stage ? <Icon name="check" size={16} /> : <Icon name="flame" size={16} />}
                  </span>
                  {label}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
