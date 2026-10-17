// studio/pages/BuildPage.tsx
// Build a statement, one question at a time. Instead of one long form,
// five full screen steps, each with a single clear job:
//   1 Where    which plant is this for
//   2 Proof    the documents behind your numbers
//   3 Data     what the plant burned, used and made
//   4 Inputs   where purchased steel comes from
//   5 Run      calculate, and watch the stages
// A bar of five dots shows where you are. Continue stays disabled
// until a step is done, and it says exactly what is missing.

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import type { ActivityRecord, Installation, Statement } from "../../api/types";
import { Icon } from "../../ui/Icons";
import { useToast } from "../../ui/Toast";
import { DropVault } from "../parts/DropVault";
import type { VaultFile } from "../parts/DropVault";
import { Identicon } from "../parts/Identicon";

type Kind = "fuel" | "electricity" | "output";
const STEPS = ["Where", "Proof", "Data", "Inputs", "Run"];

const FUELS = [
  { name: "natural_gas", unit: "gj", label: "Natural gas" },
  { name: "coal", unit: "tonne", label: "Coal" },
  { name: "diesel", unit: "gj", label: "Diesel" },
];
const OUTPUTS = [
  { name: "bolts", cn: "73181590", label: "Screws and bolts" },
  { name: "nuts", cn: "73181600", label: "Nuts" },
  { name: "washers", cn: "73182200", label: "Washers" },
  { name: "rivets", cn: "73182300", label: "Rivets" },
  { name: "steel_rods", cn: "7213", label: "Steel rods" },
  { name: "steel_flat", cn: "7208", label: "Flat steel" },
];
const PRECURSOR_CN = [
  { cn: "7213", label: "Bars and rods" }, { cn: "7217", label: "Wire" },
  { cn: "7208", label: "Flat steel" }, { cn: "7201", label: "Pig iron" },
];
const QUARTERS = [
  { label: "Q1", from: "2026-01-01", to: "2026-03-31" }, { label: "Q2", from: "2026-04-01", to: "2026-06-30" },
  { label: "Q3", from: "2026-07-01", to: "2026-09-30" }, { label: "Q4", from: "2026-10-01", to: "2026-12-31" },
  { label: "Full year", from: "2026-01-01", to: "2026-12-31" },
];
const RUN_STAGES = ["Reading the ledger", "Resolving precursors", "Applying the rules", "Splitting across products", "Hashing the inputs"];

