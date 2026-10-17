// landing/hero/ChartOverlay.tsx
// A line that draws itself across the clouds, with three labelled
// points. It shows the story of the product in one picture: the carbon
// number FALLS as data becomes real, from the EU default, to one
// verified mill, to a fully linked chain.
//
// Layout trick: the line is an SVG stretched to fill the box (its
// stroke stays the same thickness), while the points and labels are
// ordinary HTML placed by percentage. That keeps the text a fixed,
// readable size on every screen instead of scaling with the picture.
//
// The figures are the demo's own synthetic numbers and the picture
// says so. It is an illustration, not measured data.

import { motion } from "motion/react";

// x and y are percentages of the box.
const POINTS = [
  { x: 20, y: 40, label: "default applied", value: "4.95 tCO2/t" },
  { x: 50, y: 64, label: "60% of steel verified", value: "3.56 tCO2/t" },
  { x: 80, y: 80, label: "chain linked", value: "2.64 tCO2/t" },
];

// The same curve in a 100 by 100 box.
const LINE = "M 0 26 C 6 25, 14 40, 20 40 S 42 64, 50 64 S 70 80, 80 80 S 96 84, 100 80";

export function ChartOverlay() {
  return (
    <div className="chart-overlay" aria-label="Illustration: the carbon number falls as data becomes verified">
      <motion.svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chart-line"
        initial={{ clipPath: "inset(0 100% 0 0)" }} animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: 2.6, delay: 0.7, ease: [0.4, 0, 0.2, 1] }}>
        <path d={LINE} fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </motion.svg>
      {POINTS.map((p, i) => (
        <motion.div key={p.label} className="chart-point" style={{ left: `${p.x}%`, top: `${p.y}%` }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 + i * 0.7 }}>
          <div className="chart-label"><small>{p.label}</small><b className="mono">{p.value}</b></div>
          <span className="chart-tick" /><span className="chart-dot" />
        </motion.div>
      ))}
    </div>
  );
}
