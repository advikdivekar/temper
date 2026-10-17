// pages/PlantPage.tsx
// Supplier workspace: describe the plant, upload evidence, enter
// confirmed records, then build an emissions statement.
//
// Flow: installation -> upload a bill -> add records that point at
// the bill -> build a statement for a period.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { ActivityRecord, Installation, Statement } from "../api/types";

export function PlantPage() {
  const navigate = useNavigate();
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [error, setError] = useState("");

  const [plantName, setPlantName] = useState("");
  const [evidenceId, setEvidenceId] = useState<number | null>(null);
  const [kind, setKind] = useState("fuel");
  const [name, setName] = useState("coal");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("tonne");
  const [periodStart, setPeriodStart] = useState("2026-01-01");
  const [periodEnd, setPeriodEnd] = useState("2026-12-31");

  const [steelTonnes, setSteelTonnes] = useState("");
  const [upstreamId, setUpstreamId] = useState("");
  const [upstreamProduct, setUpstreamProduct] = useState("");

  async function loadInstallations() {
    const rows = await api<Installation[]>("/installations");
    setInstallations(rows);
    if (rows.length && selected === null) setSelected(rows[0].id);
  }

  async function loadRecords(id: number) {
    setRecords(await api<ActivityRecord[]>(`/installations/${id}/records`));
  }

  useEffect(() => { loadInstallations(); }, []);
  useEffect(() => { if (selected) loadRecords(selected); }, [selected]);

  async function guard(action: () => Promise<void>) {
    setError("");
    try { await action(); } catch (e) { setError((e as Error).message); }
  }

  const createPlant = () => guard(async () => {
    await api("/installations", { body: { name: plantName } });
    setPlantName("");
    await loadInstallations();
  });

  const upload = (file: File) => guard(async () => {
    const form = new FormData();
    form.append("file", file);
    const result = await api<{ id: number }>("/evidence", { form });
    setEvidenceId(result.id);
  });

  const addRecord = () => guard(async () => {
    if (!selected || !evidenceId) throw new Error("Pick a plant and upload evidence first");
    await api("/records", { body: {
      installation_id: selected, kind, name, amount, unit,
      valid_from: periodStart, valid_to: periodEnd, evidence_id: evidenceId,
    }});
    setAmount("");
    await loadRecords(selected);
  });

  const build = () => guard(async () => {
    if (!selected) return;
    const precursors = steelTonnes ? [{
      material_name: "steel", tonnes: steelTonnes, cn_code: "7208",
      upstream_statement_id: upstreamId ? Number(upstreamId) : null,
      upstream_product: upstreamProduct || null,
    }] : [];
    const statement = await api<Statement>("/statements", { body: {
      installation_id: selected, period_start: periodStart,
      period_end: periodEnd, precursors,
    }});
    navigate(`/statements/${statement.id}`);
  });

  return (
    <div className="stack">
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h3>1. Plant</h3>
        <select value={selected ?? ""} onChange={(e) => setSelected(Number(e.target.value))}>
          {installations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <input placeholder="New plant name" value={plantName}
          onChange={(e) => setPlantName(e.target.value)} />
        <button onClick={createPlant}>Add plant</button>
      </section>

      <section className="card">
        <h3>2. Evidence and records</h3>
        <input type="file" onChange={(e) => e.target.files && upload(e.target.files[0])} />
        {evidenceId && <p>Evidence uploaded (id {evidenceId})</p>}
        <div className="row">
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="fuel">fuel</option>
            <option value="electricity">electricity</option>
            <option value="output">output</option>
          </select>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="coal, grid_india, bolts" />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="amount" />
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="tonne, kwh, gj" />
        </div>
        <button onClick={addRecord}>Add record</button>
        <table>
          <thead><tr><th>Kind</th><th>Name</th><th>Amount</th><th>Unit</th><th>Evidence</th></tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}><td>{r.kind}</td><td>{r.name}</td><td>{r.amount}</td>
                <td>{r.unit}</td><td>#{r.evidence_id}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3>3. Build statement</h3>
        <div className="row">
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        </div>
        <p className="hint">Steel bought (tonnes). Leave an upstream statement id empty to use the EU default.</p>
        <div className="row">
          <input placeholder="Steel tonnes" value={steelTonnes} onChange={(e) => setSteelTonnes(e.target.value)} />
          <input placeholder="Mill statement id" value={upstreamId} onChange={(e) => setUpstreamId(e.target.value)} />
          <input placeholder="Mill product name" value={upstreamProduct} onChange={(e) => setUpstreamProduct(e.target.value)} />
        </div>
        <button onClick={build}>Calculate</button>
      </section>
    </div>
  );
}
