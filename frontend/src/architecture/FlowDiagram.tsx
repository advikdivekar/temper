// architecture/FlowDiagram.tsx
// The one architecture diagram: a single vertical flow.
//
// How it reads:
//   * A line (the spine) runs down the page. It fills with ember as
//     you scroll, and a small dot travels along it, like a request
//     moving through the system.
//   * Each step is a node on the spine. Its title and one sentence sit
//     to one side, alternating left and right.
//   * A store or a planned part branches off the other side with a
//     dashed connector. Solid means built. Dashed means planned.
//
// Concepts: useScroll reports how far through the diagram you have
// scrolled. useInView tells a step when it has arrived, so its node
// lights up and stays lit.

import { motion, useInView, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import { FLOW } from "./flow";
import type { FlowStep } from "./flow";

function Step({ step, index }: { step: FlowStep; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -42% 0px" });
  const left = index % 2 === 0;

  const text = (
    <motion.div className={`flow-text ${left ? "to-left" : "to-right"}`} initial={{ opacity: 0, y: 24 }} animate={seen ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
      <span className="mono flow-n">{String(index + 1).padStart(2, "0")}</span>
      <h3 className={step.highlight ? "hot" : ""}>{step.title}</h3>
      <p>{step.text}</p>
      <code>{step.files}</code>
    </motion.div>
  );

  const branch = step.branch ? (
    <motion.div className={`flow-branch ${left ? "to-right" : "to-left"} ${step.branch.planned ? "planned" : ""}`}
      initial={{ opacity: 0 }} animate={seen ? { opacity: 1 } : {}} transition={{ delay: 0.35 }}>
      <i /><span className="mono">{step.branch.label}</span>
    </motion.div>
  ) : null;

  return (
    <div ref={ref} className="flow-step">
      <div className="flow-side">{left ? text : branch}</div>
      <div className="flow-node-col">
        <motion.span className={`flow-node ${step.highlight ? "hot" : ""}`} animate={seen ? { scale: [0.4, 1.25, 1], backgroundColor: step.highlight ? "#ff5a1f" : "#f1f0ee" } : {}} transition={{ duration: 0.6 }} />
      </div>
      <div className="flow-side">{left ? branch : text}</div>
    </div>
  );
}

export function FlowDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 62%", "end 62%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });

  return (
    <div className="flow" ref={ref}>
      <div className="flow-spine" aria-hidden>
        <motion.i className="flow-fill" style={{ scaleY: fill }} />
        <span className="flow-dot" />
      </div>
      {FLOW.map((step, i) => <Step key={step.id} step={step} index={i} />)}
    </div>
  );
}
