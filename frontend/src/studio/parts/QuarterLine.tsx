// studio/parts/QuarterLine.tsx
// A small, calm line that draws itself across the quarters. It shows
// one number per quarter, with a dashed line for the EU default so the
// gap is visible at a glance. The last point is labelled.

import { motion } from "motion/react";

export interface LineSeries { name: string; values: (number | null)[]; dashed?: boolean; color?: string }

export function QuarterLine({ labels, series, height = 130 }: { labels: string[]; series: LineSeries[]; height?: number }) {
  const w = 460, pad = { l: 8, r: 36, t: 14, b: 22 };
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
        const last = [...s.values].reverse().findIndex((v) => v !== null);
        const li = last === -1 ? -1 : s.values.length - 1 - last;
        const color = s.color ?? (s.dashed ? "#6f6f6b" : "#ff5a1f");
        return (
          <g key={s.name}>
            <motion.path d={path(s.values)} fill="none" stroke={color} strokeWidth={s.dashed ? 1.4 : 2.2} strokeDasharray={s.dashed ? "4 5" : undefined}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: 0.3 + si * 0.2 }} />
            {s.values.map((v, i) => v !== null && !s.dashed && <motion.circle key={i} cx={x(i)} cy={y(v)} r="3.4" fill={color} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.15 }} />)}
            {li >= 0 && <text x={x(li) + 8} y={y(s.values[li]!) + 4} className="ql-val" fill={color}>{s.values[li]!.toFixed(2)}</text>}
          </g>
        );
      })}
    </svg>
  );
}
