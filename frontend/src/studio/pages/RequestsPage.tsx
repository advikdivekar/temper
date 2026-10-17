// studio/pages/RequestsPage.tsx
// Requests between companies: ask a supplier to share or verify
// something, and answer what your customers ask of you.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { Organization, RequestRow } from "../../api/types";
import { timeAgo } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Modal } from "../parts/Modal";

type Tab = "incoming" | "outgoing" | "resolved";

export function RequestsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<RequestRow[] | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [tab, setTab] = useState<Tab>("incoming");
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [kind, setKind] = useState("verify");
  const [message, setMessage] = useState("");

  const load = () => api<RequestRow[]>("/requests").then(setRows);
  useEffect(() => { load().catch((e) => toast.error("Could not load requests", (e as Error).message)); api<Organization[]>("/auth/organizations").then(setOrgs); }, []);

  async function send() {
    try { await api("/requests", { body: { to_org_id: Number(to), kind, message } }); setMessage(""); setTo(""); setOpen(false); await load(); setTab("outgoing"); toast.success("Request sent"); }
    catch (e) { toast.error("Could not send", (e as Error).message); }
  }
  async function resolve(id: number) {
    try { await api(`/requests/${id}/resolve`, { method: "POST" }); await load(); toast.success("Marked resolved"); }
    catch (e) { toast.error("Could not resolve", (e as Error).message); }
  }

  const list = (rows ?? []).filter((r) => (tab === "resolved" ? r.status === "resolved" : r.status === "open" && r.direction === tab));
  const n = (d: "incoming" | "outgoing") => (rows ?? []).filter((r) => r.status === "open" && r.direction === d).length;

  return (
    <div>
      <div className="head"><span className="kicker">Requests</span><h1 className="title">Ask. Share. Close the gap.</h1>
        <div className="actions" style={{ marginTop: 14 }}><button className="btn-solid" onClick={() => setOpen(true)}>New request</button></div></div>
      <div className="tabs">{(["incoming", "outgoing", "resolved"] as Tab[]).map((t) => (
        <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t === "outgoing" ? "Sent" : t[0].toUpperCase() + t.slice(1)}{t !== "resolved" && n(t) > 0 ? ` (${n(t)})` : ""}{tab === t && <i />}</button>))}</div>
      {list.map((r) => (
        <div key={r.id} className="req">
          <div><span className="kicker">{r.direction === "incoming" ? "From" : "To"} {r.other_role} / {r.kind} / {timeAgo(r.created_at)}</span>
            <h3>{r.other}</h3><p className="soft">{r.message || "No message."}</p>
            {r.statement_id && <Link to={`/statements/${r.statement_id}`} className="link-inline">Open statement #{r.statement_id}</Link>}</div>
          {r.status === "open" && <button className="btn-line" onClick={() => resolve(r.id)}>Mark resolved</button>}
        </div>
      ))}
      {rows && list.length === 0 && <p className="row-empty">Nothing here.</p>}

      <Modal open={open} title="New request" onClose={() => setOpen(false)}>
        <div className="choice-list">{orgs.map((o) => <button key={o.id} className={`choice-row ${to === String(o.id) ? "on" : ""}`} onClick={() => setTo(String(o.id))}><span>{o.name}</span><span className="kicker">{o.role}</span></button>)}</div>
        <div className="chips">{[["verify", "Get it verified"], ["share", "Share a statement"], ["update", "Updated number"]].map(([k, l]) => <button key={k} className={`chip ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>{l}</button>)}</div>
        <input className="input" placeholder="What do you need, and by when?" value={message} onChange={(e) => setMessage(e.target.value)} />
        <button className="btn-solid ember" disabled={!to} style={{ alignSelf: "flex-start" }} onClick={send}>Send request</button>
      </Modal>
    </div>
  );
}
