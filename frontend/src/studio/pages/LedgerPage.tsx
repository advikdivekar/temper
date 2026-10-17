// studio/pages/LedgerPage.tsx
// The ledger, with time travel. Every record Temper stores is kept
// forever. A correction never edits a number, it adds a new row that
// replaces the old one. So we can answer an auditor's hardest question:
// "what did your records say on a given date?"
//
// A line runs across the page with one dot for each moment the ledger
// changed. Drag the line or click a dot to travel. The records below
// rearrange to show exactly what was known then. A value that has since
// been corrected stays visible, crossed out, with its replacement
// beside it, so nothing is ever hidden.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type { Installation, LedgerRow } from "../../api/types";
import { dateTime, quarterOf } from "../../lib/format";
import { useToast } from "../../ui/Toast";

const unitLabel = (u: string) => (u === "tonne" ? "t" : u.toUpperCase());
const label = (r: LedgerRow) => `${r.name.replace("_", " ")} ${Number(r.amount).toLocaleString("en-IN")} ${unitLabel(r.unit)}`;

export function LedgerPage() {
  const toast = useToast();
  const [plants, setPlants] = useState<Installation[]>([]);
  const [plant, setPlant] = useState<number | null>(null);
  const [rows, setRows] = useState<LedgerRow[] | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => { api<Installation[]>("/installations").then((p) => { setPlants(p); if (p.length) setPlant(p[0].id); }); }, []);
  useEffect(() => {
    if (plant === null) return;
    setRows(null);
    api<LedgerRow[]>(`/installations/${plant}/ledger`).then((r) => { setRows(r); setStep(Number.MAX_SAFE_INTEGER); })
      .catch((e) => toast.error("Could not load the ledger", (e as Error).message));
  }, [plant]);

  // Moments: batches of rows written within a few seconds, plus each later correction.
  const moments = useMemo(() => {
    if (!rows) return [];
    const times = [...new Set(rows.map((r) => r.recorded_at))].sort();
    const groups: string[][] = [];
    for (const t of times) {
      const last = groups[groups.length - 1];
      const gap = last ? new Date(t).getTime() - new Date(last[last.length - 1]).getTime() : Infinity;
      if (gap > 5000) groups.push([t]); else last.push(t);
    }
    return groups.map((g) => {
      const at = g[g.length - 1];
      const fix = rows.find((r) => g.includes(r.recorded_at) && r.supersedes_id);
      const quarters = [...new Set(rows.filter((r) => g.includes(r.recorded_at)).map((r) => quarterOf(r.valid_from)))];
      return { at, text: fix ? `Corrected ${fix.name.replace("_", " ")}` : `${quarters.join(", ")} entered` };
    });
  }, [rows]);

  const index = Math.min(step, Math.max(moments.length - 1, 0));
  const asOf = moments[index]?.at;
  const known = (rows ?? []).filter((r) => asOf && r.recorded_at <= asOf);
  const replacedNow = new Set(known.map((r) => r.supersedes_id).filter(Boolean));
  const replacedEver = new Map((rows ?? []).filter((r) => r.supersedes_id).map((r) => [r.supersedes_id!, r]));
  const newest = new Set((rows ?? []).filter((r) => asOf && r.recorded_at === asOf).map((r) => r.id));

  const quarters = useMemo(() => {
    const map = new Map<string, LedgerRow[]>();
    for (const r of known) {
      if (replacedNow.has(r.id)) continue;
      const q = quarterOf(r.valid_from);
      map.set(q, [...(map.get(q) ?? []), r]);
    }
    return [...map.entries()].sort();
  }, [rows, asOf]);

  return (
    <div>
      <div className="stage-head">
        <span className="kicker mono">LEDGER</span>
        <h1 className="stage-title">Every record, forever.</h1>
        <p className="stage-sub">Drag back in time to see exactly what your records said then.</p>
        <div className="row-chips">{plants.map((p) => <button key={p.id} className={`chip ${plant === p.id ? "ember" : ""}`} style={{ cursor: "pointer", background: "transparent" }} onClick={() => setPlant(p.id)}>{p.name}</button>)}</div>
      </div>

      {!rows ? <div className="skeleton" style={{ height: 300 }} /> : (
        <>
          <div className="scrub">
            <div className="scrub-line">
              <motion.i className="scrub-fill" animate={{ width: `${moments.length > 1 ? (index / (moments.length - 1)) * 100 : 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 28 }} />
              {moments.map((m, i) => (
                <button key={m.at} className={`scrub-dot ${i === index ? "on" : i < index ? "past" : ""}`} style={{ left: `${moments.length > 1 ? (i / (moments.length - 1)) * 100 : 50}%` }} onClick={() => setStep(i)} aria-label={`Go to ${m.text}`}>
                  <span className="scrub-tip mono"><b>{m.text}</b>{dateTime(m.at)}</span>
                </button>
              ))}
            </div>
            <input className="scrub-range" type="range" min={0} max={Math.max(moments.length - 1, 0)} step={1} value={index} aria-label="Time travel" onChange={(e) => setStep(Number(e.target.value))} />
            <div className="scrub-now"><span className="kicker mono">THE LEDGER AS OF</span><strong>{asOf ? dateTime(asOf) : ""}</strong></div>
          </div>

          <div className="ledger-cols">
            {quarters.map(([q, items]) => (
              <div key={q} className="ledger-col">
                <span className="kicker mono">{q}</span>
                <AnimatePresence>
                  {items.map((r) => {
                    const later = replacedEver.get(r.id);
                    const corrected = later && asOf !== undefined && later.recorded_at > asOf;
                    return (
                      <motion.div layout key={r.id} className={`token ${r.kind} ${newest.has(r.id) ? "fresh" : ""}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                        <span className="mono token-kind">{r.kind}</span>
                        <strong className={corrected ? "struck" : ""}>{label(r)}</strong>
                        {corrected && <span className="token-note">later corrected to <b>{label(later!)}</b></span>}
                        {r.supersedes_id && <span className="token-note">replaces #{r.supersedes_id}</span>}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
