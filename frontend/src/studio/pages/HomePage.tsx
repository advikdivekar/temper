// studio/pages/HomePage.tsx
// Home. One big number, one sentence, and what needs you. Nothing else.
//
//   supplier  your latest verified emissions per tonne, and how far
//             below the EU default it is
//   verifier  how many statements wait for your opinion
//   importer  how far below the default your suppliers are on average

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { Overview, Statement } from "../../api/types";
import { quarterOf } from "../../lib/format";
import { CountUp } from "../../ui/CountUp";
import { useToast } from "../../ui/Toast";
import { QuarterLine } from "../parts/QuarterLine";

const productOf = (s: Statement) => Object.keys(s.see_by_product)[0];
const seeOf = (s: Statement) => Number(s.see_by_product[productOf(s)]);
const defOf = (s: Statement) => Number(s.default_see_by_product?.[productOf(s)] ?? 0);

export function HomePage() {
  const { me } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => { api<Overview>("/overview").then(setData).catch((e) => toast.error("Could not load home", (e as Error).message)); }, []);

  const view = useMemo(() => {
    if (!data || !me) return null;
    const all = [...data.statements].sort((a, b) => a.period_start.localeCompare(b.period_start) || a.id - b.id);
    const own = me.role === "supplier" ? all.filter((s) => s.supplier === me.organization_name) : all;
    const counts = new Map<string, number>();
    for (const s of own) counts.set(productOf(s), (counts.get(productOf(s)) ?? 0) + 1);
    const product = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    const inProduct = [...own].reverse().filter((s) => productOf(s) === product);
    const latest = inProduct.find((s) => s.verified) ?? inProduct[0];
    const quarters = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"];
    const at = (q: string, pick: "see" | "def") => {
      const row = inProduct.find((s) => quarterOf(s.period_start) === q);
      if (!row) return null;
      const v = pick === "see" ? seeOf(row) : defOf(row);
      return v > 0 ? v : null;
    };
    return {
      latest, product,
      waiting: all.filter((s) => s.status === "signed" && !s.verified).length,
      labels: quarters.map((q) => q.split(" ")[0]),
      lines: [{ name: "Verified", values: quarters.map((q) => at(q, "see")) }, { name: "EU default", dashed: true, values: quarters.map((q) => at(q, "def")) }],
    };
  }, [data, me]);

  if (!me) return null;
  if (!data || !view) return <div className="skeleton" style={{ height: 360 }} />;
  const k = data.kpis;
  const cut = view.latest && defOf(view.latest) > 0 ? Math.round((1 - seeOf(view.latest) / defOf(view.latest)) * 100) : 0;

  let big: React.ReactNode, unit = "", line = "";
  if (me.role === "verifier") {
    big = <CountUp value={view.waiting} />;
    line = view.waiting === 1 ? "statement is waiting for your opinion." : "statements are waiting for your opinion.";
  } else if (me.role === "importer") {
    big = <CountUp value={k.avg_cut_vs_default} suffix="%" />;
    line = `below the EU default on average. ${k.verified_share}% of statements are verified.`;
  } else if (view.latest) {
    big = <CountUp value={seeOf(view.latest)} decimals={2} />;
    unit = "tCO2 / t";
    line = `${view.product.replace("_", " ")}, ${quarterOf(view.latest.period_start)}. ${cut}% below the EU default of ${defOf(view.latest).toFixed(2)}.`;
  } else { big = "0.00"; line = "No statements yet. Build your first one."; }

  return (
    <div>
      <div className="home-top">
        <div>
          <span className="kicker">{me.organization_name} / {me.role}</span>
          <div className="big" style={{ marginTop: 16 }}>{big}{unit && <small>{unit}</small>}</div>
          <p className="home-line">{line}</p>
          <div className="actions">
            {me.role === "supplier" && <button className="btn-solid ember" onClick={() => navigate("/plant")}>Build a statement</button>}
            <button className="btn-line" onClick={() => navigate("/statements")}>{me.role === "verifier" ? "Open the review queue" : "Open statements"}</button>
          </div>
        </div>
        {me.role === "supplier" && <div className="chart-paper"><QuarterLine labels={view.labels} series={view.lines} /></div>}
      </div>

      <div className="list-head"><span className="kicker">Needs you</span><span className="kicker">{data.attention.length}</span></div>
      {data.attention.length === 0 && <p className="row-empty">All clear. Nothing is waiting on you.</p>}
      {data.attention.slice(0, 5).map((a, i) => (
        <Link key={i} to={a.link} className="row-link">
          <i className={`dot ${a.severity === "high" ? "bad" : "warn"}`} />
          <span><strong>{a.title}</strong><span className="soft" style={{ display: "block" }}>{a.detail}</span></span>
          <span className="soft">Open</span>
        </Link>
      ))}
    </div>
  );
}
