// world/ChainWorld.tsx
// The hero picture: a small isometric world of the supply chain.
//
//   Steel mill  ->  Bolt works  ->  EU importer, with a verifier
//   tower watching over the chain.
//
// "Heat" drives the look. At heat 0 the world is cold steel and the
// carbon number is the punishing EU default. As heat rises to 1 the
// windows, roads and data packets warm to ember, and the number falls
// to the verified figure. The meaning: tempering makes the metal, and
// the data, trustworthy.
//
// Every building is a real button (click or press Enter) that selects
// it and shows details outside the picture, so nothing depends on
// seeing the animation.

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import { useEffect } from "react";
import { IsoBox } from "./IsoBox";
import type { Tone } from "./IsoBox";
import { groundPath, project, toPoints } from "./iso";
import { SvgReadout } from "./Readout";

export type NodeKey = "mill" | "bolts" | "verifier" | "importer";

const STEEL: Tone = { top: "#4a5b6e", left: "#2a3644", right: "#1b242e" };
const DARK: Tone = { top: "#364454", left: "#1f2a36", right: "#141b23" };
const GLASS: Tone = { top: "#5d7186", left: "#33445a", right: "#222f40" };

export const DEFAULT_SEE = 4.948;
export const VERIFIED_SEE = 2.64;

interface Props {
  heat: MotionValue<number>;
  selected: NodeKey;
  tempered: boolean;
  onSelect: (key: NodeKey) => void;
}

interface LabelProps {
  gx: number; gy: number; gz: number; title: string;
  value?: string;                       // fixed text
  valueSource?: MotionValue<number>;    // or a live number
  format?: (v: number) => string;
  strong?: boolean;
}

function Label({ gx, gy, gz, title, value, valueSource, format, strong }: LabelProps) {
  const base = project(gx, gy, gz);
  const top = project(gx, gy, gz + 1.3);
  const x = top.x - 58;
  const y = top.y - 46;
  return (
    <g pointerEvents="none">
      <line x1={base.x} y1={base.y} x2={top.x} y2={top.y} stroke="#ffffff" strokeOpacity="0.4" strokeDasharray="2 3" />
      <rect x={x} y={y} width="116" height="46" fill="#0b0c0e" stroke="#ffffff" strokeOpacity="0.28" />
      <text x={x + 10} y={y + 17} className="svg-mono" fill="#a8a8a8" fontSize="9">{title}</text>
      {valueSource && format ? (
        <SvgReadout source={valueSource} format={format} x={x + 10} y={y + 38} className={strong ? "svg-serif big" : "svg-serif"} />
      ) : (
        <text x={x + 10} y={y + 38} className="svg-serif">{value}</text>
      )}
    </g>
  );
}

