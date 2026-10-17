// studio/pages/StatementsPage.tsx
// Statements, as a timeline rather than a list. Each plant and product
// is a lane. Each quarter is a node on that lane, with its emissions
// per tonne inside it. The ring around a node says what state it is
// in:
//   green ring   verified
//   amber ring   signed, waiting for a verifier
//   red pulse    out of date, an upstream number changed
//   grey ring    draft, not signed yet
// Hover a node for the detail. Click to open the statement.
//
// Why a timeline: the question people really ask is "where do I
// stand, quarter by quarter, and what is stuck". A grid of identical
// cards hides that. Lanes and rings show it at a glance.

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { Statement } from "../../api/types";
import { quarterOf } from "../../lib/format";
import { Icon } from "../../ui/Icons";
import { useToast } from "../../ui/Toast";

const QUARTERS = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"];
const productOf = (s: Statement) => Object.keys(s.see_by_product)[0];
const seeOf = (s: Statement) => Number(s.see_by_product[productOf(s)]);
const defOf = (s: Statement) => Number(s.default_see_by_product?.[productOf(s)] ?? 0);

function stateOf(s: Statement): { key: string; label: string } {
  if (s.status === "stale") return { key: "stale", label: "Out of date" };
  if (s.verified) return { key: "verified", label: "Verified" };
  if (s.status === "signed") return { key: "awaiting", label: "Awaiting verifier" };
  return { key: "draft", label: "Draft" };
}

function Node({ s, index }: { s: Statement; index: number }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const state = stateOf(s);
  const cut = defOf(s) > 0 ? Math.round((1 - seeOf(s) / defOf(s)) * 100) : 0;
  return (
    <div className="tl-cell">
      <motion.button className={`tl-node ${state.key}`} onClick={() => navigate(`/statements/${s.id}`)}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}
        initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + index * 0.07, type: "spring", stiffness: 220, damping: 18 }}
        whileHover={{ scale: 1.08 }} aria-label={`Statement ${s.id}, ${seeOf(s).toFixed(2)} tCO2 per tonne, ${state.label}`}>
        <span className="tl-num">{seeOf(s).toFixed(2)}</span>
        {state.key === "stale" && <i className="tl-pulse" />}
      </motion.button>
      <span className="tl-cut mono">{cut > 0 ? `-${cut}%` : "default"}</span>
      <AnimatePresence>
        {hover && (
          <motion.div className="tl-tip" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <span className="mono kicker">#{s.id} / {state.label}</span>
            <strong>{productOf(s).replace("_", " ")}</strong>
            <span>EU default {defOf(s) ? defOf(s).toFixed(2) : "n/a"}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Lanes({ rows, title }: { rows: Statement[]; title?: string }) {
  const lanes = useMemo(() => {
    const map = new Map<string, Statement[]>();
    for (const s of rows) {
      const key = `${s.supplier}|${s.installation}|${productOf(s)}`;
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()].map(([key, list]) => ({ key, list, head: key.split("|") }));
  }, [rows]);
  if (lanes.length === 0) return null;
  let counter = 0;
  return (
    <div className="lanes">
      {title && <span className="kicker mono lanes-title">{title}</span>}
      <div className="lane-head">
        <span />{QUARTERS.map((q) => <span key={q} className="mono">{q.split(" ")[0]}</span>)}
      </div>
      {lanes.map((lane) => (
        <div key={lane.key} className="lane-row">
          <div className="lane-label">
            <strong>{lane.head[2].replace("_", " ")}</strong>
            <span>{lane.head[1]}</span>
            <span className="mono">{lane.head[0]}</span>
          </div>
          <div className="lane-track">
            <i className="lane-line" />
            {QUARTERS.map((q) => {
              const s = [...lane.list].reverse().find((x) => quarterOf(x.period_start) === q);
              return s ? <Node key={q} s={s} index={counter++} /> : <div key={q} className="tl-cell"><span className="tl-empty" /></div>;
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
    try {
      const rebuilt = await api<Statement[]>("/statements/recompute", { method: "POST" });
      toast.success("Recomputed", `${rebuilt.length} statement(s) updated.`);
      await load();
    } catch (e) { toast.error("Recompute failed", (e as Error).message); }
    finally { setBusy(false); }
  }

  if (!me) return null;
  const all = mine ?? [];
  const stale = all.filter((s) => s.status === "stale").length;
  const verified = all.filter((s) => s.verified).length;
  const awaiting = all.filter((s) => s.status === "signed" && !s.verified).length;
  const own = me.role === "supplier" ? all : all;

  return (
    <div>
      <div className="stage-head">
        <span className="kicker mono">{me.organization_name}</span>
        <h1 className="stage-title">{me.role === "importer" ? "Your suppliers, quarter by quarter." : me.role === "verifier" ? "The queue, quarter by quarter." : "Your statements, quarter by quarter."}</h1>
        <div className="row-chips">
          <span className="chip good"><i />{verified} verified</span>
          <span className="chip warn"><i />{awaiting} awaiting a verifier</span>
          {stale > 0 && <span className="chip bad"><i />{stale} out of date</span>}
        </div>
      </div>

      {stale > 0 && me.role === "supplier" && (
        <motion.div className="stale-bar" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <span className="tl-pulse-dot" /> An upstream supplier changed a number. Some statements are out of date.
          <button className="pill-btn ember" disabled={busy} onClick={recompute}><Icon name="refresh" size={15} />{busy ? "Recomputing" : "Recompute"}</button>
        </motion.div>
      )}

      {!mine ? <div className="skeleton" style={{ height: 320 }} /> : all.length === 0 && incoming.length === 0 ? (
        <div className="empty-stage"><Icon name="flame" size={30} /><p>Nothing here yet.</p></div>
      ) : (
        <>
          <Lanes rows={own} title={me.role === "supplier" ? "YOURS" : undefined} />
          {incoming.length > 0 && <Lanes rows={incoming} title="FROM YOUR SUPPLIERS" />}
        </>
      )}
      <div className="tl-legend mono">
        <span><i className="verified" />verified</span><span><i className="awaiting" />awaiting verifier</span>
        <span><i className="stale" />out of date</span><span><i className="draft" />draft</span>
      </div>
    </div>
  );
}
