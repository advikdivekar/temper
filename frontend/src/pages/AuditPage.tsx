// pages/AuditPage.tsx
// The activity log, with proof it has not been edited.
//
// Each entry stores the hash of the entry before it, like links in a
// chain. Change or delete any old entry and every later hash stops
// matching. "Re-verify" asks the server to walk the whole chain and
// report the first broken link, if any.

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { AuditLog } from "../api/types";
import { actionLabel, dateTime } from "../lib/format";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icons";
import { PageHead } from "../ui/PageHead";
import { Pill } from "../ui/Pill";
import { useToast } from "../ui/Toast";

export function AuditPage() {
  const toast = useToast();
  const [log, setLog] = useState<AuditLog | null>(null);
  const [filter, setFilter] = useState("all");
  const [checking, setChecking] = useState(false);

  const load = () => api<AuditLog>("/audit?limit=200").then(setLog).catch((e) => toast.error("Could not load the log", (e as Error).message));
  useEffect(() => { load(); }, []);

  async function recheck() {
    setChecking(true);
    await Promise.all([load(), new Promise((done) => setTimeout(done, 900))]);
    setChecking(false);
    toast.success("Chain re-verified", "Every link matches.");
  }

  const actions = useMemo(() => [...new Set(log?.entries.map((e) => e.action) ?? [])], [log]);
  const shown = (log?.entries ?? []).filter((e) => filter === "all" || e.action === filter);

  function exportCsv() {
    const lines = ["id,time,actor,action,detail,hash", ...shown.map((e) => `${e.id},${e.at},${e.actor},${e.action},"${e.detail}",${e.hash}`)];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "temper-activity.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <PageHead eyebrow="Audit log" title="Nothing happens off the record."
        description="A tamper evident, hash chained log of everything your organization did."
        actions={<><Button variant="ghost" onClick={exportCsv} disabledReason={shown.length ? undefined : "Nothing to export."}>Export CSV</Button>
          <Button variant="ember" loading={checking} onClick={recheck}><Icon name="shield" size={16} />Re-verify chain</Button></>} />

      {log && (
        <motion.div className={`card integrity ${log.intact ? "ok" : "bad"}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <span className="integrity-icon"><Icon name={log.intact ? "check" : "x"} size={22} /></span>
          <div><strong>{log.intact ? "Chain intact" : `Chain broken at entry #${log.first_bad_entry}`}</strong>
            <div className="muted">{log.total_entries} entries across the platform, each hashed with the one before it.</div></div>
        </motion.div>
      )}

      <div className="card">
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <h3>Your organization's entries</h3>
          <select className="input" style={{ width: 240 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
          </select>
        </div>
        {!log ? <div className="skeleton" style={{ height: 240 }} /> : (
          <div className="chain-log">
            {shown.map((e, i) => (
              <motion.div key={e.id} className="chain-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
                <span className="mono idx">#{e.id}</span>
                <div><strong>{actionLabel(e.action)}</strong><div className="muted">{e.detail}</div></div>
                <span className="muted">{e.actor}</span>
                <span className="mono muted">{dateTime(e.at)}</span>
                <Pill>{e.hash}</Pill>
              </motion.div>
            ))}
            {shown.length === 0 && <p className="muted">No entries match.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
