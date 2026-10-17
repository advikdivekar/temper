// features/statement/BreakdownBar.tsx
// Where the carbon comes from, as one stacked bar plus the list of
// precursor purchases and whether each used real or default data.
// Only owners and verifiers see this (selective disclosure).

import { motion } from "motion/react";
import type { Breakdown } from "../../api/types";
import { Pill } from "../../ui/Pill";

export function BreakdownBar({ data }: { data: Breakdown }) {
  const parts = [
    { label: "Fuel burned (direct)", value: Number(data.direct), color: "var(--ember)" },
    { label: "Electricity (indirect)", value: Number(data.indirect), color: "var(--steel-2)" },
    { label: "Purchased steel (precursors)", value: Number(data.precursor), color: "var(--steel)" },
  ].filter((p) => p.value > 0);
  const total = parts.reduce((sum, p) => sum + p.value, 0) || 1;

  return (
    <div className="card">
      <span className="eyebrow">Where the carbon comes from</span>
      <div className="stack-bar" style={{ margin: "14px 0 0" }}>
        {parts.map((p, i) => (
          <motion.div key={p.label} style={{ background: p.color }}
            initial={{ width: 0 }} animate={{ width: `${(p.value / total) * 100}%` }}
            transition={{ duration: 1, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }} />
        ))}
      </div>
      <div className="legend">
        {parts.map((p) => (
          <span key={p.label}><i style={{ background: p.color }} />{p.label}: {p.value.toLocaleString("en-IN")} t</span>
        ))}
      </div>
      {data.lots.map((lot, i) => (
        <div className="lot" key={i}>
          <div>
            <strong>{lot.material}</strong>
            <div className="muted">{Number(lot.tonnes).toLocaleString("en-IN")} t at {Number(lot.intensity).toFixed(3)} tCO2 per tonne</div>
          </div>
          {lot.basis === "actual"
            ? <Pill tone="good" dot>Verified supplier data</Pill>
            : <Pill tone="warn" dot>EU default with mark-up</Pill>}
        </div>
      ))}
    </div>
  );
}