export function BuildPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [plants, setPlants] = useState<Installation[]>([]);
  const [plant, setPlant] = useState<number | null>(null);
  const [newPlant, setNewPlant] = useState("");
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [fileId, setFileId] = useState<number | null>(null);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [incoming, setIncoming] = useState<Statement[]>([]);
  const [period, setPeriod] = useState(QUARTERS[4]);

  const [kind, setKind] = useState<Kind>("fuel");
  const [name, setName] = useState("natural_gas");
  const [unit, setUnit] = useState("gj");
  const [amount, setAmount] = useState("");
  const [cn, setCn] = useState("");
  const [adding, setAdding] = useState(false);

  const [buys, setBuys] = useState(false);
  const [pTonnes, setPTonnes] = useState("");
  const [pCn, setPCn] = useState("7213");
  const [pFor, setPFor] = useState("");
  const [upstream, setUpstream] = useState<Statement | null>(null);

  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);

  const loadRecords = useCallback(async (id: number) => {
    setRecords(await api<ActivityRecord[]>(`/installations/${id}/records`));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [p, f, inc] = await Promise.all([api<Installation[]>("/installations"), api<VaultFile[]>("/evidence"), api<Statement[]>("/statements/incoming")]);
        setPlants(p); setFiles(f); setIncoming(inc.filter((s) => s.verified));
        if (p.length) setPlant(p[0].id);
        if (f.length) setFileId(f[0].id);
      } catch (e) { toast.error("Could not load", (e as Error).message); }
    })();
  }, []);
  useEffect(() => { if (plant) loadRecords(plant); }, [plant, loadRecords]);

  const outputs = records.filter((r) => r.kind === "output");
  const hasFuel = records.some((r) => r.kind === "fuel");
  useEffect(() => { if (!pFor && outputs[0]) setPFor(outputs[0].name); }, [outputs.length]);

  const stepReason = useMemo(() => {
    if (step === 0 && plant === null) return "Choose or add a plant.";
    if (step === 1 && files.length === 0) return "Add at least one document.";
    if (step === 2 && !hasFuel) return "Add the fuel the plant burned.";
    if (step === 2 && outputs.length === 0) return "Add at least one product it made.";
    if (step === 3 && buys && !(Number(pTonnes) > 0)) return "Enter how many tonnes you bought.";
    return undefined;
  }, [step, plant, files.length, hasFuel, outputs.length, buys, pTonnes]);

  function go(next: number) { setDir(next > step ? 1 : -1); setStep(next); }

  async function addPlant() {
    try {
      const created = await api<Installation>("/installations", { body: { name: newPlant.trim() } });
      setPlants((all) => [...all, created]); setPlant(created.id); setNewPlant("");
      toast.success("Plant added", created.name);
    } catch (e) { toast.error("Could not add the plant", (e as Error).message); }
  }

  async function addRecord() {
    if (!plant || !fileId) return;
    setAdding(true);
    try {
      await api("/records", { body: { installation_id: plant, kind, name, amount, unit, valid_from: period.from, valid_to: period.to, evidence_id: fileId, cn_code: kind === "output" ? cn || undefined : undefined } });
      setAmount(""); await loadRecords(plant);
      toast.success("Added", `${name.replace("_", " ")}: ${amount} ${unit}`);
    } catch (e) { toast.error("Could not add the record", (e as Error).message); }
    finally { setAdding(false); }
  }

  function pickKind(k: Kind) {
    setKind(k);
    if (k === "fuel") { setName("natural_gas"); setUnit("gj"); }
    if (k === "electricity") { setName("grid_india"); setUnit("kwh"); }
    if (k === "output") { setName("bolts"); setUnit("tonne"); setCn("73181590"); }
  }

  async function run() {
    setRunning(true); setStage(0);
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, RUN_STAGES.length - 1)), 520);
    try {
      const precursors = buys ? [{
        material_name: "steel", tonnes: pTonnes, cn_code: pCn, for_product: pFor || null,
        upstream_statement_id: upstream?.id ?? null, upstream_product: upstream ? Object.keys(upstream.see_by_product)[0] : null,
      }] : [];
      const [statement] = await Promise.all([
        api<Statement>("/statements", { body: { installation_id: plant, period_start: period.from, period_end: period.to, precursors } }),
        new Promise((d) => setTimeout(d, RUN_STAGES.length * 520)),
      ]);
      navigate(`/statements/${statement.id}`);
    } catch (e) { toast.error("The calculation could not run", (e as Error).message); setRunning(false); }
    finally { clearInterval(timer); }
  }

  const plantName = plants.find((p) => p.id === plant)?.name ?? "";

  return (
    <div className="build">
      <div className="build-rail" role="list">
        {STEPS.map((label, i) => (
          <button key={label} role="listitem" className={`build-dot ${i === step ? "on" : i < step ? "past" : ""}`} onClick={() => i < step && go(i)} disabled={i > step}>
            <i><motion.b initial={false} animate={{ scaleX: i < step ? 1 : i === step ? 0.35 : 0 }} /></i><span className="mono">{String(i + 1).padStart(2, "0")} {label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={step} className="build-scene" custom={dir} initial={{ opacity: 0, x: 50 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 * dir }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          {step === 0 && (
            <>
              <h1 className="stage-title build-title">Which plant is this for?</h1>
              <div className="choice-grid">
                {plants.map((p) => (
                  <button key={p.id} className={`choice ${plant === p.id ? "on" : ""}`} onClick={() => setPlant(p.id)}>
                    <strong>{p.name}</strong><span className="mono">{p.country}</span>
                  </button>
                ))}
                <div className="choice new">
                  <input placeholder="Add a plant" value={newPlant} onChange={(e) => setNewPlant(e.target.value)} onKeyDown={(e) => e.key === "Enter" && newPlant.trim() && addPlant()} />
                  <button className="pill-btn" disabled={!newPlant.trim()} onClick={addPlant}><Icon name="plus" size={14} /></button>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="stage-title build-title">Add the documents behind your numbers.</h1>
              <DropVault onUploaded={(f) => { setFiles((all) => [f, ...all.filter((x) => x.id !== f.id)]); setFileId(f.id); }} />
              {files.length > 0 && (
                <div className="vault-picks">
                  <span className="kicker mono">USE FOR THE NEXT RECORDS</span>
                  <div className="tiles">
                    {files.slice(0, 8).map((f) => (
                      <button key={f.id} className={`tile ${fileId === f.id ? "on" : ""}`} onClick={() => setFileId(f.id)} title={f.filename}>
                        <Identicon hash={f.sha256} size={38} /><span>{f.filename.replace(/\.[^.]+$/, "").slice(0, 22)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="stage-title build-title">What happened at {plantName || "the plant"}?</h1>
              <div className="period-chips">{QUARTERS.map((q) => <button key={q.label} className={`chip ${period.label === q.label ? "ember" : ""}`} onClick={() => setPeriod(q)}>{q.label}</button>)}</div>
              <div className="kind-tabs">
                {(["fuel", "electricity", "output"] as Kind[]).map((k) => (
                  <button key={k} className={kind === k ? "on" : ""} onClick={() => pickKind(k)}>{k === "fuel" ? "Fuel burned" : k === "electricity" ? "Electricity used" : "Products made"}
                    {kind === k && <motion.i layoutId="kind-line" />}</button>
                ))}
              </div>
              <div className="compose">
                <div className="compose-presets">
                  {kind === "fuel" && FUELS.map((f) => <button key={f.name} className={`chip ${name === f.name ? "ember" : ""}`} onClick={() => { setName(f.name); setUnit(f.unit); }}>{f.label}</button>)}
                  {kind === "output" && OUTPUTS.map((o) => <button key={o.name} className={`chip ${name === o.name ? "ember" : ""}`} onClick={() => { setName(o.name); setCn(o.cn); }}>{o.label}</button>)}
                  {kind === "electricity" && <span className="muted-light">Recorded for completeness. Steel and aluminium count direct emissions only.</span>}
                </div>
                <div className="compose-row">
                  <input className="big-input" inputMode="decimal" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <select className="big-select" value={unit} onChange={(e) => setUnit(e.target.value)}>{["tonne", "gj", "kwh", "mwh", "kg"].map((u) => <option key={u}>{u}</option>)}</select>
                  {kind === "output" && <input className="big-input small" placeholder="CN code" value={cn} onChange={(e) => setCn(e.target.value)} />}
                  <button className="pill-btn ember" disabled={adding || !(Number(amount) > 0) || !fileId} onClick={addRecord}>Add</button>
                </div>
              </div>
              <div className="rec-chips">
                {records.map((r) => <motion.span key={r.id} className={`chip ${r.kind === "output" ? "good" : ""}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}><i />{r.name.replace("_", " ")} · {Number(r.amount).toLocaleString("en-IN")} {r.unit === "tonne" ? "t" : r.unit.toUpperCase()}</motion.span>)}
                {records.length === 0 && <span className="muted-light">Nothing added yet.</span>}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="stage-title build-title">Do you buy steel for these products?</h1>
              <div className="yesno">
                <button className={!buys ? "on" : ""} onClick={() => setBuys(false)}>No</button>
                <button className={buys ? "on" : ""} onClick={() => setBuys(true)}>Yes</button>
              </div>
              <AnimatePresence initial={false}>
                {buys && (
                  <motion.div className="prec" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <div className="compose-row">
                      <input className="big-input" inputMode="decimal" placeholder="Tonnes bought" value={pTonnes} onChange={(e) => setPTonnes(e.target.value)} />
                      <select className="big-select" value={pCn} onChange={(e) => setPCn(e.target.value)}>{PRECURSOR_CN.map((c) => <option key={c.cn} value={c.cn}>{c.label} ({c.cn})</option>)}</select>
                      {outputs.length > 1 && <select className="big-select" value={pFor} onChange={(e) => setPFor(e.target.value)}>{[...new Set(outputs.map((o) => o.name))].map((n) => <option key={n} value={n}>for {n.replace("_", " ")}</option>)}</select>}
                    </div>
                    <span className="kicker mono">WHOSE CARBON NUMBER DOES IT CARRY</span>
                    <div className="source-list">
                      <button className={`source ${upstream === null ? "on" : ""}`} onClick={() => setUpstream(null)}><strong>The EU default</strong><span className="chip warn"><i />marked up</span></button>
                      {incoming.map((s) => (
                        <button key={s.id} className={`source ${upstream?.id === s.id ? "on" : ""}`} onClick={() => setUpstream(s)}>
                          <strong>{s.supplier}</strong><span className="mono">{Object.entries(s.see_by_product).map(([k, v]) => `${k.replace("_", " ")} ${Number(v).toFixed(2)}`).join(", ")} · {s.period_start.slice(5, 7) <= "03" ? "Q1" : s.period_start.slice(5, 7) <= "06" ? "Q2" : s.period_start.slice(5, 7) <= "09" ? "Q3" : "Q4"}</span>
                          <span className="chip good"><i />verified</span>
                        </button>
                      ))}
                      {incoming.length === 0 && <span className="muted-light">No verified mill statements shared with you yet.</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="stage-title build-title">Ready to calculate.</h1>
              <div className="summary">
                <div><span className="kicker mono">PLANT</span><strong>{plantName}</strong></div>
                <div><span className="kicker mono">PERIOD</span><strong>{period.label} 2026</strong></div>
                <div><span className="kicker mono">RECORDS</span><strong>{records.length}</strong></div>
                <div><span className="kicker mono">STEEL</span><strong>{buys ? `${pTonnes} t, ${upstream ? upstream.supplier : "EU default"}` : "none"}</strong></div>
              </div>
              <button className="pill-btn ember run-btn" onClick={run}>Calculate emissions <Icon name="arrow" size={16} /></button>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {step < 4 && (
        <div className="build-nav">
          <button className="pill-btn ghost" disabled={step === 0} onClick={() => go(step - 1)}>Back</button>
          <div className="build-next">
            {stepReason && <span className="muted-light">{stepReason}</span>}
            <button className="pill-btn" disabled={Boolean(stepReason)} onClick={() => go(step + 1)}>Continue <Icon name="arrow" size={15} /></button>
          </div>
        </div>
      )}
      {step === 4 && <div className="build-nav"><button className="pill-btn ghost" onClick={() => go(3)}>Back</button></div>}

      <AnimatePresence>
        {running && (
          <motion.div className="ceremony-dark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="ceremony-list">
              <span className="kicker mono">ENGINE RUNNING</span>
              {RUN_STAGES.map((label, i) => (
                <motion.div key={label} className="cline" animate={{ opacity: i <= stage ? 1 : 0.25, x: i <= stage ? 0 : -8 }}>
                  <span>{i < stage ? <Icon name="check" size={15} /> : <i className={i === stage ? "live" : ""} />}</span>{label}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
