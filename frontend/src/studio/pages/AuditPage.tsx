// studio/pages/AuditPage.tsx
// The audit chain. Every important action your organization takes is
// written to a log in which each entry stores the hash of the entry
// before it, like links in a chain. Change or delete any old entry and
// every later link stops matching.
//
// At the top, one ring: "Verify" asks the server to walk the whole
// chain and report the first broken link, if any. Below, the chain
// itself, newest first, each block drawn from its own hash.

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type { AuditLog } from "../../api/types";
import { actionLabel, dateTime } from "../../lib/format";
import { Icon } from "../../ui/Icons";
import { useToast } from "../../ui/Toast";
import { Identicon } from "../parts/Identicon";

export function AuditPage() {
  const toast = useToast();
  const [log, setLog] = useState<AuditLog | null>(null);
  const [filter, setFilter] = useState("all");
  const [checking, setChecking] = useState(false);

  const load = () => api<AuditLog>("/audit?limit=200").then(setLog).catch((e) => toast.error("Could not load the chain", (e as Error).message));
  useEffect(() => { load(); }, []);

  async function verify() {
    setChecking(true);
    await Promise.all([load(), new Promise((d) => setTimeout(d, 1400))]);
    setChecking(false);
    toast.success("Chain verified", "Every link matches.");
  }

  const actions = useMemo(() => [...new Set(log?.entries.map((e) => e.action) ?? [])], [log]);
  const shown = (log?.entries ?? []).filter((e) => filter === "all" || e.action === filter);

  function exportCsv() {
    const lines = ["id,time,actor,action,detail,hash", ...shown.map((e) => `${e.id},${e.at},${e.actor},${e.action},"${e.detail}",${e.hash}`)];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "temper-activity.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="audit-top">
        <div className="stage-head" style={{ marginBottom: 0 }}>
          <span className="kicker mono">AUDIT CHAIN</span>
          <h1 className="stage-title">Nothing happens off the record.</h1>
          <p className="stage-sub">{log ? `${log.total_entries} entries, each hashed with the one before it.` : ""}</p>
          <div className="row-chips">
            <button className="pill-btn ember" onClick={verify} disabled={checking}><Icon name="shield" size={15} />{checking ? "Walking the chain" : "Verify the chain"}</button>
            <button className="pill-btn ghost" onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
          </div>
        </div>
        <div className={`ring-big ${log?.intact === false ? "bad" : ""}`}>
          <svg viewBox="0 0 160 160" aria-hidden>
            <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
            <motion.circle cx="80" cy="80" r="70" fill="none" stroke={log?.intact === false ? "#ff6b5e" : "#3fd9a0"} strokeWidth="4" strokeLinecap="round" strokeDasharray="440"
              initial={{ strokeDashoffset: 440 }} animate={{ strokeDashoffset: checking ? [440, 0] : log ? 0 : 440 }} transition={{ duration: checking ? 1.4 : 1.6 }} transform="rotate(-90 80 80)" />
          </svg>
          <div className="ring-text"><strong>{log ? (log.intact ? "Intact" : `Broken at #${log.first_bad_entry}`) : "..."}</strong><span className="mono">CHAIN STATE</span></div>
        </div>
      </div>

      <div className="row-chips" style={{ margin: "34px 0 10px" }}>
        <button className={`chip ${filter === "all" ? "ember" : ""}`} style={{ cursor: "pointer", background: "transparent" }} onClick={() => setFilter("all")}>All</button>
        {actions.map((a) => <button key={a} className={`chip ${filter === a ? "ember" : ""}`} style={{ cursor: "pointer", background: "transparent" }} onClick={() => setFilter(a)}>{actionLabel(a)}</button>)}
      </div>

      <div className="chain">
        {!log && <div className="skeleton" style={{ height: 240 }} />}
        {shown.map((e, i) => (
          <motion.div key={e.id} className="link" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 14) * 0.035 }}>
            <span className="link-rail" aria-hidden><i /></span>
            <Identicon hash={e.hash} size={40} color="#3fd9a0" />
            <div className="link-body"><strong>{actionLabel(e.action)}</strong><span>{e.detail}</span></div>
            <span className="mono link-meta">{e.actor}<br />{dateTime(e.at)}</span>
            <code>{e.hash}</code>
          </motion.div>
        ))}
        {log && shown.length === 0 && <p className="muted-light">No entries match.</p>}
      </div>
    </div>
  );
}
