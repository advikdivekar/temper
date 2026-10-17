// pages/OverviewPage.tsx
// The home screen after signing in. It answers three questions:
//   What is the state of my data?       the four headline numbers
//   What needs me right now?             the attention list
//   What happened recently?              the activity feed
// plus a quarter by quarter trend that shows verified numbers beating
// the EU default over time.

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Overview } from "../api/types";
import { actionLabel, quarterOf, timeAgo } from "../lib/format";
import { Button } from "../ui/Button";
import { LineChart } from "../ui/Charts";
import type { Series } from "../ui/Charts";
import { CountUp } from "../ui/CountUp";
import { Icon } from "../ui/Icons";
import { PageHead } from "../ui/PageHead";
import { Pill } from "../ui/Pill";
import { useToast } from "../ui/Toast";

const TITLES = {
  supplier: { title: "Your compliance picture.", desc: "Every statement, what is verified, and what still needs you." },
  verifier: { title: "Your verification desk.", desc: "Statements waiting for an opinion and your recent sign-offs." },
  importer: { title: "Your supplier data position.", desc: "How much of your supply chain is verified, and what the gap to the default is worth." },
  admin: { title: "Platform overview.", desc: "" },
};

export function OverviewPage() {
  const { me } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    api<Overview>("/overview").then(setData).catch((e) => toast.error("Could not load the overview", (e as Error).message));
  }, []);

  // Build trend lines: one pair (verified and default) for the first
  // product we find, across the four quarters of 2026.
  const trend = useMemo(() => {
    if (!data) return null;
    const quarters = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"];
    const groups = new Map<string, Statement[]>();
    type Statement = Overview["statements"][number];
    for (const s of data.statements) {
      const product = Object.keys(s.see_by_product)[0];
      const key = `${s.supplier} / ${product}`;
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    const colors = ["#ff5a1f", "#16202c", "#0f9d6b", "#b86e00"];
    const series: Series[] = [];
    let i = 0;
    for (const [name, rows] of [...groups.entries()].slice(0, 3)) {
      const product = Object.keys(rows[0].see_by_product)[0];
      const at = (q: string, pick: "see" | "def") => {
        const row = rows.find((r) => quarterOf(r.period_start) === q);
        if (!row) return null;
        const source = pick === "see" ? row.see_by_product : row.default_see_by_product;
        const value = Number(source?.[product]);
        return Number.isFinite(value) && value > 0 ? value : null;
      };
      series.push({ name, color: colors[i % colors.length], values: quarters.map((q) => at(q, "see")) });
      if (rows.some((r) => Number(r.default_see_by_product?.[product]) > Number(r.see_by_product[product]) + 0.01)) {
        series.push({ name: `${name} at EU default`, color: colors[i % colors.length], dashed: true, values: quarters.map((q) => at(q, "def")) });
      }
      i++;
    }
    return { quarters: quarters.map((q) => q.split(" ")[0]), series };
  }, [data]);

  if (!me) return null;
  if (!data) {
    return <div className="stack"><div className="skeleton" style={{ height: 80, width: 420 }} />
      <div className="skeleton" style={{ height: 130 }} /><div className="skeleton" style={{ height: 300 }} /></div>;
  }

  const copy = TITLES[me.role] ?? TITLES.supplier;
  const k = data.kpis;
  const stats = me.role === "supplier"
    ? [
        { label: "Statements", node: <CountUp value={k.statements} />, note: `${k.plants} plant(s)` },
        { label: "Verified", node: <CountUp value={k.verified_share} suffix="%" />, note: `${k.verified} of ${k.statements}` },
        { label: "Cut vs EU default", node: <CountUp value={k.avg_cut_vs_default} decimals={1} suffix="%" />, note: "average" },
        { label: "Out of date", node: <CountUp value={k.stale} />, note: k.stale ? "recompute needed" : "all current", hot: k.stale > 0 },
      ]
    : [
        { label: "Statements in view", node: <CountUp value={k.statements} />, note: "shared with you" },
        { label: "Verified", node: <CountUp value={k.verified_share} suffix="%" />, note: `${k.verified} of ${k.statements}` },
        { label: me.role === "importer" ? "Avg cut vs default" : "Awaiting opinion", node: <CountUp value={me.role === "importer" ? k.avg_cut_vs_default : k.statements - k.verified} decimals={me.role === "importer" ? 1 : 0} suffix={me.role === "importer" ? "%" : ""} />, note: me.role === "importer" ? "where verified" : "in your queue" },
        { label: "Open requests", node: <CountUp value={k.open_requests} />, note: "in your inbox", hot: k.open_requests > 0 },
      ];

  return (
    <div className="stack">
      <PageHead eyebrow={me.organization_name} title={copy.title} description={copy.desc}
        actions={me.role === "supplier" ? <Button variant="ember" onClick={() => navigate("/plant")}><Icon name="plus" size={16} />New statement</Button> : undefined} />

      <div className="kpis">
        {stats.map((s, i) => (
          <motion.div key={s.label} className="card kpi" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <span className="eyebrow">{s.label}</span>
            <div className="big-n" style={s.hot ? { color: "var(--bad)" } : undefined}>{s.node}</div>
            <span className="muted">{s.note}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card stack">
          <div className="toolbar"><h3>Needs attention</h3><Pill tone={data.attention.length ? "warn" : "good"}>{data.attention.length || "All clear"}</Pill></div>
          {data.attention.length === 0 && <p className="muted">Nothing is waiting on you.</p>}
          {data.attention.map((a, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
              <Link to={a.link} className="attention">
                <span className={`sev ${a.severity}`} />
                <div><strong>{a.title}</strong><div className="muted">{a.detail}</div></div>
                <Icon name="arrow" size={16} />
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="card stack">
          <div className="toolbar"><h3>Recent activity</h3><Link to="/audit" className="muted">Full log</Link></div>
          {data.activity.length === 0 && <p className="muted">No activity yet.</p>}
          <div className="feed">
            {data.activity.slice(0, 7).map((a, i) => (
              <motion.div key={a.id} className="feed-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.05 }}>
                <span className="feed-dot" />
                <div><strong>{actionLabel(a.action)}</strong><div className="muted">{a.detail}</div></div>
                <span className="mono muted">{timeAgo(a.at)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {trend && trend.series.length > 0 && (
        <div className="card stack">
          <div className="toolbar"><h3>Emissions per tonne, quarter by quarter</h3><span className="muted">tCO2 per tonne of product</span></div>
          <LineChart labels={trend.quarters} series={trend.series} />
        </div>
      )}
    </div>
  );
}
