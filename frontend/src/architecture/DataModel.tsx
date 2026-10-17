// architecture/DataModel.tsx
// The database as an entity relationship diagram: tables as boxes,
// relationships as lines. Hover a table to light up its connections
// and read what it stores. The positions are laid out by hand so the
// important flow (organization, plant, records, statement, trust)
// reads left to right.

import { motion } from "motion/react";
import { useState } from "react";
import { RELATIONS, TABLES } from "./data";

const W = 190;

export function DataModel() {
  const [active, setActive] = useState<string | null>("statement");
  const table = (id: string) => TABLES.find((t) => t.id === id)!;
  const height = (id: string) => 34 + table(id).fields.length * 18;
  const related = new Set(RELATIONS.filter(([a, b]) => a === active || b === active).flatMap(([a, b]) => [a, b]));

  return (
    <div className="erd-wrap">
      <div className="erd-scroll">
        <svg viewBox="0 0 980 560" width="980" height="560" role="img" aria-label="Database entity relationship diagram">
          {RELATIONS.map(([a, b], i) => {
            const A = table(a), B = table(b);
            const ax = A.x + (A.x < B.x ? W : 0), bx = B.x + (A.x < B.x ? 0 : W);
            const ay = A.y + height(a) / 2, by = B.y + height(b) / 2;
            const mid = (ax + bx) / 2;
            const lit = active === a || active === b;
            return <motion.path key={i} d={`M ${ax} ${ay} C ${mid} ${ay}, ${mid} ${by}, ${bx} ${by}`} fill="none"
              stroke={lit ? "#ff5a1f" : "#ffffff"} strokeOpacity={lit ? 1 : 0.18} strokeWidth={lit ? 2 : 1}
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.05 }} />;
          })}
          {TABLES.map((t, i) => (
            <motion.g key={t.id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
              onMouseEnter={() => setActive(t.id)} onFocus={() => setActive(t.id)} tabIndex={0} style={{ cursor: "pointer", outline: "none" }}
              opacity={active === null || active === t.id || related.has(t.id) ? 1 : 0.35}>
              <rect x={t.x} y={t.y} width={W} height={height(t.id)} fill="#0e1012" stroke={active === t.id ? "#ff5a1f" : "#ffffff"} strokeOpacity={active === t.id ? 1 : 0.25} />
              <text x={t.x + 12} y={t.y + 21} fill="#f1f0ee" fontSize="12" fontFamily="JetBrains Mono" fontWeight="500">{t.id}</text>
              <line x1={t.x} x2={t.x + W} y1={t.y + 30} y2={t.y + 30} stroke="#ffffff" strokeOpacity="0.15" />
              {t.fields.map((f, fi) => <text key={f} x={t.x + 12} y={t.y + 48 + fi * 18} fill="#a3a39f" fontSize="11" fontFamily="JetBrains Mono">{f}</text>)}
            </motion.g>
          ))}
        </svg>
      </div>
      {active && <div className="erd-note"><span className="mono kicker">{active}</span><p>{table(active).note}</p>
        <p className="mono muted-light">Related: {[...related].filter((r) => r !== active).join(", ") || "none"}</p></div>}
    </div>
  );
}
