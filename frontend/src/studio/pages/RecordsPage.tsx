// studio/pages/RecordsPage.tsx
// Everything that is kept as evidence, in three plain tabs:
//   Ledger    the records, and what they said on any past date
//   Evidence  the documents, each stored under its fingerprint
//   Audit     the tamper evident log of what your organization did
// Nothing here is ever edited or deleted. Corrections add new rows.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import type { AuditLog, EvidenceRow, Installation, LedgerRow } from "../../api/types";
import { actionLabel, bytes, dateTime, quarterOf, shortHash } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { DropVault } from "../parts/DropVault";
import { Identicon } from "../parts/Identicon";

type Tab = "ledger" | "evidence" | "audit";
const unitLabel = (u: string) => (u === "tonne" ? "t" : u.toUpperCase());
const text = (r: LedgerRow) => `${r.name.replace("_", " ")} ${Number(r.amount).toLocaleString("en-IN")} ${unitLabel(r.unit)}`;

function Ledger() {
  const toast = useToast();
  const [plants, setPlants] = useState<Installation[]>([]);
  const [plant, setPlant] = useState<number | null>(null);
  const [rows, setRows] = useState<LedgerRow[] | null>(null);
  const [index, setIndex] = useState(-1);

  useEffect(() => { api<Installation[]>("/installations").then((p) => { setPlants(p); if (p.length) setPlant(p[0].id); }); }, []);
  useEffect(() => {
    if (plant === null) return;
    setRows(null);
    api<LedgerRow[]>(`/installations/${plant}/ledger`).then((r) => { setRows(r); setIndex(-1); }).catch((e) => toast.error("Could not load the ledger", (e as Error).message));
  }, [plant]);

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
      const fix = rows.find((r) => g.includes(r.recorded_at) && r.supersedes_id);
      const qs = [...new Set(rows.filter((r) => g.includes(r.recorded_at)).map((r) => quarterOf(r.valid_from)))];
      return { at: g[g.length - 1], label: `${fix ? `Corrected ${fix.name.replace("_", " ")}` : `${qs.join(", ")} entered`}, ${dateTime(g[g.length - 1])}` };
    });
  }, [rows]);

  const at = index === -1 ? moments.length - 1 : index;
  const asOf = moments[at]?.at;
  const known = (rows ?? []).filter((r) => asOf && r.recorded_at <= asOf);
  const replacedNow = new Set(known.map((r) => r.supersedes_id).filter(Boolean));
  const later = new Map((rows ?? []).filter((r) => r.supersedes_id).map((r) => [r.supersedes_id!, r]));
  const quarters = useMemo(() => {
    const map = new Map<string, LedgerRow[]>();
    for (const r of known) if (!replacedNow.has(r.id)) map.set(quarterOf(r.valid_from), [...(map.get(quarterOf(r.valid_from)) ?? []), r]);
    return [...map.entries()].sort();
  }, [rows, asOf]);

  return (
    <div>
      <div className="chips">{plants.map((p) => <button key={p.id} className={`chip ${plant === p.id ? "on" : ""}`} onClick={() => setPlant(p.id)}>{p.name}</button>)}</div>
      {!rows ? <div className="skeleton" style={{ height: 200, marginTop: 24 }} /> : (
        <>
          <label className="field" style={{ marginTop: 24, maxWidth: 520 }}>Show the ledger as it stood after
            <select className="select" value={at} onChange={(e) => setIndex(Number(e.target.value))}>{moments.map((m, i) => <option key={m.at} value={i}>{m.label}</option>)}</select></label>
          <div className="cols">
            {quarters.map(([q, items]) => (
              <div key={q} className="col"><span className="kicker">{q}</span>
                {items.map((r) => {
                  const fixed = later.get(r.id);
                  const corrected = fixed && asOf !== undefined && fixed.recorded_at > asOf;
                  return <div key={r.id} className="item"><span className={corrected ? "strike" : ""}>{text(r)}</span>
                    {corrected && <span className="note">later corrected to {text(fixed!)}</span>}{r.supersedes_id && <span className="note">replaces #{r.supersedes_id}</span>}</div>;
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Evidence() {
  const toast = useToast();
  const [rows, setRows] = useState<EvidenceRow[] | null>(null);
  const [res, setRes] = useState<Record<number, boolean | "busy">>({});
  const load = () => api<EvidenceRow[]>("/evidence").then(setRows).catch((e) => toast.error("Could not load evidence", (e as Error).message));
  useEffect(() => { load(); }, []);

  async function verify(id: number) {
    setRes((r) => ({ ...r, [id]: "busy" }));
    try { const out = await api<{ intact: boolean }>(`/evidence/${id}/verify`, { method: "POST" }); setRes((r) => ({ ...r, [id]: out.intact })); }
    catch (e) { toast.error("Verification failed", (e as Error).message); setRes((r) => { const { [id]: _x, ...rest } = r; return rest; }); }
  }

  return (
    <div>
      <DropVault onUploaded={() => load()} />
      <div className="actions" style={{ margin: "22px 0 4px", justifyContent: "space-between" }}>
        <span className="kicker">{rows?.length ?? 0} documents</span>
        <button className="btn-text" disabled={!rows?.length} onClick={async () => { for (const r of rows ?? []) await verify(r.id); toast.success("Every file re-verified"); }}>Verify all</button>
      </div>
      {!rows ? <div className="skeleton" style={{ height: 160 }} /> : rows.map((r) => (
        <div key={r.id} className="file-row">
          <Identicon hash={r.sha256} size={28} />
          <span>{r.filename}<span className="soft" style={{ display: "block", fontSize: 12.5 }}>{bytes(r.size_bytes)}, used by {r.used_by_records} records</span></span>
          <span className="mono">{shortHash(r.sha256, 10)}</span>
          {res[r.id] === undefined ? <button className="btn-line" onClick={() => verify(r.id)}>Verify</button>
            : res[r.id] === "busy" ? <span className="soft">Checking...</span>
            : <span className="qstate"><i className={`dot ${res[r.id] ? "good" : "bad"}`} />{res[r.id] ? "Intact" : "Changed"}</span>}
        </div>
      ))}
    </div>
  );
}

function Audit() {
  const toast = useToast();
  const [log, setLog] = useState<AuditLog | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api<AuditLog>("/audit?limit=200").then(setLog).catch((e) => toast.error("Could not load the log", (e as Error).message));
  useEffect(() => { load(); }, []);
  async function verify() { setBusy(true); await load(); setBusy(false); toast.success("Chain checked", "Every link matches."); }

  return (
    <div>
      <div className="status-line">
        <span><i className={`dot ${log ? (log.intact ? "good" : "bad") : ""}`} />{log ? (log.intact ? "Chain intact" : `Chain broken at entry ${log.first_bad_entry}`) : "Checking"}{log ? `, ${log.total_entries} entries` : ""}</span>
        <button className="btn-line" disabled={busy} onClick={verify}>{busy ? "Checking..." : "Verify the chain"}</button>
      </div>
      <p className="soft" style={{ marginBottom: 14 }}>Each entry stores the hash of the one before it. Change an old entry and every later link breaks.</p>
      {!log ? <div className="skeleton" style={{ height: 200 }} /> : log.entries.map((e) => (
        <div key={e.id} className="entry"><span>{actionLabel(e.action)}<span className="soft">{e.detail}</span></span><span className="mono">{dateTime(e.at)}</span><span className="mono">{e.hash}</span></div>
      ))}
    </div>
  );
}

export function RecordsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "ledger";
  const tabs: [Tab, string][] = [["ledger", "Ledger"], ["evidence", "Evidence"], ["audit", "Audit"]];
  return (
    <div>
      <div className="head"><span className="kicker">Records</span><h1 className="title">Kept as evidence.</h1>
        <p className="lead">Nothing here is edited or deleted. A correction adds a new row.</p></div>
      <div className="tabs">{tabs.map(([k, label]) => <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setParams({ tab: k })}>{label}{tab === k && <i />}</button>)}</div>
      {tab === "ledger" && <Ledger />}{tab === "evidence" && <Evidence />}{tab === "audit" && <Audit />}
    </div>
  );
}
