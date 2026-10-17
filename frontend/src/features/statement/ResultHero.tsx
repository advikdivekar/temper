// features/statement/ResultHero.tsx
// The top of a statement: the one number that matters, set huge,
// next to a bar race against the EU default so the value is obvious
// without reading anything.

import { motion } from "motion/react";
import type { Statement } from "../../api/types";
import { CountUp } from "../../ui/CountUp";
import { Pill } from "../../ui/Pill";

export function ResultHero({ statement }: { statement: Statement }) {
  const product = Object.keys(statement.see_by_product)[0];
  const actual = Number(statement.see_by_product[product]);
  const defaultSee = Number(statement.default_see_by_product?.[product] ?? 0);
  const longest = Math.max(actual, defaultSee, 0.0001);
  const cut = defaultSee > 0 ? Math.round((1 - actual / defaultSee) * 100) : 0;

  return (
    <div className="card hero-metric">
      <div>
        <span className="eyebrow">Emissions per tonne of {product.replace("_", " ")}</span>
        <div className="huge"><CountUp value={actual} decimals={2} duration={1.6} /></div>
        <p className="muted">tonnes CO2 per tonne of product</p>
      </div>
      <div className="versus">
        <div className="versus-row">
          <span>Verified data</span>
          <div className="versus-track">
            <motion.div className="versus-fill" style={{ background: "var(--ember)" }}
              initial={{ width: 0 }} animate={{ width: `${(actual / longest) * 100}%` }}
              transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          <b>{actual.toFixed(2)}</b>
        </div>
        <div className="versus-row">
          <span>EU default</span>
          <div className="versus-track">
            <motion.div className="versus-fill" style={{ background: "var(--steel)" }}
              initial={{ width: 0 }} animate={{ width: `${(defaultSee / longest) * 100}%` }}
              transition={{ duration: 1.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          <b>{defaultSee ? defaultSee.toFixed(2) : "n/a"}</b>
        </div>
        {cut > 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.4, type: "spring" }}>
            <Pill tone="good">{cut}% lower than the penalty default</Pill>
          </motion.div>
        ) : statement.breakdown && statement.breakdown.lots.length === 0 ? (
          <Pill>Primary producer: no purchased inputs to compare</Pill>
        ) : (
          <Pill tone="warn">Same as the default until upstream data is verified</Pill>
        )}
      </div>
    </div>
  );
}
