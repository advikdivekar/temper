// landing/HowCards.tsx
// Four cards explaining the product, each with a tiny live animation:
//   1. Fingerprint  evidence is hashed so it cannot be swapped
//   2. Calculate    bars grow to show where the carbon comes from
//   3. Sign         a signature line draws itself
//   4. Link         a number travels down the chain and updates
//
// The animations start only when the card scrolls into view.

import { motion } from "motion/react";
import { Reveal } from "../ui/Reveal";
import { SpotCard } from "../ui/SpotCard";

function Fingerprint() {
  const hash = "9f2c1a7e04b8d3";
  return (
    <div className="mini mono">
      {hash.split("").map((ch, i) => (
        <motion.span key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.07 }}>{ch}</motion.span>
      ))}
      <motion.span className="caret" animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }}>|</motion.span>
    </div>
  );
}

function Bars() {
  return (
    <div className="mini bars">
      {[
        { w: "78%", c: "#16202c", l: "Steel input" },
        { w: "34%", c: "#ff5a1f", l: "Fuel" },
        { w: "12%", c: "#a5a39d", l: "Other" },
      ].map((bar, i) => (
        <div key={bar.l} className="bar-row">
          <small>{bar.l}</small>
          <motion.div className="bar" style={{ background: bar.c }}
            initial={{ width: 0 }} whileInView={{ width: bar.w }} viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
        </div>
      ))}
    </div>
  );
}

function Signature() {
  return (
    <div className="mini">
      <svg viewBox="0 0 200 60" width="100%">
        <motion.path d="M10 40 C 30 5, 45 55, 65 25 S 100 5, 120 35 S 160 45, 190 18"
          fill="none" stroke="#0e0e10" strokeWidth="2.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ duration: 1.6, delay: 0.3 }} />
      </svg>
      <small className="mono muted">ed25519 verified</small>
    </div>
  );
}

function Chain() {
  return (
    <div className="mini chain-mini">
      {["2.40", "2.64"].map((n, i) => (
        <motion.div key={n} className="chip" initial={{ opacity: 0, x: -14 }}
          whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.4 }}>{n}</motion.div>
      ))}
      <motion.div className="chip hot" initial={{ opacity: 0 }}
        whileInView={{ opacity: [0, 1, 1] }} viewport={{ once: true }}
        transition={{ delay: 1.3 }}>-47%</motion.div>
    </div>
  );
}

const CARDS = [
  { n: "01", h: "Fingerprint the evidence", p: "Bills and invoices are stored under their SHA256 hash. Swap one byte and the fingerprint breaks.", v: <Fingerprint /> },
  { n: "02", h: "Calculate with traceable rules", p: "A deterministic engine applies the CBAM methodology and shows exactly where every tonne of CO2 comes from.", v: <Bars /> },
  { n: "03", h: "Sign and verify", p: "The supplier signs. An accredited verifier adds a signed opinion. Importers can check both.", v: <Signature /> },
  { n: "04", h: "Link across the chain", p: "A maker's number points at its mill's verified number. When the mill revises, everything downstream updates.", v: <Chain /> },
];

export function HowCards() {
  return (
    <div className="how-grid">
      {CARDS.map((card, i) => (
        <Reveal key={card.n} delay={i * 0.1}>
          <SpotCard className="how-card">
            <span className="eyebrow">{card.n}</span>
            <h3>{card.h}</h3>
            <p className="muted">{card.p}</p>
            {card.v}
          </SpotCard>
        </Reveal>
      ))}
    </div>
  );
}
