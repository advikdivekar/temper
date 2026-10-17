// landing/scenes/DeckScene.tsx
// Scene 5: "How it works" as a scroll driven slide deck.
//
// The section is very tall (one screen per slide), and inside it a
// full screen panel is "sticky": it stays pinned while you scroll.
// Scroll progress through the tall section decides which slide is
// showing, so scrolling flips through the deck like pages.
//
// Concepts:
//   position: sticky   keeps the panel on screen while the section scrolls
//   useScroll          reports scroll progress through a section, 0 to 1
//   progress rail      small ticks below show where you are and let you
//                      jump to a slide by clicking
//
// Not scroll hijacking: the page still scrolls normally. We only read
// the position. On phones the same layout simply stacks and shrinks.

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useRef, useState } from "react";
import { ChainViz, DeliveryViz, EngineViz, EvidenceViz, LedgerViz, TrustViz } from "../deck/Visuals";

const SLIDES = [
  { n: "01", title: "Capture the evidence", tags: ["SHA256", "CONTENT ADDRESSED", "TAMPER CHECK"], viz: EvidenceViz,
    text: "Bills, invoices and logs go into a vault, each stored under its fingerprint. Swap a single byte and the file no longer matches its name." },
  { n: "02", title: "Confirm into a ledger that never forgets", tags: ["APPEND ONLY", "TWO CLOCKS", "TIME TRAVEL"], viz: LedgerViz,
    text: "A person confirms every value before it counts. Corrections never overwrite: they add a row that supersedes the old one, so you can always see what the records said on any date." },
  { n: "03", title: "Calculate with rules, not guesses", tags: ["DECIMAL MATHS", "VERSIONED METHOD", "FULL TRACE"], viz: EngineViz,
    text: "A deterministic engine applies the methodology and records every step. No number is produced by a language model. Re-run it in five years and get the same answer." },
  { n: "04", title: "Link the chain", tags: ["PRECURSORS", "STALE TRACKING", "NO CYCLES"], viz: ChainViz,
    text: "A bolt maker points at its mill's verified statement. When the mill revises, everything downstream is flagged and rebuilt in dependency order." },
  { n: "05", title: "Sign and verify", tags: ["ED25519", "VERIFIER OPINION", "AUDIT CHAIN"], viz: TrustViz,
    text: "Suppliers sign. Accredited verifiers add a signed opinion. Every action lands in a hash chained log, so a rewritten history shows itself." },
  { n: "06", title: "Share what matters, prove the rest", tags: ["SHARE GRANTS", "SELECTIVE DISCLOSURE", "VERIFICATION PACK"], viz: DeliveryViz,
    text: "Importers see the result, its verification and the saving, never raw volumes. A downloadable pack lets any auditor check it independently, with no account." },
];

export function DeckScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    setIndex(Math.min(SLIDES.length - 1, Math.max(0, Math.floor(p * SLIDES.length))));
  });

  function jump(i: number) {
    const el = ref.current;
    if (!el) return;
    const top = el.offsetTop + (el.offsetHeight - window.innerHeight) * ((i + 0.5) / SLIDES.length);
    window.scrollTo({ top, behavior: "smooth" });
  }

  const slide = SLIDES[index];
  const Viz = slide.viz;

  return (
    <section id="how" className="deck" ref={ref} data-scene="5" style={{ height: `${SLIDES.length * 100}vh` }}>
      <div className="deck-pin">
        <div className="deck-head">
          <span className="mono kicker">HOW IT WORKS</span>
          <span className="mono kicker">{slide.n} / 0{SLIDES.length}</span>
        </div>
        <div className="deck-stage">
          <AnimatePresence mode="wait">
            <motion.div key={slide.n} className="deck-text" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              <span className="deck-num serif">{slide.n}</span>
              <h2 className="serif h2">{slide.title}</h2>
              <p className="muted-light">{slide.text}</p>
              <div className="tags">{slide.tags.map((t) => <span key={t} className="tag small">{t}</span>)}</div>
            </motion.div>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.div key={slide.n + "v"} className="deck-viz" initial={{ opacity: 0, scale: 0.94, x: 40 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.97, x: -30 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <Viz />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="deck-rail" role="tablist" aria-label="Slides">
          {SLIDES.map((s, i) => (
            <button key={s.n} role="tab" aria-selected={i === index} className={i === index ? "on" : i < index ? "past" : ""} onClick={() => jump(i)}>
              <i><motion.b initial={false} animate={{ width: i < index ? "100%" : i === index ? "100%" : "0%" }} transition={{ duration: 0.5 }} /></i>
              <span className="mono">{s.n}</span>
            </button>
          ))}
        </div>
        <span className="mono deck-hint">Scroll to continue</span>
      </div>
    </section>
  );
}
