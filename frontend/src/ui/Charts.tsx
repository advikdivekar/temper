// ui/Charts.tsx
// Small SVG charts built by hand, so they match the design exactly and
// weigh almost nothing.
//
//   LineChart  one or more lines over labelled points (for example a
//              quarter by quarter trend), with a hover readout
//   Sparkline  a tiny line with no axes, for use inside a stat
//
// Concept: a chart is just maths. We map each value to an x and y
// position inside the drawing box, then draw a path through them. The
// line "draws itself" by animating pathLength from 0 to 1.

import { motion } from "motion/react";
import { useState } from "react";

export interface Series {
  name: string;
  color: string;
  values: (number | null)[];
  dashed?: boolean;
}

interface LineProps {
  labels: string[];
  series: Series[];
  height?: number;
  unit?: string;
}

export function LineChart({ labels, series, height = 240, unit = "" }: LineProps) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const pad = { l: 44, r: 16, t: 16, b: 30 };
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const max = Math.max(...all, 1) * 1.1;
  const min = Math.min(...all, 0) * 0.9;
  const x = (i: number) => pad.l + (i / Math.max(labels.length - 1, 1)) * (width - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (height - pad.t - pad.b);

  const path = (values: (number | null)[]) => {
    let d = "";
    values.forEach((v, i) => {
      if (v === null) return;
      d += `${d ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    });
    return d;
  };

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * (max - min));

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img"
        aria-label={`Line chart of ${series.map((s) => s.name).join(" and ")}`}
        onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.08" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="chart-axis">{t.toFixed(1)}</text>
          </g>
        ))}
        {labels.map((label, i) => (
          <text key={label} x={x(i)} y={height - 8} textAnchor="middle" className="chart-axis">{label}</text>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 4" />}
        {series.map((s) => (
          <g key={s.name}>
            <motion.path d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2.2"
              strokeDasharray={s.dashed ? "5 5" : undefined}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} />
            {s.values.map((v, i) => v !== null && (
              <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 3} fill={s.color} />
            ))}
          </g>
        ))}
        {labels.map((_, i) => (
          <rect key={i} x={x(i) - 30} y={pad.t} width="60" height={height - pad.t - pad.b} fill="transparent"
            onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name}><i style={{ background: s.color }} />{s.name}
            {hover !== null && s.values[hover] !== null && <b> {s.values[hover]!.toFixed(2)}{unit}</b>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({ values, color = "var(--ember)" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const w = 120, h = 36;
  const max = Math.max(...values), min = Math.min(...values);
  const d = values.map((v, i) => `${i ? "L" : "M"} ${(i / (values.length - 1)) * w} ${h - 4 - ((v - min) / (max - min || 1)) * (h - 8)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <motion.path d={d} fill="none" stroke={color} strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
    </svg>
  );
}
