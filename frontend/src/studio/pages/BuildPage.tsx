// studio/pages/BuildPage.tsx
// Build a statement in three plain steps:
//   1 Plant and period   which plant, and which quarter
//   2 Documents and data the proof, then what the plant burned and made
//                        (the AI reader can suggest the numbers; you confirm)
//   3 Steel and run      where purchased steel comes from, then calculate
// Continue stays disabled until a step is done and says what is missing.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import type { ActivityRecord, Installation, Statement } from "../../api/types";
import { useToast } from "../../ui/Toast";
import { DropVault } from "../parts/DropVault";
import { ReaderPanel } from "../parts/ReaderPanel";
import type { VaultFile } from "../parts/DropVault";

type Kind = "fuel" | "electricity" | "output";
const STEPS = ["Plant and period", "Documents and data", "Steel and run"];
const FUELS = [{ name: "natural_gas", unit: "gj", label: "Natural gas" }, { name: "coal", unit: "tonne", label: "Coal" }, { name: "diesel", unit: "gj", label: "Diesel" }];
const OUTPUTS = [
  { name: "bolts", cn: "73181590", label: "Screws and bolts" }, { name: "nuts", cn: "73181600", label: "Nuts" },
  { name: "washers", cn: "73182200", label: "Washers" }, { name: "steel_rods", cn: "7213", label: "Steel rods" },
];
const STEEL_CN = [{ cn: "7213", label: "Bars and rods" }, { cn: "7217", label: "Wire" }, { cn: "7208", label: "Flat steel" }];
const QUARTERS = [
  { label: "Q1", from: "2026-01-01", to: "2026-03-31" }, { label: "Q2", from: "2026-04-01", to: "2026-06-30" },
  { label: "Q3", from: "2026-07-01", to: "2026-09-30" }, { label: "Q4", from: "2026-10-01", to: "2026-12-31" },
  { label: "Full year", from: "2026-01-01", to: "2026-12-31" },
];

