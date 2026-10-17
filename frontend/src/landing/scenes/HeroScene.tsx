// landing/scenes/HeroScene.tsx
// Scene 1: the opening, full screen. A still sky of dithered clouds,
// a centred headline, one action, and a line chart drawn across the
// clouds that tells the product's story. Calm on purpose: nothing here
// reacts to the pointer or to scrolling.
//
// The interactive supply chain world follows in the next scene.

import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Cta } from "../parts/Cta";
import { ChartOverlay } from "../hero/ChartOverlay";
import { FactoryField } from "../hero/FactoryField";
import { useEnter } from "../EnterContext";

export function HeroScene() {
  const { personas } = useEnter();
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="hero-sky" data-scene="1">
      <div className="sky-matrix" aria-hidden />
      <FactoryField />
      <ChartOverlay />
      <span className="mono hero-note">Illustrative: synthetic demo figures</span>

      <div className="hero-center">
        <motion.span className="hero-tag mono" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <i /> EU CBAM / DEFINITIVE PERIOD 2026
        </motion.span>
        <motion.h1 className="hero-headline" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
          Carbon data your<br />buyers can trust
        </motion.h1>
        <motion.p className="hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          Signed, verifiable emissions data, from mill to maker to importer.
        </motion.p>
        <motion.div className="hero-cta-row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
          <button className="pill-cta" disabled={personas.length === 0} onClick={() => go("enter")}>Enter the demo</button>
          <Link className="hero-link" to="/architecture">Read the architecture</Link>
        </motion.div>
      </div>
    </section>
  );
}