export function ChainWorld({ heat, selected, tempered, onSelect }: Props) {
  // Colours that blend from cold to ember as heat rises.
  const windowColor = useTransform(heat, [0, 1], ["#2d3b4b", "#ff7a3d"]);
  const roadColor = useTransform(heat, [0, 1], ["#5b6b7d", "#ff5a1f"]);
  const glowColor = useTransform(heat, [0, 1], ["rgba(90,110,130,0)", "rgba(255,90,31,0.55)"]);
  const seeValue = useTransform(heat, [0, 1], [DEFAULT_SEE, VERIFIED_SEE]);
  const percent = useTransform(heat, [0, 1], [0, 47]);

  // Gentle parallax: the scene leans toward the pointer.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18 });
  const sy = useSpring(py, { stiffness: 60, damping: 18 });
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const move = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth - 0.5) * -16);
      py.set((e.clientY / window.innerHeight - 0.5) * -10);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [px, py]);

  const diamond = toPoints([project(0, 0), project(10, 0), project(10, 10), project(0, 10)]);
  const gridLines = Array.from({ length: 11 }, (_, i) => i);
  const roadOne = groundPath([[3.7, 6.1], [5.9, 6.1], [5.9, 5.0]]);
  const roadTwo = groundPath([[7.3, 4.0], [8.2, 4.0], [8.2, 2.8]]);
  const roadThree = groundPath([[2.6, 3.6], [2.6, 2.2]]);
  const roadFour = groundPath([[6.3, 3.2], [6.3, 1.4]]);

  const select = (key: NodeKey) => ({
    role: "button" as const,
    tabIndex: 0,
    "aria-label": `Select ${key}`,
    "aria-pressed": selected === key,
    onClick: () => onSelect(key),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(key); }
    },
    className: `iso-node ${selected === key ? "is-selected" : ""}`,
  });

  const packet = (path: string, delay: number) => (
    <motion.circle r="4.5" style={{ fill: roadColor, offsetPath: `path("${path}")` }}
      initial={{ offsetDistance: "0%" }} animate={{ offsetDistance: "100%" }}
      transition={{ duration: 2.6, delay, repeat: Infinity, ease: "linear" }} />
  );

  return (
    <svg viewBox="0 -50 800 610" className="chain-world" role="group"
      aria-label="Isometric supply chain: steel mill, bolt works, verifier tower and EU importer">
      <defs>
        <radialGradient id="ground-fade" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#141a21" />
          <stop offset="100%" stopColor="#08090a" />
        </radialGradient>
      </defs>

      <motion.g style={{ x: sx, y: sy }}>
        <polygon points={diamond} fill="url(#ground-fade)" stroke="#ffffff" strokeOpacity="0.14" />
        {gridLines.map((i) => (
          <g key={i} stroke="#ffffff" strokeOpacity="0.06">
            <line x1={project(i, 0).x} y1={project(i, 0).y} x2={project(i, 10).x} y2={project(i, 10).y} />
            <line x1={project(0, i).x} y1={project(0, i).y} x2={project(10, i).x} y2={project(10, i).y} />
          </g>
        ))}
        <motion.ellipse cx={project(5, 5).x} cy={project(5, 5).y} rx="260" ry="120" style={{ fill: glowColor }} filter="blur(40px)" />

        {[roadOne, roadTwo, roadThree, roadFour].map((d, i) => (
          <motion.path key={i} d={d} fill="none" strokeWidth="3" style={{ stroke: roadColor }}
            strokeDasharray={i > 1 ? "3 6" : "0"} opacity={i > 1 ? 0.6 : 1} />
        ))}
        {packet(roadOne, 0)}
        {packet(roadTwo, 1.2)}
        {tempered && packet(roadThree, 0.4)}
        {tempered && packet(roadFour, 1.6)}

        {/* Buildings are drawn back to front so nearer ones overlap farther ones. */}

        {/* Verifier tower: tall and slim, its ring lights up when tempered. */}
        <g {...select("verifier")}>
          <IsoBox gx={1.2} gy={1.2} w={1.3} d={1.3} h={3.4} tone={DARK} glow={windowColor} columns={2} rows={5} />
          <motion.ellipse cx={project(1.85, 1.85, 3.5).x} cy={project(1.85, 1.85, 3.5).y} rx="34" ry="16"
            fill="none" strokeWidth="2" style={{ stroke: roadColor }} />
        </g>

        {/* Steel mill: wide hall with two chimneys and smoke. */}
        <g {...select("mill")}>
          <IsoBox gx={0.8} gy={4.6} w={3} d={2.8} h={1.5} tone={STEEL} glow={windowColor} columns={4} rows={1} />
          <IsoBox gx={1.1} gy={4.9} w={0.6} d={0.6} h={2.6} z={1.5} tone={DARK} />
          <IsoBox gx={2.2} gy={4.9} w={0.6} d={0.6} h={2.0} z={1.5} tone={DARK} />
          {[0, 1, 2].map((i) => (
            <motion.circle key={i} cx={project(1.4, 5.2, 4.3).x} cy={project(1.4, 5.2, 4.3).y} r="7"
              fill="#9aa7b4" initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: [0, 0.35, 0], y: -46, scale: 1.6 }}
              transition={{ duration: 3.6, delay: i * 1.2, repeat: Infinity, ease: "easeOut" }} />
          ))}
        </g>

        {/* EU importer: a glass tower on the far side. */}
        <g {...select("importer")}>
          <IsoBox gx={7.2} gy={0.6} w={1.8} d={1.8} h={4.6} tone={GLASS} glow={windowColor} columns={3} rows={6} />
          <IsoBox gx={7.55} gy={0.95} w={1.1} d={1.1} h={0.8} z={4.6} tone={DARK} />
        </g>

        {/* Bolt works: low sheds with a sawtooth roof, the hero of the story. */}
        <g {...select("bolts")}>
          <IsoBox gx={4.4} gy={3.7} w={2.6} d={2.2} h={1.1} tone={STEEL} glow={windowColor} columns={3} rows={1} />
          <IsoBox gx={4.6} gy={3.9} w={0.7} d={1.8} h={0.5} z={1.1} tone={DARK} />
          <IsoBox gx={5.5} gy={3.9} w={0.7} d={1.8} h={0.5} z={1.1} tone={DARK} />
          <IsoBox gx={6.2} gy={3.9} w={0.6} d={1.8} h={0.5} z={1.1} tone={DARK} />
        </g>

        {/* Labels sit on their own top layer so no building can hide them. */}
        <Label gx={1.85} gy={1.85} gz={3.5} title="VERIFIER" value="signs opinions" />
        <Label gx={2.3} gy={6.0} gz={1.6} title="STEEL MILL" value="2.40" />
        <Label gx={8.1} gy={1.5} gz={4.7} title="EU IMPORTER" valueSource={percent}
          format={(v) => (v < 1 ? "pays default" : `saves ${Math.round(v)}%`)} />
        <Label gx={5.7} gy={4.8} gz={1.6} title="BOLT WORKS" valueSource={seeValue}
          format={(v) => v.toFixed(2)} strong />

        {tempered && (() => {
          // Sits on the top right corner of the verifier's label box.
          const corner = project(1.85, 1.85, 4.8);
          const cx = corner.x + 58, cy = corner.y - 46;
          return (
            <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}>
              <circle cx={cx} cy={cy} r="10" fill="#0f9d6b" />
              <path d={`M ${cx - 5} ${cy} l3.5 3.5 6-7`} stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </motion.g>
          );
        })()}
      </motion.g>
    </svg>
  );
}
