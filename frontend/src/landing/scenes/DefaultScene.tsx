// landing/scenes/DefaultScene.tsx
// Scene 3: the tension. The EU default value rises every year to
// push suppliers toward real data. Scrub the year and watch it grow.
//
// Numbers: India, hot rolled flat steel (CN 7208), base default 4.28
// tCO2 per tonne, plus the mark-up of 10, 20 and 30 percent for 2026,
// 2027 and 2028. These come from secondary reporting and are shown as
// illustrative. The "verified" marker is the demo mill's synthetic
// figure, not a real measurement.

import { motion } from "motion/react";
import { useState } from "react";
import { Reveal } from "../../ui/Reveal";
import { LiveNumber } from "../../ui/LiveNumber";

const BASE = 4.28;
const YEARS = [
  { year: 2026, markup: 0.1 },
  { year: 2027, markup: 0.2 },
  { year: 2028, markup: 0.3 },
];
const VERIFIED = 2.4;

export function DefaultScene() {
  const [index, setIndex] = useState(0);
  const max = BASE * 1.3;
  const current = BASE * (1 + YEARS[index].markup);

  return (
    <section id="problem" className="dark-scene" data-scene="3">
      <div className="split-2">
        <Reveal className="col-text">
          <span className="mono kicker">THE PROBLEM</span>
          <h2 className="serif h2">The default is built to hurt.</h2>
          <p className="muted-light">
            When a supplier cannot prove its emissions, the importer must use the
            Commission's default value. It carries a mark-up that rises every year,
            so the cost of having no data only grows.
          </p>
          <div className="year-picker" role="tablist" aria-label="Choose a year">
            {YEARS.map((y, i) => (
              <button key={y.year} role="tab" aria-selected={index === i} className={index === i ? "on" : ""}
                onClick={() => setIndex(i)}>{y.year}</button>
            ))}
          </div>
          <input className="range-light" type="range" min={0} max={2} step={1} value={index}
            aria-label="Year" onChange={(e) => setIndex(Number(e.target.value))} />
        </Reveal>

        <Reveal className="panel" delay={0.1}>
          <div className="panel-head mono"><span>DEFAULT VALUE / FLAT STEEL / INDIA</span><span>tCO2 per tonne</span></div>
          <div className="big-readout serif"><LiveNumber value={current} decimals={2} />
            <small className="mono">+{Math.round(YEARS[index].markup * 100)}% mark-up</small></div>
          <svg viewBox="0 0 520 220" width="100%" role="img" aria-label={`Default value rises to ${current.toFixed(2)} in ${YEARS[index].year}`}>
            {YEARS.map((y, i) => {
              const value = BASE * (1 + y.markup);
              const width = (value / max) * 360;
              return (
                <g key={y.year}>
                  <text x="0" y={34 + i * 56} fill="#8c8c8c" fontSize="12" fontFamily="JetBrains Mono">{y.year}</text>
                  <rect x="60" y={18 + i * 56} width="360" height="26" fill="#ffffff" fillOpacity="0.05" />
                  <motion.rect x="60" y={18 + i * 56} height="26" fill={i === index ? "#ff5a1f" : "#4a5260"}
                    initial={{ width: 0 }} whileInView={{ width }} viewport={{ once: true }} animate={{ fill: i === index ? "#ff5a1f" : "#4a5260" }}
                    transition={{ duration: 0.9, delay: i * 0.12 }} />
                  <text x={64 + width} y={36 + i * 56} fill="#f4f4f4" fontSize="13" fontFamily="JetBrains Mono">{value.toFixed(2)}</text>
                </g>
              );
            })}
            <line x1={60 + (VERIFIED / max) * 360} y1="6" x2={60 + (VERIFIED / max) * 360} y2="186" stroke="#0f9d6b" strokeDasharray="3 4" />
            <text x={66 + (VERIFIED / max) * 360} y="200" fill="#0f9d6b" fontSize="11" fontFamily="JetBrains Mono">illustrative verified figure 2.40</text>
          </svg>
          <p className="caption mono">Base 4.28 and mark-ups from secondary reporting, verify against the Commission annex. Verified figure is demo data.</p>
        </Reveal>
      </div>
    </section>
  );
}
