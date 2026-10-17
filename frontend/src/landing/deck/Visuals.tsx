// landing/deck/Visuals.tsx
// Six miniature product screens, one per slide of the "How it works"
// deck. Each is a small, self playing animation of the real feature.
// They are re-mounted when their slide becomes active (the deck gives
// each a new "key"), so the animation replays every time.

import { motion } from "motion/react";
import { CountUp } from "../../ui/CountUp";

const ease = [0.22, 1, 0.36, 1] as const;

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="viz">
      <div className="viz-bar mono"><i /><i /><i /><span>{title}</span></div>
      <div className="viz-body">{children}</div>
    </div>
  );
}

// 1. Evidence: files arrive and are fingerprinted.
export function EvidenceViz() {
  const files = [
    { n: "coal_invoice_Q1.pdf", h: "9f2c1a7e04b8" }, { n: "electricity_bill_Mar.pdf", h: "c61e90ab3f27" },
    { n: "production_log_Q1.xlsx", h: "42d8be15907c" },
  ];
  return (
    <Frame title="evidence vault">
      {files.map((f, i) => (
        <motion.div key={f.n} className="viz-row" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.35, duration: 0.7, ease }}>
          <span>{f.n}</span>
          <span className="mono hash">{f.h.split("").map((c, j) => (
            <motion.b key={j} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.35 + j * 0.04 }}>{c}</motion.b>))}</span>
          <motion.span className="tick" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.1 + i * 0.35, type: "spring" }}>intact</motion.span>
        </motion.div>
      ))}
      <p className="viz-note mono">stored under its SHA256 hash / identical files stored once</p>
    </Frame>
  );
}

// 2. Ledger: confirmed records, then a correction that supersedes one.
export function LedgerViz() {
  return (
    <Frame title="ledger / Q2 2026">
      <div className="viz-lanes">
        {[["Fuel", "coal", "12,800 t"], ["Electricity", "grid", "5.45 GWh"], ["Output", "steel coil", "10,400 t"]].map(([lane, name, amount], i) => (
          <motion.div key={lane} className="viz-lane" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.15 }}>
            <small className="mono">{lane}</small><strong>{amount}</strong><span>{name}</span>
          </motion.div>
        ))}
      </div>
      <motion.div className="viz-correct" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
        <span className="mono">CORRECTION</span><s>12,800 t</s><b>12,480 t</b><em>old row kept, new row supersedes it</em>
      </motion.div>
    </Frame>
  );
}

// 3. Engine: where the carbon comes from, with a typed trace.
export function EngineViz() {
  const lines = ["Direct emissions: 31,984 tCO2", "Indirect: not counted for steel", "Plant total: 31,984 tCO2", "steel_coil: 3.26367 tCO2 per tonne"];
  return (
    <Frame title="calculation trace">
      <div className="viz-stack">
        {[["Coal", 78, "#ff5a1f"], ["Natural gas", 22, "#8d929a"]].map(([label, w, color], i) => (
          <div key={label as string} className="viz-bar-row"><small>{label}</small>
            <motion.i style={{ background: color as string }} initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ delay: 0.2 + i * 0.2, duration: 0.9, ease }} /></div>
        ))}
      </div>
      {lines.map((l, i) => (
        <motion.div key={l} className="viz-line mono" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + i * 0.28 }}>{l}</motion.div>
      ))}
    </Frame>
  );
}

// 4. Chain: a mill revision flips the downstream node to stale, then it recomputes.
export function ChainViz() {
  return (
    <Frame title="supply chain">
      <svg viewBox="0 0 420 170" width="100%">
        <motion.path d="M118 85 H 175 M 245 85 H 302" stroke="#a3a39f" strokeWidth="1.6" strokeDasharray="5 5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
        {[{ x: 18, t: "Steel Mill", v: "3.26", c: "#0f9d6b" }, { x: 175, t: "Bolt Works", v: "5.06", c: "#0f9d6b" }, { x: 302, t: "EU Importer", v: "", c: "#a3a39f" }].map((n, i) => (
          <motion.g key={n.t} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.18 }}>
            <rect x={n.x} y="52" width="100" height="66" fill="none" stroke="currentColor" strokeOpacity="0.4" />
            <text x={n.x + 10} y="78" fontSize="11" fill="currentColor" fontFamily="JetBrains Mono">{n.t}</text>
            <text x={n.x + 10} y="104" fontSize="20" fill="currentColor" fontFamily="Instrument Serif">{n.v}</text>
          </motion.g>
        ))}
        <motion.circle r="5" fill="#ff5a1f" style={{ offsetPath: 'path("M118 85 H 175")' }} initial={{ offsetDistance: "0%" }} animate={{ offsetDistance: "100%" }} transition={{ delay: 1, duration: 0.8, repeat: 2 }} />
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ delay: 2, duration: 2.4 }}>
          <rect x="175" y="34" width="100" height="18" fill="#d92d20" />
          <text x="183" y="47" fontSize="10" fill="#fff" fontFamily="JetBrains Mono">STALE: recompute</text>
        </motion.g>
        <motion.text x="185" y="104" fontSize="20" fill="#ff5a1f" fontFamily="Instrument Serif" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.2 }}>4.98</motion.text>
      </svg>
      <p className="viz-note mono">mill revises Q2 / dependents flagged / rebuilt in order</p>
    </Frame>
  );
}

// 5. Trust: signature draws, verifier stamps, audit blocks chain.
export function TrustViz() {
  return (
    <Frame title="sign and verify">
      <svg viewBox="0 0 300 54" width="70%">
        <motion.path d="M6 38 C 26 4, 42 50, 60 24 S 96 4, 116 34 S 158 42, 290 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4 }} />
      </svg>
      <motion.span className="viz-stamp" initial={{ scale: 2.2, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} transition={{ delay: 1.5, type: "spring", stiffness: 240, damping: 14 }}>Satisfactory</motion.span>
      <div className="viz-chain">
        {["#46", "#47", "#48", "#49"].map((n, i) => (
          <motion.div key={n} className="viz-block mono" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.9 + i * 0.25 }}>
            {n}<small>{["034336", "0dbe56", "00a93c", "3dc750"][i]}</small>
          </motion.div>
        ))}
      </div>
    </Frame>
  );
}

// 6. Delivery: the importer sees the saving.
export function DeliveryViz() {
  return (
    <Frame title="importer view">
      <div className="viz-saving">
        <small className="mono">SAVING VERSUS EU DEFAULT</small>
        <div className="serif"><CountUp value={92320} prefix="€" duration={2} /></div>
        <small className="mono">500 t at €80 per certificate / illustrative</small>
      </div>
      <motion.div className="viz-pack" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
        <span className="mono">temper-pack-statement-7.json</span><b>Verify independently</b>
      </motion.div>
    </Frame>
  );
}
