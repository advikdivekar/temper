// landing/parts/ProofCarousel.tsx
// A glass card in the corner of the hero that rotates through public
// facts. It has Previous, Next and Pause controls and a progress bar,
// like a quote carousel, but every card is a real fact with its
// source. We never invent customer quotes or logos.
//
// The rotation timer is a plain interval that stops while paused, and
// the whole thing is keyboard operable.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Icon } from "../../ui/Icons";

const FACTS = [
  { big: "35.1%", text: "fall in India's iron and steel exports to the EU in FY25, ahead of the CBAM payment phase.", source: "GTRI, via AlCircle" },
  { big: "Feb 2027", text: "Importers must start buying certificates for the carbon in the goods they bring in.", source: "EU CBAM, EY and CMS" },
  { big: "+30%", text: "mark-up on EU default emission values by 2028. Real, verified data is the way out.", source: "Commission, secondary reporting" },
  { big: "~180", text: "downstream steel and aluminium product categories proposed for CBAM from 2028, pending approval.", source: "CMS, proposal" },
];

export function ProofCarousel() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % FACTS.length), 5200);
    return () => clearTimeout(timer);
  }, [index, playing]);

  const fact = FACTS[index];
  return (
    <aside className="proof" aria-label="Key facts">
      <AnimatePresence mode="wait">
        <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
          <div className="proof-big serif">{fact.big}</div>
          <p>{fact.text}</p>
          <span className="mono">{fact.source}</span>
        </motion.div>
      </AnimatePresence>
      <div className="proof-controls">
        <button aria-label="Previous fact" onClick={() => setIndex((index + FACTS.length - 1) % FACTS.length)}><Icon name="arrow" size={14} /></button>
        <button aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)}>{playing ? "II" : "▶"}</button>
        <button aria-label="Next fact" onClick={() => setIndex((index + 1) % FACTS.length)}><Icon name="arrow" size={14} /></button>
        <div className="proof-bars">
          {FACTS.map((_, i) => <i key={i} className={i === index ? "on" : i < index ? "past" : ""} />)}
        </div>
      </div>
    </aside>
  );
}
