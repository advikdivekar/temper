// pages/StatementsPage.tsx
// The list of statements, tuned to each role:
//   supplier  your statements, plus data shared with you by upstream
//             suppliers, and a loud banner when something is stale
//   verifier  a review queue of statements shared for verification
//   importer  a supplier portfolio with headline numbers
//
// Cards enter with a stagger; hover lifts them.

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Statement } from "../api/types";
import { Button } from "../ui/Button";
import { CountUp } from "../ui/CountUp";
import { Icon } from "../ui/Icons";
import { SpotCard } from "../ui/SpotCard";
import { StatePill } from "../ui/StatePill";
import { useToast } from "../ui/Toast";

function StatementCard({ statement, index }: { statement: Statement; index: number }) {
  const navigate = useNavigate();
  const product = Object.keys(statement.see_by_product)[0];
  const actual = Number(statement.see_by_product[product]);
  const defaultSee = Number(statement.default_see_by_product?.[product] ?? 0);
  const longest = Math.max(actual, defaultSee, 0.0001);

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      <SpotCard className="stmt-card" onClick={() => navigate(`/statements/${statement.id}`)}>
        <div className="stmt-top">
          <span className="eyebrow">#{statement.id} · {statement.period_end.slice(0, 4)}</span>
          <StatePill statement={statement} />
        </div>
        <div>
          <strong style={{ fontSize: 17 }}>{statement.supplier}</strong>
          <div className="muted">{statement.installation}</div>
        </div>
        <div className="big-n">{actual.toFixed(2)}<small>tCO2 per tonne of {product.replace("_", " ")}</small></div>
        {defaultSee > 0 && (
          <div className="versus">
            <div className="versus-row" style={{ gridTemplateColumns: "60px 1fr" }}>
              <span>Verified</span>
              <div className="versus-track"><motion.div className="versus-fill" style={{ background: "var(--ember)" }}
                initial={{ width: 0 }} animate={{ width: `${(actual / longest) * 100}%` }} transition={{ delay: 0.4 + index * 0.07, duration: 0.9 }} /></div>
            </div>
            <div className="versus-row" style={{ gridTemplateColumns: "60px 1fr" }}>
              <span>Default</span>
              <div className="versus-track"><motion.div className="versus-fill" style={{ background: "var(--steel)" }}
                initial={{ width: 0 }} animate={{ width: `${(defaultSee / longest) * 100}%` }} transition={{ delay: 0.5 + index * 0.07, duration: 0.9 }} /></div>
            </div>
          </div>
        )}
      </SpotCard>
    </motion.div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: 48 }}>
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }}
        style={{ color: "var(--ember)", marginBottom: 10 }}><Icon name="flame" size={32} /></motion.div>
      <h3>{title}</h3><p className="muted">{text}</p>
    </div>
  );
}

export function StatementsPage() {
  const { me } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [mine, setMine] = useState<Statement[] | null>(null);
  const [incoming, setIncoming] = useState<Statement[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMine(await api<Statement[]>("/statements"));
      if (me?.role === "supplier") setIncoming(await api<Statement[]>("/statements/incoming"));
    } catch (problem) {
      toast.error("Could not load statements", (problem as Error).message);
      setMine([]);
    }
  }, [me?.role]);

  useEffect(() => { load(); }, [load]);

  async function recompute() {
    setBusy(true);
    try {
      const rebuilt = await api<Statement[]>("/statements/recompute", { method: "POST" });
      toast.success("Recomputed", `${rebuilt.length} statement(s) updated.`);
      await load();
    } catch (problem) {
      toast.error("Recompute failed", (problem as Error).message);
    } finally { setBusy(false); }
  }

  if (!me) return null;
  if (mine === null) {
    return <div className="cards">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 240 }} />)}</div>;
  }

  const stale = mine.filter((s) => s.status === "stale");
  const verifiedShare = mine.length ? Math.round((mine.filter((s) => s.verified).length / mine.length) * 100) : 0;
  const cuts = mine.map((s) => {
    const p = Object.keys(s.see_by_product)[0];
    const d = Number(s.default_see_by_product?.[p] ?? 0);
    return d > 0 ? (1 - Number(s.see_by_product[p]) / d) * 100 : 0;
  });
  const avgCut = cuts.length ? Math.round(cuts.reduce((a, b) => a + b, 0) / cuts.length) : 0;

  const heading = me.role === "supplier" ? "Your statements" : me.role === "importer" ? "Your supplier portfolio" : "Verification queue";

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <span className="eyebrow">{me.organization_name}</span>
          <h1 className="serif page-title">{heading}</h1>
        </div>
        {me.role === "supplier" && (
          <Button variant="ember" onClick={() => navigate("/plant")}><Icon name="plus" size={16} /> New statement</Button>
        )}
      </div>

      {stale.length > 0 && (
        <motion.div className="card stale-banner" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="row" style={{ alignItems: "center" }}>
            <span className="pulse" />
            <div><strong>{stale.length} statement(s) out of date.</strong>
              <div className="muted">An upstream supplier published a new number.</div></div>
          </div>
          <Button variant="ember" loading={busy} onClick={recompute}><Icon name="refresh" size={16} /> Recompute</Button>
        </motion.div>
      )}

      {me.role === "importer" && mine.length > 0 && (
        <div className="kpis">
          {[
            { label: "Suppliers connected", node: <CountUp value={new Set(mine.map((s) => s.supplier)).size} /> },
            { label: "Verified", node: <CountUp value={verifiedShare} suffix="%" /> },
            { label: "Average cut vs default", node: <CountUp value={avgCut} suffix="%" /> },
            { label: "Statements", node: <CountUp value={mine.length} /> },
          ].map((k, i) => (
            <motion.div key={k.label} className="card kpi" initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <span className="eyebrow">{k.label}</span><div className="big-n">{k.node}</div>
            </motion.div>
          ))}
        </div>
      )}

      {mine.length === 0 ? (
        <EmptyState
          title={me.role === "supplier" ? "No statements yet" : "Nothing shared with you yet"}
          text={me.role === "supplier" ? "Build your first one in the plant workspace." : "Ask a supplier to share a signed statement with your organization."} />
      ) : (
        <div className="cards">{mine.map((s, i) => <StatementCard key={s.id} statement={s} index={i} />)}</div>
      )}

      {me.role === "supplier" && incoming.length > 0 && (
        <>
          <h2 className="serif" style={{ fontSize: 32, marginTop: 24 }}>Shared with you by suppliers</h2>
          <div className="cards">{incoming.map((s, i) => <StatementCard key={s.id} statement={s} index={i} />)}</div>
        </>
      )}
    </div>
  );
}
