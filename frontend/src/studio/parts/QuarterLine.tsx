// studio/parts/QuarterLine.tsx
// A small, quiet line chart: one number per quarter, with a dashed
// line for the EU default so the gap is visible. It draws itself once.

import { motion } from "motion/react";

export interface LineSeries { name: string; values: (number | null)[]; dashed?: boolean }

export function QuarterLine({ labels, series, height = 150 }: { labels: string[]; series: LineSeries[]; height?: number }) {
  const w = 460, pad = { l: 8, r: 40, t: 14, b: 22 };
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (all.length === 0) return null;
  const max = Math.max(...all) * 1.08, min = Math.min(...all) * 0.9;
  const x = (i: number) => pad.l + (i / Math.max(labels.length - 1, 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (height - pad.t - pad.b);
  const path = (vals: (number | null)[]) => vals.reduce((d, v, i) => (v === null ? d : `${d}${d ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)} `), "");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" role="img" aria-label="Emissions per tonne by quarter">
      {labels.map((l, i) => <text key={l} x={x(i)} y={height - 4} textAnchor="middle" className="ql-axis">{l}</text>)}
      {series.map((s, si) => {
        const color = s.dashed ? "#8b8a84" : "#ff5a1f";
        const last = [...s.values].map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).pop() ?? -1;
        return (
          <g key={s.name}>
            <motion.path d={path(s.values)} fill="none" stroke={color} strokeWidth={s.dashed ? 1.4 : 2.2} strokeDasharray={s.dashed ? "4 5" : undefined}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.2 + si * 0.15 }} />
            {!s.dashed && s.values.map((v, i) => v !== null && <circle key={i} cx={x(i)} cy={y(v)} r="3.2" fill={color} />)}
            {last >= 0 && <text x={x(last) + 8} y={y(s.values[last]!) + 4} className="ql-val" fill={color}>{s.values[last]!.toFixed(2)}</text>}
          </g>
        );
      })}
    </svg>
  );
}