export function BuildPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [plants, setPlants] = useState<Installation[]>([]);
  const [plant, setPlant] = useState<number | null>(null);
  const [newPlant, setNewPlant] = useState("");
  const [period, setPeriod] = useState(QUARTERS[4]);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [fileId, setFileId] = useState<number | null>(null);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [incoming, setIncoming] = useState<Statement[]>([]);
  const [kind, setKind] = useState<Kind>("fuel");
  const [name, setName] = useState("natural_gas");
  const [unit, setUnit] = useState("gj");
  const [amount, setAmount] = useState("");
  const [cn, setCn] = useState("");
  const [buys, setBuys] = useState(false);
  const [pTonnes, setPTonnes] = useState("");
  const [pCn, setPCn] = useState("7213");
  const [pFor, setPFor] = useState("");
  const [upstream, setUpstream] = useState<Statement | null>(null);
  const [busy, setBusy] = useState(false);

  const loadRecords = useCallback(async (id: number) => setRecords(await api<ActivityRecord[]>(`/installations/${id}/records`)), []);

  useEffect(() => {
    Promise.all([api<Installation[]>("/installations"), api<VaultFile[]>("/evidence"), api<Statement[]>("/statements/incoming")])
      .then(([p, f, inc]) => { setPlants(p); setFiles(f); setIncoming(inc.filter((x) => x.verified)); if (p.length) setPlant(p[0].id); if (f.length) setFileId(f[0].id); })
      .catch((e) => toast.error("Could not load", (e as Error).message));
  }, []);
  useEffect(() => { if (plant) loadRecords(plant); }, [plant, loadRecords]);

  const outputs = records.filter((r) => r.kind === "output");
  const hasFuel = records.some((r) => r.kind === "fuel");
  useEffect(() => { if (!pFor && outputs[0]) setPFor(outputs[0].name); }, [outputs.length]);

  const reason = useMemo(() => {
    if (step === 0 && plant === null) return "Choose or add a plant.";
    if (step === 1 && files.length === 0) return "Add at least one document.";
    if (step === 1 && !hasFuel) return "Add the fuel the plant burned.";
    if (step === 1 && outputs.length === 0) return "Add at least one product it made.";
    if (step === 2 && buys && !(Number(pTonnes) > 0)) return "Enter how many tonnes you bought.";
    return undefined;
  }, [step, plant, files.length, hasFuel, outputs.length, buys, pTonnes]);

  async function addPlant() {
    try {
      const p = await api<Installation>("/installations", { body: { name: newPlant.trim() } });
      setPlants((all) => [...all, p]); setPlant(p.id); setNewPlant(""); toast.success("Plant added", p.name);
    } catch (e) { toast.error("Could not add the plant", (e as Error).message); }
  }

  async function addRecord() {
    if (!plant || !fileId) return;
    try {
      await api("/records", { body: { installation_id: plant, kind, name, amount, unit, valid_from: period.from, valid_to: period.to, evidence_id: fileId, cn_code: kind === "output" ? cn || undefined : undefined } });
      setAmount(""); await loadRecords(plant);
    } catch (e) { toast.error("Could not add the record", (e as Error).message); }
  }

  function pickKind(k: Kind) {
    setKind(k);
    if (k === "fuel") { setName("natural_gas"); setUnit("gj"); }
    if (k === "electricity") { setName("grid_india"); setUnit("kwh"); }
    if (k === "output") { setName("bolts"); setUnit("tonne"); setCn("73181590"); }
  }

  async function run() {
    setBusy(true);
    try {
      const precursors = buys ? [{ material_name: "steel", tonnes: pTonnes, cn_code: pCn, for_product: pFor || null,
        upstream_statement_id: upstream?.id ?? null, upstream_product: upstream ? Object.keys(upstream.see_by_product)[0] : null }] : [];
      const st = await api<Statement>("/statements", { body: { installation_id: plant, period_start: period.from, period_end: period.to, precursors } });
      navigate(`/statements/${st.id}`);
    } catch (e) { toast.error("The calculation could not run", (e as Error).message); setBusy(false); }
  }

  const plantName = plants.find((p) => p.id === plant)?.name ?? "";

  return (
    <div>
      <div className="head"><span className="kicker">Build a statement</span><h1 className="title">{STEPS[step]}.</h1></div>
      <div className="steps">{STEPS.map((s, i) => (
        <button key={s} className={`step ${i === step ? "on" : i < step ? "past" : ""}`} onClick={() => i < step && setStep(i)}>{i + 1}. {s}{i === step && <i />}</button>
      ))}</div>

      <div className="form-stack">
        {step === 0 && (
          <>
            <div className="field">Plant<div className="chips">
              {plants.map((p) => <button key={p.id} className={`chip ${plant === p.id ? "on" : ""}`} onClick={() => setPlant(p.id)}>{p.name}</button>)}</div></div>
            <div className="row"><label className="field">Add a plant<input className="input" value={newPlant} onChange={(e) => setNewPlant(e.target.value)} placeholder="e.g. Chennai works" /></label>
              <button className="btn-line" disabled={!newPlant.trim()} onClick={addPlant}>Add</button></div>
            <div className="field">Period<div className="chips">{QUARTERS.map((q) => <button key={q.label} className={`chip ${period.label === q.label ? "on" : ""}`} onClick={() => setPeriod(q)}>{q.label}</button>)}</div></div>
          </>
        )}

        {step === 1 && (
          <>
            <DropVault onUploaded={(f) => { setFiles((all) => [f, ...all.filter((x) => x.id !== f.id)]); setFileId(f.id); }} />
            {files.length > 0 && <label className="field">Use this document for the records below
              <select className="select" value={fileId ?? ""} onChange={(e) => setFileId(Number(e.target.value))}>{files.map((f) => <option key={f.id} value={f.id}>{f.filename}</option>)}</select></label>}
            <ReaderPanel fileId={fileId} plant={plant} period={period}
              onUploaded={(f) => { setFiles((all) => [f, ...all.filter((x) => x.id !== f.id)]); setFileId(f.id); }}
              onConfirmed={() => plant && loadRecords(plant)} />
            <div className="kicker">Or type it yourself</div>
            <div className="chips">{(["fuel", "electricity", "output"] as Kind[]).map((k) => <button key={k} className={`chip ${kind === k ? "on" : ""}`} onClick={() => pickKind(k)}>{k === "fuel" ? "Fuel burned" : k === "electricity" ? "Electricity" : "Products made"}</button>)}</div>
            <div className="chips">
              {kind === "fuel" && FUELS.map((f) => <button key={f.name} className={`chip ${name === f.name ? "on" : ""}`} onClick={() => { setName(f.name); setUnit(f.unit); }}>{f.label}</button>)}
              {kind === "output" && OUTPUTS.map((o) => <button key={o.name} className={`chip ${name === o.name ? "on" : ""}`} onClick={() => { setName(o.name); setCn(o.cn); }}>{o.label}</button>)}
              {kind === "electricity" && <span className="soft">Recorded for completeness. Steel counts direct emissions only.</span>}
            </div>
            <div className="row">
              <label className="field">Amount<input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              <label className="field" style={{ maxWidth: 120 }}>Unit<select className="select" value={unit} onChange={(e) => setUnit(e.target.value)}>{["tonne", "gj", "kwh", "mwh", "kg"].map((u) => <option key={u}>{u}</option>)}</select></label>
              {kind === "output" && <label className="field" style={{ maxWidth: 160 }}>CN code<input className="input" value={cn} onChange={(e) => setCn(e.target.value)} /></label>}
              <button className="btn-solid" disabled={!(Number(amount) > 0) || !fileId} onClick={addRecord}>Add</button>
            </div>
            <div className="records">{records.map((r) => <div key={r.id} className="record"><span>{r.name.replace("_", " ")}</span><span>{Number(r.amount).toLocaleString("en-IN")} {r.unit === "tonne" ? "t" : r.unit.toUpperCase()}</span></div>)}
              {records.length === 0 && <div className="record"><span className="soft">Nothing added yet.</span></div>}</div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="field">Do you buy steel for these products?<div className="chips">
              <button className={`chip ${!buys ? "on" : ""}`} onClick={() => setBuys(false)}>No</button><button className={`chip ${buys ? "on" : ""}`} onClick={() => setBuys(true)}>Yes</button></div></div>
            {buys && (
              <>
                <div className="row">
                  <label className="field">Tonnes bought<input className="input" inputMode="decimal" value={pTonnes} onChange={(e) => setPTonnes(e.target.value)} /></label>
                  <label className="field">Type<select className="select" value={pCn} onChange={(e) => setPCn(e.target.value)}>{STEEL_CN.map((c) => <option key={c.cn} value={c.cn}>{c.label} ({c.cn})</option>)}</select></label>
                  {outputs.length > 1 && <label className="field">For<select className="select" value={pFor} onChange={(e) => setPFor(e.target.value)}>{[...new Set(outputs.map((o) => o.name))].map((n) => <option key={n} value={n}>{n.replace("_", " ")}</option>)}</select></label>}
                </div>
                <div className="field">Whose carbon number does it carry?
                  <div className="choice-list">
                    <button className={`choice-row ${upstream === null ? "on" : ""}`} onClick={() => setUpstream(null)}><span>The EU default</span><span className="qstate"><i className="dot warn" />marked up</span></button>
                    {incoming.map((x) => (
                      <button key={x.id} className={`choice-row ${upstream?.id === x.id ? "on" : ""}`} onClick={() => setUpstream(x)}>
                        <span>{x.supplier} <span className="soft mono">{Object.entries(x.see_by_product).map(([k, v]) => `${k.replace("_", " ")} ${Number(v).toFixed(2)}`).join(", ")}, {x.period_start.slice(0, 7)}</span></span>
                        <span className="qstate"><i className="dot good" />verified</span></button>
                    ))}
                    {incoming.length === 0 && <div className="choice-row" style={{ cursor: "default" }}><span className="soft">No verified mill statements shared with you yet.</span></div>}
                  </div></div>
              </>
            )}
            <div className="summary">
              <div><span className="kicker">Plant</span><strong>{plantName}</strong></div><div><span className="kicker">Period</span><strong>{period.label} 2026</strong></div>
              <div><span className="kicker">Records</span><strong>{records.length}</strong></div><div><span className="kicker">Steel</span><strong>{buys ? `${pTonnes || 0} t` : "none"}</strong></div>
            </div>
          </>
        )}
      </div>

      <div className="nav-row">
        <button className="btn-line" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
        <div>
          {reason && <span className="soft">{reason}</span>}
          {step < 2 ? <button className="btn-solid" disabled={Boolean(reason)} onClick={() => setStep(step + 1)}>Continue</button>
            : <button className="btn-solid ember" disabled={Boolean(reason) || busy} onClick={run}>{busy ? "Calculating..." : "Calculate emissions"}</button>}
        </div>
      </div>
    </div>
  );
}
