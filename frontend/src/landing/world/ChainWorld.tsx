// world/ChainWorld.tsx
// The picture for the guided walkthrough: a small isometric supply
// chain. Steel mill, bolt works, verifier tower and EU importer.
//
// It has no controls of its own. The walkthrough (WorldScene) drives
// it by changing a few numbers between 0 and 1, one per part of the
// picture: how "lit" each building is, and how active each road is.
// Lit means verified data has reached it. The picture just draws
// whatever those numbers say, so the story always matches the step.
//
// The buildings are plain boxes drawn with three shades each, in
// isometric projection (see iso.ts).

import { motion, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import { IsoBox } from "./IsoBox";
import type { Tone } from "./IsoBox";
import { groundPath, project, toPoints } from "./iso";
import { ReadoutSpan } from "./Readout";

export type NodeKey = "mill" | "bolts" | "verifier" | "importer";

/** The numbers the walkthrough controls. Each is 0 (off) to 1 (on) unless noted. */
export interface WorldState {
  mill: MotionValue<number>;
  verifier: MotionValue<number>;
  bolts: MotionValue<number>;
  importer: MotionValue<number>;
  roadA: MotionValue<number>;      // mill to bolt works
  roadB: MotionValue<number>;      // bolt works to importer
  boltsNumber: MotionValue<number>; // the bolt works' carbon number
  saving: MotionValue<number>;      // importer saving, in percent
}

const STEEL: Tone = { top: "#4a5b6e", left: "#2a3644", right: "#1b242e" };
const DARK: Tone = { top: "#364454", left: "#1f2a36", right: "#141b23" };
const GLASS: Tone = { top: "#5d7186", left: "#33445a", right: "#222f40" };

const COLD = "#2d3b4b";
const HOT = "#ff7a3d";

// Where each building stands, used for the focus outline.
const FOOTPRINT: Record<NodeKey, [number, number, number, number]> = {
  mill: [0.8, 4.6, 3, 2.8], bolts: [4.4, 3.7, 2.6, 2.2],
  verifier: [1.2, 1.2, 1.3, 1.3], importer: [7.2, 0.6, 1.8, 1.8],
};

function Label({
  gx, gy, gz, title, value, unit, source, format, accent,
}: {
  gx: number; gy: number; gz: number; title: string; value?: string; unit?: string;
  source?: MotionValue<number>; format?: (v: number) => string; accent?: boolean;
}) {
  const base = project(gx, gy, gz);
  const top = project(gx, gy, gz + 1.3);
  // One consistent label: small caps title above, one value line below.
  const w = 132, h = 44;
  const x = top.x - w / 2, y = top.y - h;
  return (
    <g pointerEvents="none">
      <line x1={base.x} y1={base.y} x2={top.x} y2={top.y} stroke="#ffffff" strokeOpacity="0.35" strokeDasharray="2 3" />
      <rect x={x} y={y} width={w} height={h} fill="#0b0c0e" stroke="#ffffff" strokeOpacity="0.25" />
      <text x={x + 10} y={y + 16} className="lab-title">{title}</text>
      <text x={x + 10} y={y + 35} className={`lab-value ${accent ? "accent" : ""}`}>
        {source && format ? <ReadoutSpan source={source} format={format} /> : value}
        {unit && <tspan className="lab-unit"> {unit}</tspan>}
      </text>
    </g>
  );
}

export function ChainWorld({ state, focus }: { state: WorldState; focus: NodeKey | null }) {
  const win = (mv: MotionValue<number>) => useTransform(mv, [0, 1], [COLD, HOT]);
  const millWin = win(state.mill), verWin = win(state.verifier), boltsWin = win(state.bolts), impWin = win(state.importer);
  const roadAColor = useTransform(state.roadA, [0, 1], ["#5b6b7d", "#ff5a1f"]);
  const roadBColor = useTransform(state.roadB, [0, 1], ["#5b6b7d", "#ff5a1f"]);
  const ringColor = useTransform(state.verifier, [0, 1], ["#5b6b7d", "#ff5a1f"]);
  const packetA = useTransform(state.roadA, [0.6, 1], [0, 1]);
  const packetB = useTransform(state.roadB, [0.6, 1], [0, 1]);
  const glow = useTransform(state.bolts, [0, 1], ["rgba(90,110,130,0)", "rgba(255,90,31,0.5)"]);
  const verifiedTick = useTransform(state.verifier, [0.5, 1], [0, 1]);

  const diamond = toPoints([project(0, 0), project(10, 0), project(10, 10), project(0, 10)]);
  const lines = Array.from({ length: 11 }, (_, i) => i);
  const roadOne = groundPath([[3.7, 6.1], [5.9, 6.1], [5.9, 5.0]]);
  const roadTwo = groundPath([[7.3, 4.0], [8.2, 4.0], [8.2, 2.8]]);

  const packet = (path: string, opacity: MotionValue<number>, color: MotionValue<string>) => (
    <motion.circle r="4.5" style={{ fill: color, offsetPath: `path("${path}")`, opacity }}
      initial={{ offsetDistance: "0%" }} animate={{ offsetDistance: "100%" }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }} />
  );

  const footprint = (key: NodeKey) => {
    const [gx, gy, w, d] = FOOTPRINT[key];
    const m = 0.3;
    return toPoints([project(gx - m, gy - m), project(gx + w + m, gy - m), project(gx + w + m, gy + d + m), project(gx - m, gy + d + m)]);
  };

  return (
    <svg viewBox="0 -50 800 610" className="chain-world" role="img"
      aria-label="Isometric supply chain: steel mill, bolt works, verifier tower and EU importer">
      <polygon points={diamond} fill="#0d1114" stroke="#ffffff" strokeOpacity="0.14" />
      {lines.map((i) => (
        <g key={i} stroke="#ffffff" strokeOpacity="0.06">
          <line x1={project(i, 0).x} y1={project(i, 0).y} x2={project(i, 10).x} y2={project(i, 10).y} />
          <line x1={project(0, i).x} y1={project(0, i).y} x2={project(10, i).x} y2={project(10, i).y} />
        </g>
      ))}
      <motion.ellipse cx={project(5, 5).x} cy={project(5, 5).y} rx="260" ry="120" style={{ fill: glow }} filter="blur(40px)" />

      {focus && (
        <motion.polygon key={focus} points={footprint(focus)} fill="none" stroke="#ff5a1f" strokeWidth="2" strokeDasharray="7 6"
          initial={{ opacity: 0 }} animate={{ opacity: 1, strokeDashoffset: [0, -26] }}
          transition={{ opacity: { duration: 0.3 }, strokeDashoffset: { duration: 1.2, repeat: Infinity, ease: "linear" } }} />
      )}

      <motion.path d={roadOne} fill="none" strokeWidth="3" style={{ stroke: roadAColor }} />
      <motion.path d={roadTwo} fill="none" strokeWidth="3" style={{ stroke: roadBColor }} />
      {packet(roadOne, packetA, roadAColor)}
      {packet(roadTwo, packetB, roadBColor)}

      {/* Back to front so nearer buildings overlap farther ones. */}
      <IsoBox gx={1.2} gy={1.2} w={1.3} d={1.3} h={3.4} tone={DARK} glow={verWin} columns={2} rows={5} />
      <motion.ellipse cx={project(1.85, 1.85, 3.5).x} cy={project(1.85, 1.85, 3.5).y} rx="34" ry="16" fill="none" strokeWidth="2" style={{ stroke: ringColor }} />

      <IsoBox gx={0.8} gy={4.6} w={3} d={2.8} h={1.5} tone={STEEL} glow={millWin} columns={4} rows={1} />
      <IsoBox gx={1.1} gy={4.9} w={0.6} d={0.6} h={2.6} z={1.5} tone={DARK} />
      <IsoBox gx={2.2} gy={4.9} w={0.6} d={0.6} h={2.0} z={1.5} tone={DARK} />
      {[0, 1, 2].map((i) => (
        <motion.circle key={i} cx={project(1.4, 5.2, 4.3).x} cy={project(1.4, 5.2, 4.3).y} r="7" fill="#9aa7b4"
          initial={{ opacity: 0, y: 0, scale: 0.6 }} animate={{ opacity: [0, 0.3, 0], y: -46, scale: 1.6 }}
          transition={{ duration: 3.6, delay: i * 1.2, repeat: Infinity, ease: "easeOut" }} />
      ))}

      <IsoBox gx={7.2} gy={0.6} w={1.8} d={1.8} h={4.6} tone={GLASS} glow={impWin} columns={3} rows={6} />
      <IsoBox gx={7.55} gy={0.95} w={1.1} d={1.1} h={0.8} z={4.6} tone={DARK} />

      <IsoBox gx={4.4} gy={3.7} w={2.6} d={2.2} h={1.1} tone={STEEL} glow={boltsWin} columns={3} rows={1} />
      <IsoBox gx={4.6} gy={3.9} w={0.7} d={1.8} h={0.5} z={1.1} tone={DARK} />
      <IsoBox gx={5.5} gy={3.9} w={0.7} d={1.8} h={0.5} z={1.1} tone={DARK} />
      <IsoBox gx={6.2} gy={3.9} w={0.6} d={1.8} h={0.5} z={1.1} tone={DARK} />

      {/* Labels sit on a top layer so no building can hide them. */}
      <Label gx={1.85} gy={1.85} gz={3.5} title="VERIFIER" value="signs opinions" />
      <Label gx={2.3} gy={6.0} gz={1.6} title="STEEL MILL" value="2.40" unit="tCO2/t" />
      <Label gx={8.1} gy={1.5} gz={4.7} title="EU IMPORTER" source={state.saving} format={(v) => (v < 1 ? "pays default" : `saves ${Math.round(v)}%`)} />
      <Label gx={5.7} gy={4.8} gz={1.6} title="BOLT WORKS" source={state.boltsNumber} format={(v) => v.toFixed(2)} unit="tCO2/t" accent />

      <motion.g style={{ opacity: verifiedTick }}>
        <circle cx={project(1.85, 1.85, 4.8).x + 58} cy={project(1.85, 1.85, 4.8).y - 46} r="10" fill="#0f9d6b" />
        <path d={`M ${project(1.85, 1.85, 4.8).x + 53} ${project(1.85, 1.85, 4.8).y - 46} l3.5 3.5 6-7`} stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}
