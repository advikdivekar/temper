// pages/LedgerPage.tsx
// The ledger explorer, with time travel.
//
// Every record in Temper is kept forever. A correction does not edit
// a number, it adds a new row that replaces the old one. That means
// we can answer an auditor's hardest question: "what did your records
// say on a given date?" Drag the slider to move through time.
//
// Two clocks (bitemporal): each record has the period it describes
// (valid from and to) and the moment we recorded it (recorded at).
// Time travel moves the second clock.

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Installation, LedgerRow } from "../api/types";
import { dateTime, quarterOf } from "../lib/format";
import { PageHead } from "../ui/PageHead";
import { Pill } from "../ui/Pill";
import { Tabs } from "../ui/Tabs";
import { useToast } from "../ui/Toast";

type Mode = "travel" | "history";

export function LedgerPage() {
  const toast = useToast();
  const [plants, setPlants] = useState<Installation[]>([]);
  const [plant, setPlant] = useState<number | null>(null);
  const [rows, setRows] = useState<LedgerRow[] | null>(null);
  const [mode, setMode] = useState<Mode>("travel");
  const [step, setStep] = useState(0);

  useEffect(() => {
    api<Installation[]>("/installations").then((p) => { setPlants(p); if (p.length) setPlant(p[0].id); });
  }, []);
  useEffect(() => {
    if (plant === null) return;
    setRows(null);
    api<LedgerRow[]>(`/installations/${plant}/ledger`)
      .then((r) => { setRows(r); setStep(0); })
      .catch((e) => toast.error("Could not load the ledger", (e as Error).message));
  }, [plant]);

  // The moments at which the ledger changed. Rows written within a few
  // seconds of each other are one moment (a batch of entries), and each
  // later correction is its own moment.
  const moments = useMemo(() => {
    if (!rows) return [];
    const times = [...new Set(rows.map((r) => r.recorded_at))].sort();
    const groups: string[][] = [];
    for (const t of times) {
      const last = groups[groups.length - 1];
      const gap = last ? new Date(t).getTime() - new Date(last[last.length - 1]).getTime() : Infinity;
      if (gap > 5000) groups.push([t]); else last.push(t);
    }
    return groups.map((g, i) => {
      const at = g[g.length - 1];
      const fixes = rows.filter((r) => g.includes(r.recorded_at) && r.supersedes_id);
      return { at, label: i === 0 ? "Records first entered" : fixes.length ? `Correction: ${fixes[0].name}` : "Records added" };
    });
  }, [rows]);

  const asOf = moments.length ? moments[Math.min(step, moments.length - 1)].at : null;
  const view = useMemo(() => {
    if (!rows || !asOf) return [];
    const known = rows.filter((r) => r.recorded_at <= asOf);
    const replaced = new Set(known.map((r) => r.supersedes_id).filter(Boolean));
    return known.filter((r) => !replaced.has(r.id));
  }, [rows, asOf]);
  const latestIds = useMemo(() => {
    if (!rows) return new Set<number>();
    const replaced = new Set(rows.map((r) => r.supersedes_id).filter(Boolean));
    return new Set(rows.filter((r) => !replaced.has(r.id)).map((r) => r.id));
  }, [rows]);

  const byQuarter = useMemo(() => {
    const groups = new Map<string, LedgerRow[]>();
    for (const r of view) groups.set(quarterOf(r.valid_from), [...(groups.get(quarterOf(r.valid_from)) ?? []), r]);
    return [...groups.entries()].sort();
  }, [view]);

  return (
    <div className="stack">
      <PageHead eyebrow="Ledger" title="Every record, forever."
        description="Corrections never overwrite. Travel back to see exactly what your records said on any date."
        actions={plants.length > 0 ? (
          <select className="input" style={{ width: 280 }} value={plant ?? ""} onChange={(e) => setPlant(Number(e.target.value))}>
            {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        ) : undefined} />
      <Tabs tabs={[{ id: "travel", label: "Time travel" }, { id: "history", label: "Full history", count: rows?.length }]} value={mode} onChange={setMode} />

      {!rows && <div className="skeleton" style={{ height: 300 }} />}

      {rows && mode === "travel" && (
        <>
          <div className="card stack">
            <div className="toolbar"><span className="eyebrow">Viewing the ledger as of</span>
              <Pill tone="ember">{asOf ? dateTime(asOf) : ""}</Pill></div>
            <input className="range" type="range" min={0} max={Math.max(moments.length - 1, 0)} step={1} value={step}
              aria-label="Time travel" onChange={(e) => setStep(Number(e.target.value))} />
            <div className="moments">
              {moments.map((m, i) => (
                <button key={m.at} className={i === step ? "on" : ""} onClick={() => setStep(i)}>
                  <span className="mono">{String(i + 1).padStart(2, "0")}</span>{m.label}
                </button>
              ))}
            </div>
          </div>
          {byQuarter.map(([quarter, items]) => (
            <motion.div key={quarter} className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="toolbar" style={{ marginBottom: 8 }}><h3>{quarter}</h3><span className="muted">{items.length} records</span></div>
              <table className="table">
                <thead><tr><th>Kind</th><th>Name</th><th className="num">Amount</th><th>Evidence</th><th>State now</th></tr></thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td>{r.kind}</td><td>{r.name}</td>
                      <td className="num">{Number(r.amount).toLocaleString("en-IN")} {r.unit}</td>
                      <td className="mono">#{r.evidence_id}</td>
                      <td>{latestIds.has(r.id) ? <Pill tone="good" dot>Current</Pill> : <Pill tone="warn" dot>Since corrected</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          ))}
        </>
      )}

      {rows && mode === "history" && (
        <div className="card">
          <table className="table">
            <thead><tr><th>Row</th><th>Period</th><th>Name</th><th className="num">Amount</th><th>Recorded</th><th>Replaces</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={latestIds.has(r.id) ? "" : "struck"}>
                  <td className="mono">#{r.id}</td><td>{quarterOf(r.valid_from)}</td><td>{r.name}</td>
                  <td className="num">{Number(r.amount).toLocaleString("en-IN")} {r.unit}</td>
                  <td className="mono">{dateTime(r.recorded_at)}</td>
                  <td className="mono">{r.supersedes_id ? `#${r.supersedes_id}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
