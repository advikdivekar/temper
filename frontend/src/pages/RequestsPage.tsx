// pages/RequestsPage.tsx
// The inbox for data requests between companies. This is how the
// supplier invitation loop works in the product: a bolt maker asks its
// mill to verify a statement, an importer asks a supplier to share
// one. Requests are durable records with a status, not emails.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Organization, RequestRow } from "../api/types";
import { timeAgo } from "../lib/format";
import { Button } from "../ui/Button";
import { PageHead } from "../ui/PageHead";
import { Pill } from "../ui/Pill";
import { Tabs } from "../ui/Tabs";
import { useToast } from "../ui/Toast";

type Tab = "incoming" | "outgoing" | "resolved";

export function RequestsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<RequestRow[] | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [tab, setTab] = useState<Tab>("incoming");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState("share");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api<RequestRow[]>("/requests").then(setRows);
  useEffect(() => {
    load().catch((e) => toast.error("Could not load requests", (e as Error).message));
    api<Organization[]>("/auth/organizations").then(setOrgs);
  }, []);

  async function send() {
    setBusy(true);
    try {
      await api("/requests", { body: { to_org_id: Number(to), kind, message } });
      setMessage(""); setTo("");
      await load();
      toast.success("Request sent");
      setTab("outgoing");
    } catch (e) { toast.error("Could not send", (e as Error).message); }
    finally { setBusy(false); }
  }

  async function resolve(id: number) {
    try { await api(`/requests/${id}/resolve`, { method: "POST" }); await load(); toast.success("Marked resolved"); }
    catch (e) { toast.error("Could not resolve", (e as Error).message); }
  }

  const list = (rows ?? []).filter((r) =>
    tab === "resolved" ? r.status === "resolved" : r.status === "open" && r.direction === tab);
  const count = (d: "incoming" | "outgoing") => (rows ?? []).filter((r) => r.status === "open" && r.direction === d).length;

  return (
    <div className="stack">
      <PageHead eyebrow="Requests" title="Ask. Share. Close the gap."
        description="Request data from the companies in your chain, and respond to requests from your customers." />
      <div className="split-even">
        <div className="stack">
          <Tabs value={tab} onChange={setTab} tabs={[
            { id: "incoming", label: "Incoming", count: count("incoming") },
            { id: "outgoing", label: "Sent", count: count("outgoing") },
            { id: "resolved", label: "Resolved" }]} />
          {!rows && <div className="skeleton" style={{ height: 180 }} />}
          <AnimatePresence mode="popLayout">
            {list.map((r) => (
              <motion.div key={r.id} layout className="card stack" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                <div className="toolbar">
                  <div><strong>{r.direction === "incoming" ? `From ${r.other}` : `To ${r.other}`}</strong>
                    <span className="muted"> · {r.other_role}</span></div>
                  <Pill tone={r.status === "open" ? "warn" : "good"} dot>{r.status}</Pill>
                </div>
                <p>{r.message || "No message."}</p>
                <div className="toolbar">
                  <span className="muted mono">{r.kind} · {timeAgo(r.created_at)}</span>
                  <div className="row">
                    {r.statement_id && <Link className="btn ghost small" to={`/statements/${r.statement_id}`}>Open statement</Link>}
                    {r.status === "open" && <Button size="small" onClick={() => resolve(r.id)}>Mark resolved</Button>}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {rows && list.length === 0 && <div className="card"><p className="muted">Nothing here.</p></div>}
        </div>

        <div className="card stack sticky">
          <span className="eyebrow">New request</span>
          <div className="field"><label>Ask</label>
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Choose a company</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.role})</option>)}
            </select></div>
          <div className="field"><label>Type</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="share">Share a statement</option><option value="verify">Get a statement verified</option>
              <option value="update">Provide an updated number</option></select></div>
          <div className="field"><label>Message</label>
            <textarea className="input" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What do you need, and by when?" /></div>
          <Button variant="ember" loading={busy} disabledReason={to ? undefined : "Choose a company."} onClick={send}>Send request</Button>
        </div>
      </div>
    </div>
  );
}
