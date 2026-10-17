// studio/pages/StatementsPage.tsx
// Statements, quarter by quarter. Each plant and product is a heading
// with four quarter cells under it. Each cell holds the number and one
// plain word for its state (verified, awaiting a verifier, out of date,
// draft), with a coloured dot. Click a cell to open the statement.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { Statement } from "../../api/types";
import { quarterOf } from "../../lib/format";
import { useToast } from "../../ui/Toast";

const QUARTERS = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"];
const productOf = (s: Statement) => Object.keys(s.see_by_product)[0];
const seeOf = (s: Statement) => Number(s.see_by_product[productOf(s)]);
const defOf = (s: Statement) => Number(s.default_see_by_product?.[productOf(s)] ?? 0);

function state(s: Statement) {
  if (s.status === "stale") return { tone: "bad", label: "Out of date" };
  if (s.verified) return { tone: "good", label: "Verified" };
  if (s.status === "signed") return { tone: "warn", label: "Awaiting a verifier" };
  return { tone: "", label: "Draft" };
}

function Lanes({ rows, title }: { rows: Statement[]; title?: string }) {
  const lanes = useMemo(() => {
    const map = new Map<string, Statement[]>();
    for (const s of rows) { const key = `${s.supplier}|${s.installation}|${productOf(s)}`; map.set(key, [...(map.get(key) ?? []), s]); }
    return [...map.entries()].map(([key, list]) => ({ key, list, head: key.split("|") }));
  }, [rows]);
  if (!lanes.length) return null;
  return (
    <div>
      {title && <span className="kicker" style={{ display: "block", marginTop: 36 }}>{title}</span>}
      {lanes.map((lane) => (
        <div key={lane.key} className="lane">
          <div className="lane-title"><h2>{lane.head[2].replace("_", " ")}</h2><span className="kicker">{lane.head[1]} / {lane.head[0]}</span></div>
          <div className="quarters">
            {QUARTERS.map((q) => {
              const s = [...lane.list].reverse().find((x) => quarterOf(x.period_start) === q);
              if (!s) return <div key={q} className="qcell"><span className="kicker">{q.split(" ")[0]}</span><span className="qnote">No statement</span></div>;
              const st = state(s), cut = defOf(s) > 0 ? Math.round((1 - seeOf(s) / defOf(s)) * 100) : 0;
              return (
                <Link key={q} to={`/statements/${s.id}`} className="qcell">
                  <span className="kicker">{q.split(" ")[0]}</span>
                  <span className="qnum">{seeOf(s).toFixed(2)}</span>
                  <span className="qstate"><i className={`dot ${st.tone}`} />{st.label}</span>
                  <span className="qnote">{cut > 0 ? `${cut}% below default` : "at the default"}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatementsPage() {
  const { me } = useAuth();
  const toast = useToast();
  const [mine, setMine] = useState<Statement[] | null>(null);
  const [incoming, setIncoming] = useState<Statement[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMine(await api<Statement[]>("/statements"));
      if (me?.role === "supplier") setIncoming(await api<Statement[]>("/statements/incoming"));
    } catch (e) { toast.error("Could not load statements", (e as Error).message); setMine([]); }
  }, [me?.role]);
  useEffect(() => { load(); }, [load]);

  async function recompute() {
    setBusy(true);
    try { const r = await api<Statement[]>("/statements/recompute", { method: "POST" }); toast.success("Recomputed", `${r.length} statement(s) updated.`); await load(); }
    catch (e) { toast.error("Recompute failed", (e as Error).message); }
    finally { setBusy(false); }
  }

  if (!me) return null;
  const all = mine ?? [];
  const stale = all.filter((s) => s.status === "stale").length;
  const verified = all.filter((s) => s.verified).length;
  const awaiting = all.filter((s) => s.status === "signed" && !s.verified).length;

  return (
    <div>
      <div className="head">
        <span className="kicker">{me.organization_name}</span>
        <h1 className="title">{me.role === "verifier" ? "Statements to review." : me.role === "importer" ? "Your suppliers, quarter by quarter." : "Your statements, quarter by quarter."}</h1>
        <p className="lead">{verified} verified, {awaiting} awaiting a verifier{stale ? `, ${stale} out of date` : ""}.</p>
      </div>
      {stale > 0 && me.role === "supplier" && (
        <div className="notice">An upstream supplier changed a number, so some statements are out of date.
          <button className="btn-solid" disabled={busy} onClick={recompute}>{busy ? "Recomputing..." : "Recompute"}</button></div>
      )}
      {!mine ? <div className="skeleton" style={{ height: 300 }} /> : all.length === 0 && incoming.length === 0 ? <p className="row-empty">Nothing here yet.</p> : (
        <>
          <Lanes rows={all} title={me.role === "supplier" ? "YOURS" : undefined} />
          {incoming.length > 0 && <Lanes rows={incoming} title="FROM YOUR SUPPLIERS" />}
        </>
      )}
    </div>
  );
}
