// landing/scenes/HeroScene.tsx
// Scene 1: the opening, full screen. An animated field of heat fills
// the viewport and warms under your pointer. Over it: the headline,
// one sentence, the main action, a rotating card of real facts, and a
// strip naming the standards and technology Temper is built on.
//
// The interactive supply chain world follows in the next scene.

import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Cta } from "../parts/Cta";
import { LogoStrip } from "../parts/LogoStrip";
import { ProofCarousel } from "../parts/ProofCarousel";
import { DitherField } from "../hero/DitherField";
import { useEnter } from "../EnterContext";

export function HeroScene() {
  const { personas } = useEnter();
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="hero-full" data-scene="1">
      <DitherField />
      <div className="hero-vignette" aria-hidden />
      <ProofCarousel />

      <div className="hero-content">
        <motion.span className="mono kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          EU CBAM / DEFINITIVE PERIOD 2026
        </motion.span>
        <h1 className="serif display">
          <span className="clip"><motion.span className="line" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>Carbon,</motion.span></span>
          <span className="clip"><motion.em className="line ember-text" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}>tempered.</motion.em></span>
        </h1>
        <motion.p className="lede" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          Signed, verifiable emissions data for every tonne of steel and aluminium
          you export, linked from mill to maker to importer, so nobody pays the
          punishing default.
        </motion.p>
        <motion.div className="hero-actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
          <Cta tone="ember" disabled={personas.length === 0} onClick={() => go("enter")}>Enter the demo</Cta>
          <button className="text-link" onClick={() => go("world")}>See the supply chain</button>
          <Link className="text-link" to="/architecture">Read the architecture</Link>
        </motion.div>
      </div>

      <LogoStrip />
    </section>
  );
}
