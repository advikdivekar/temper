// landing/scenes/PrinciplesScene.tsx
// Scene 6: what makes Temper a system of record and not a chatbot.
// Three principles in thin ruled columns, and a panel showing a REAL
// calculation trace in the exact format the engine produces, typed
// out line by line as it comes into view.

import { motion } from "motion/react";
import { Reveal } from "../../ui/Reveal";

const PRINCIPLES = [
  { n: "I", h: "AI reads.", p: "Models extract values from messy documents. A person confirms every value before it counts. No emissions number is ever produced by a model." },
  { n: "II", h: "Rules calculate.", p: "Versioned, deterministic methodology packs, decimal arithmetic and unit checks. The same inputs always give the same result." },
  { n: "III", h: "People sign.", p: "Suppliers and accredited verifiers sign with private keys. Change one figure and the signature fails." },
];

const TRACE = [
  "Methodology cbam_steel_and_aluminium v1",
  "Direct emissions: 24.000000 tCO2",
  "Indirect emissions: not counted for these goods",
  "Precursor steel: 100 t at 2.4 tCO2 per tonne (actual) = 240.000000 tCO2",
  "Plant total: 264.000000 tCO2",
  "bolts: share 264.000000 tCO2 over 100 t gives 2.64000 tCO2 per tonne",
];

export function PrinciplesScene() {
  return (
    <section id="principles" className="paper-scene" data-scene="6">
      <Reveal>
        <span className="mono kicker dark">PRINCIPLES</span>
        <h2 className="serif h2">Not a chatbot. A system of record.</h2>
      </Reveal>
      <div className="principles-grid">
        {PRINCIPLES.map((p, i) => (
          <Reveal key={p.n} delay={i * 0.1} className="principle-col">
            <span className="mono idx">{p.n}</span>
            <h3 className="serif">{p.h}</h3>
            <p>{p.p}</p>
          </Reveal>
        ))}
      </div>
      <Reveal>
        <div className="code-panel">
          <div className="panel-head mono"><span>CALCULATION TRACE</span><span>statement #2</span></div>
          {TRACE.map((line, i) => (
            <motion.div key={line} className="mono code-line" initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.18 }}>
              <span className="ln">{String(i + 1).padStart(2, "0")}</span>{line}
            </motion.div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
