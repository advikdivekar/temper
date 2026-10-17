// pages/PlantPage.tsx
// The supplier's workspace. It guides four steps in order:
//   1. Plant      create the production site
//   2. Evidence   drop bills and invoices
//   3. Data       add confirmed records that point at the evidence
//   4. Calculate  run the engine and open the statement
//
// This file only holds state and calls the API. The visual pieces
// live in src/features/plant/.

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { ActivityRecord, Installation, Statement } from "../api/types";
import { BuildPanel } from "../features/plant/BuildPanel";
import type { PrecursorChoice } from "../features/plant/BuildPanel";
import { DataComposer } from "../features/plant/DataComposer";
import type { NewRecord } from "../features/plant/DataComposer";
import { EvidenceDropzone } from "../features/plant/EvidenceDropzone";
import type { EvidenceFile } from "../features/plant/EvidenceDropzone";
import { ProgressRail } from "../features/plant/ProgressRail";
import { RecordsBoard } from "../features/plant/RecordsBoard";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icons";
import { Reveal } from "../ui/Reveal";
import { useToast } from "../ui/Toast";

export function PlantPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [activeFile, setActiveFile] = useState<number | null>(null);
  const [incoming, setIncoming] = useState<Statement[]>([]);
  const [newName, setNewName] = useState("");
  const [start, setStart] = useState("2026-01-01");
  const [end, setEnd] = useState("2026-12-31");

  const loadRecords = useCallback(async (id: number) => {
    setRecords(await api<ActivityRecord[]>(`/installations/${id}/records`));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [plants, ev, inc] = await Promise.all([
          api<Installation[]>("/installations"),
          api<EvidenceFile[]>("/evidence"),
          api<Statement[]>("/statements/incoming"),
        ]);
        setInstallations(plants);
        setFiles(ev);
        setIncoming(inc);
        if (plants.length) setSelected(plants[0].id);
        if (ev.length) setActiveFile(ev[0].id);
      } catch (problem) {
        toast.error("Could not load your workspace", (problem as Error).message);
      }
    })();
  }, []);

  useEffect(() => { if (selected) loadRecords(selected); }, [selected, loadRecords]);

  async function createPlant() {
    try {
      const plant = await api<Installation>("/installations", { body: { name: newName.trim() } });
      setInstallations((all) => [...all, plant]);
      setSelected(plant.id);
      setNewName("");
      toast.success("Plant created", plant.name);
    } catch (problem) {
      toast.error("Could not create the plant", (problem as Error).message);
    }
  }

  async function addRecord(record: NewRecord) {
    try {
      await api("/records", { body: {
        installation_id: selected, ...record, valid_from: start, valid_to: end,
        evidence_id: activeFile,
      }});
      await loadRecords(selected!);
      toast.success("Added to the ledger", `${record.name}: ${record.amount} ${record.unit}`);
    } catch (problem) {
      toast.error("Could not add the record", (problem as Error).message);
      throw problem;
    }
  }

  async function correct(record: ActivityRecord, amount: string) {
    try {
      await api(`/records/${record.id}/correct`, { body: { new_amount: amount, evidence_id: record.evidence_id } });
      await loadRecords(selected!);
      toast.success("Correction recorded", "The old value stays in the history.");
    } catch (problem) {
      toast.error("Could not correct the record", (problem as Error).message);
      throw problem;
    }
  }

  async function calculate(choice: PrecursorChoice | null) {
    try {
      const precursors = choice ? [{
        material_name: "steel", tonnes: choice.tonnes, cn_code: choice.cnCode,
        upstream_statement_id: choice.upstream?.id ?? null,
        upstream_product: choice.upstream ? choice.product : null,
      }] : [];
      const statement = await api<Statement>("/statements", { body: {
        installation_id: selected, period_start: start, period_end: end, precursors,
      }});
      navigate(`/statements/${statement.id}`);
    } catch (problem) {
      toast.error("The calculation could not run", (problem as Error).message);
      throw problem;
    }
  }

  const hasOutput = records.some((r) => r.kind === "output");
  const hasFuel = records.some((r) => r.kind === "fuel");
  const steps = [
    { label: "Plant", done: installations.length > 0 },
    { label: "Evidence", done: files.length > 0 },
    { label: "Data", done: hasOutput && hasFuel },
    { label: "Calculate", done: false },
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <span className="eyebrow">Plant workspace</span>
          <h1 className="serif page-title">Build a statement your buyer can trust.</h1>
        </div>
        {installations.length > 0 && (
          <select className="input" style={{ width: 240 }} value={selected ?? ""}
            onChange={(e) => setSelected(Number(e.target.value))}>
            {installations.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      <ProgressRail steps={steps} />

      <Reveal>
        <div className="card stack">
          <h3>1. Your plant</h3>
          <p className="muted">The production site CBAM measures. Add one to begin.</p>
          <div className="row">
            <input className="input grow" placeholder="e.g. Pune forging plant" value={newName}
              onChange={(e) => setNewName(e.target.value)} />
            <Button variant="ghost" disabledReason={newName.trim() ? undefined : "Type a plant name."}
              onClick={createPlant}><Icon name="plus" size={16} />Add plant</Button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="card stack">
          <h3>2. Evidence</h3>
          <p className="muted">Every number needs a source document. Try the sample invoice from fixtures/sample_documents.</p>
          <EvidenceDropzone files={files} activeId={activeFile}
            onUploaded={(f) => { setFiles((all) => [f, ...all.filter((x) => x.id !== f.id)]); setActiveFile(f.id); }}
            onPick={setActiveFile} />
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="card stack">
          <h3>3. Confirmed data</h3>
          <div className="row">
            <div className="field"><label>Period from</label>
              <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="field"><label>Period to</label>
              <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <DataComposer hasPlant={selected !== null} hasEvidence={activeFile !== null} onAdd={addRecord} />
          <RecordsBoard records={records} onCorrect={correct} />
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <motion.div className="card stack">
          <h3>4. Calculate</h3>
          <BuildPanel incoming={incoming}
            blockedReason={!hasOutput ? "Add at least one product you made (kind: output)." : !hasFuel ? "Add the fuel you burned." : undefined}
            onCalculate={calculate} />
        </motion.div>
      </Reveal>
    </div>
  );
}
