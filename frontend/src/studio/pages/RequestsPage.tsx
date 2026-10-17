// studio/pages/RequestsPage.tsx
// Requests between companies: ask a supplier to share or verify
// something, and answer what your customers ask of you. This is the
// supplier invitation loop in the product.
//
// Each request is a large line, not a form: who it is with, what they
// need, and a round button to mark it done. A pill at the bottom opens
// a sheet to send a new one.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { Organization, RequestRow } from "../../api/types";
import { timeAgo } from "../../lib/format";
import { Icon } from "../../ui/Icons";
import { useToast } from "../../ui/Toast";
import { Sheet } from "../parts/Sheet";

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
  const count = (d: "incoming" | "outgoing") => (rows ?? []).filter((r) => r.status === "open" && r.direction === d).length;

  return (
    <div>
      <div className="stage-head">
        <span className="kicker mono">REQUESTS</span>
        <h1 className="stage-title">Ask. Share. Close the gap.</h1>
        <div className="seg-line">
          {(["incoming", "outgoing", "resolved"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
              {t === "outgoing" ? "Sent" : t[0].toUpperCase() + t.slice(1)}{t !== "resolved" && count(t) > 0 && <b>{count(t)}</b>}
              {tab === t && <motion.i layoutId="req-line" />}
            </button>
          ))}
        </div>
      </div>

      <div className="req-list">
        <AnimatePresence mode="popLayout">
          {list.map((r, i) => (
            <motion.div layout key={r.id} className="req" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ delay: i * 0.05 }}>
              <div className="req-main">
                <span className="mono kicker">{r.direction === "incoming" ? "FROM" : "TO"} {r.other_role.toUpperCase()} · {r.kind.toUpperCase()} · {timeAgo(r.created_at).toUpperCase()}</span>
                <strong className="req-who">{r.other}</strong>
                <p>{r.message || "No message."}</p>
                {r.statement_id && <Link to={`/statements/${r.statement_id}`} className="link-btn">Open statement #{r.statement_id}</Link>}
              </div>
              {r.status === "open" && <button className="req-done" onClick={() => resolve(r.id)} aria-label="Mark resolved"><Icon name="check" size={18} /></button>}
            </motion.div>
          ))}
        </AnimatePresence>
        {rows && list.length === 0 && <p className="muted-light req-empty">Nothing here.</p>}
      </div>

      <div className="dock"><button className="dock-btn primary" onClick={() => setOpen(true)}><Icon name="plus" size={15} />New request</button></div>
      <Sheet open={open} title="NEW REQUEST" onClose={() => setOpen(false)}>
        <div className="share-list">
          {orgs.map((o) => (
            <button key={o.id} className={`source ${to === String(o.id) ? "on" : ""}`} onClick={() => setTo(String(o.id))}><strong>{o.name}</strong><span className="mono">{o.role}</span></button>
          ))}
        </div>
        <div className="seg-line">{["verify", "share", "update"].map((k) => <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{k === "verify" ? "Get it verified" : k === "share" ? "Share a statement" : "Updated number"}{kind === k && <motion.i layoutId="kind2" />}</button>)}</div>
        <input className="sheet-input" placeholder="What do you need, and by when?" value={message} onChange={(e) => setMessage(e.target.value)} />
        <button className="pill-btn ember" disabled={!to} onClick={send} style={{ alignSelf: "flex-start" }}>Send request</button>
      </Sheet>
    </div>
  );
}
