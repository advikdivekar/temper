// studio/pages/HomePage.tsx
// Home. One full screen: your supply chain as a small isometric world
// on the right, and on the left the single number that matters most to
// your role, large, with the story around it.
//
//   supplier  your latest emissions per tonne, and how far below the
//             EU default it is
//   verifier  how many statements are waiting for your opinion
//   importer  how far below the default your suppliers are on average
//
// Along the bottom, a rail of the few things that need you. If nothing
// does, it says so. The world's buildings light up as real data
// arrives: a verified statement lights the verifier, and so on.

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { Overview, Statement } from "../../api/types";
import { ChainWorld } from "../../landing/world/ChainWorld";
import { quarterOf } from "../../lib/format";
import { CountUp } from "../../ui/CountUp";
import { Icon } from "../../ui/Icons";
import { useToast } from "../../ui/Toast";
import { QuarterLine } from "../parts/QuarterLine";
import { useWorldState } from "../parts/useWorldState";

const productOf = (s: Statement) => Object.keys(s.see_by_product)[0];
const seeOf = (s: Statement) => Number(s.see_by_product[productOf(s)]);
const defOf = (s: Statement) => Number(s.default_see_by_product?.[productOf(s)] ?? 0);

export function HomePage() {
  const { me } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    api<Overview>("/overview").then(setData).catch((e) => toast.error("Could not load home", (e as Error).message));
  }, []);

  const view = useMemo(() => {
    if (!data || !me) return null;
    const all = [...data.statements].sort((a, b) => a.period_start.localeCompare(b.period_start) || a.id - b.id);
    const own = me.role === "supplier" ? all.filter((s) => s.supplier === me.organization_name) : all;
    // The product with the most statements is the main story.
    const counts = new Map<string, number>();
    for (const s of own) counts.set(productOf(s), (counts.get(productOf(s)) ?? 0) + 1);
    const product = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    // Show the latest VERIFIED quarter when there is one: that is the
    // number a buyer can rely on. Otherwise the latest of any state.
    const inProduct = [...own].reverse().filter((s) => productOf(s) === product);
    const latest = inProduct.find((s) => s.verified) ?? inProduct[0];
    const series = own.filter((s) => productOf(s) === product);
    const quarters = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"];
    const at = (q: string, pick: "see" | "def") => {
      const row = series.find((s) => quarterOf(s.period_start) === q);
      if (!row) return null;
      const v = pick === "see" ? seeOf(row) : defOf(row);
      return v > 0 ? v : null;
    };
    const waiting = all.filter((s) => s.status === "signed" && !s.verified).length;
    const mill = [...all].reverse().find((s) => productOf(s) === "steel_rods");
    const bolts = [...all].reverse().find((s) => productOf(s) === "bolts");
    return {
      latest, product, waiting, mill, bolts,
      lineLabels: quarters.map((q) => q.split(" ")[0]),
      lines: [
        { name: "Verified", values: quarters.map((q) => at(q, "see")) },
        { name: "EU default", dashed: true, values: quarters.map((q) => at(q, "def")) },
      ],
    };
  }, [data, me]);

  const k = data?.kpis;
  const world = useWorldState({
    mill: k && k.statements > 0 ? 1 : 0,
    verifier: k && k.verified > 0 ? 1 : 0,
    bolts: k && k.avg_cut_vs_default > 0 ? 1 : 0,
    importer: k && k.verified > 0 && me?.role !== "verifier" ? 1 : 0,
    roadA: k && k.verified > 0 ? 1 : 0,
    roadB: k && k.verified > 1 ? 1 : 0,
    millNumber: view?.mill ? seeOf(view.mill) : 2.4,
    boltsNumber: view?.bolts ? seeOf(view.bolts) : 4.95,
    saving: k?.avg_cut_vs_default ?? 0,
  });

  if (!me) return null;
  if (!data || !view || !k) return <div className="home"><div className="skeleton" style={{ height: 360, gridColumn: "1 / -1" }} /></div>;

  const cut = view.latest && defOf(view.latest) > 0 ? Math.round((1 - seeOf(view.latest) / defOf(view.latest)) * 100) : 0;

  let big: React.ReactNode, unit = "", line = "", extra: React.ReactNode = null;
  if (me.role === "verifier") {
    big = <CountUp value={view.waiting} />;
    line = view.waiting === 1 ? "statement waiting for your opinion" : "statements waiting for your opinion";
    extra = <p className="home-sub">{k.verified} verified so far</p>;
  } else if (me.role === "importer") {
    big = <CountUp value={k.avg_cut_vs_default} decimals={0} suffix="%" />;
    line = "below the EU default, on average across your suppliers";
    extra = <p className="home-sub">{k.verified_share}% of statements verified</p>;
  } else if (view.latest) {
    big = <CountUp value={seeOf(view.latest)} decimals={2} />;
    unit = "tCO2 / t";
    line = `${view.product.replace("_", " ")} · ${quarterOf(view.latest.period_start)} · ${cut}% below the EU default of ${defOf(view.latest).toFixed(2)}`;
    extra = <div className="home-line"><QuarterLine labels={view.lineLabels} series={view.lines} /></div>;
  } else {
    big = "0.00";
    line = "No statements yet. Build your first one.";
  }

  return (
    <div className="home">
      <div className="home-copy">
        <span className="kicker mono">{me.organization_name} / {me.role}</span>
        <div className="huge-n home-n">{big}{unit && <small>{unit}</small>}</div>
        <motion.p className="home-line-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>{line}</motion.p>
        {extra}
        <div className="home-actions">
          {me.role === "supplier" && <button className="pill-btn ember" onClick={() => navigate("/plant")}>Build a statement <Icon name="arrow" size={15} /></button>}
          <button className="pill-btn ghost" onClick={() => navigate("/statements")}>Open statements</button>
        </div>
      </div>

      <div className="home-world">
        <ChainWorld state={world} focus={me.role === "verifier" ? "verifier" : me.role === "importer" ? "importer" : "bolts"} />
      </div>

      <div className="home-rail">
        <span className="kicker mono">NEEDS YOU</span>
        <div className="rail-items">
          {data.attention.length === 0 && <span className="chip good"><i />All clear</span>}
          {data.attention.slice(0, 5).map((a, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}>
              <Link to={a.link} className={`chip ${a.severity === "high" ? "bad" : "warn"} rail-chip`}><i />{a.title}<Icon name="arrow" size={13} /></Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
