// landing/LandingPage.tsx
// The public front door. Sections, top to bottom:
//   1. Hero            the promise and an animated picture of it
//   2. Stats           why now (public facts, with sources in the footer)
//   3. How it works    four cards with small live animations
//   4. Principles      "AI reads, rules calculate, people sign"
//   5. Persona picker  step into the supply chain (the demo entry)
//
// Entering a persona plays a full screen wipe, then opens the app.

import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../ui/Button";
import { CountUp } from "../ui/CountUp";
import { Icon, Logo } from "../ui/Icons";
import { Reveal } from "../ui/Reveal";
import { SpotCard } from "../ui/SpotCard";
import { useToast } from "../ui/Toast";
import { HeroGraph } from "./HeroGraph";
import { HowCards } from "./HowCards";

interface Persona { key: string; name: string; role: string; about: string }

const LOOKS: Record<string, { icon: string; label: string; line: string }> = {
  mill: { icon: "factory", label: "Upstream", line: "Publish a verified number once. Share it with every customer." },
  bolts: { icon: "bolt", label: "Downstream SME", line: "Turn bills and logs into a statement your EU buyer accepts." },
  verifier: { icon: "shield", label: "Accredited verifier", line: "Audit faster. Every figure drills to its evidence." },
  importer: { icon: "ship", label: "EU importer", line: "See verified suppliers and what each saves you." },
};

export function LandingPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [entering, setEntering] = useState<Persona | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const lift = useTransform(scrollYProgress, [0, 1], [0, -80]);

  useEffect(() => {
    api<Persona[]>("/demo/personas").then(setPersonas).catch(() =>
      toast.error("Cannot reach the backend", "Start it on port 8000, then refresh."));
  }, []);

  async function enter(persona: Persona) {
    setEntering(persona);
    try {
      const [result] = await Promise.all([
        api<{ token: string }>(`/demo/enter/${persona.key}`, { method: "POST" }),
        new Promise((done) => setTimeout(done, 900)),
      ]);
      await signIn(result.token);
      navigate(persona.role === "supplier" ? "/plant" : "/statements");
    } catch (problem) {
      setEntering(null);
      toast.error("Could not enter", (problem as Error).message);
    }
  }

  return (
    <div className="landing">
      <nav className="land-nav">
        <Logo />
        <div className="land-links">
          <a href="#how">How it works</a>
          <a href="#principles">Principles</a>
          <Button variant="ember" size="small" onClick={() =>
            document.getElementById("enter")?.scrollIntoView({ behavior: "smooth" })}>
            Open the demo
          </Button>
        </div>
      </nav>

      <header className="hero" ref={heroRef}>
        <motion.div className="hero-copy" style={{ y: lift }}>
          <motion.span className="pill ember" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Icon name="flame" size={14} /> EU CBAM is live since January 2026
          </motion.span>
          <h1 className="serif hero-title">
            {["Carbon", "proof", "your", "EU", "buyers"].map((word, i) => (
              <motion.span key={word + i} className="word"
                initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
                {word}
              </motion.span>
            ))}
            <motion.em className="ember"
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.5, duration: 0.8 }}>can trust.</motion.em>
          </h1>
          <motion.p className="hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            Temper turns a factory's everyday records into signed, auditable
            emissions statements, and links them from mill to maker to
            importer, so nobody pays the punishing default.
          </motion.p>
          <motion.div className="hero-cta" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
            <Button variant="ember" size="big" onClick={() =>
              document.getElementById("enter")?.scrollIntoView({ behavior: "smooth" })}>
              Step into the supply chain <Icon name="arrow" />
            </Button>
            <Button variant="ghost" size="big" onClick={() =>
              document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>
              See how it works
            </Button>
          </motion.div>
        </motion.div>
        <HeroGraph />
      </header>

      <section className="stats">
        {[
          { v: 35.1, d: 1, s: "%", t: "fall in India's iron and steel exports to the EU in FY25, before CBAM payments began", src: "GTRI" },
          { v: 2027, d: 0, s: "", t: "year importers must buy certificates for the carbon in their goods", src: "EU CBAM" },
          { v: 30, d: 0, s: "%", t: "mark-up on default values by 2028. Real data is the only way out.", src: "EU Commission" },
        ].map((stat, i) => (
          <Reveal key={stat.t} delay={i * 0.12} className="stat">
            <div className="serif stat-n"><CountUp value={stat.v} decimals={stat.d} suffix={stat.s} grouping={false} /></div>
            <p>{stat.t}</p>
            <span className="eyebrow">{stat.src}</span>
          </Reveal>
        ))}
      </section>

      <section id="how" className="section">
        <Reveal><span className="eyebrow">How it works</span>
          <h2 className="serif section-title">From a pile of bills to a number an auditor signs.</h2></Reveal>
        <HowCards />
      </section>

      <section id="principles" className="section dark-band">
        <Reveal><span className="eyebrow light">Principles</span>
          <h2 className="serif section-title light">Not a chatbot. A system of record.</h2></Reveal>
        <div className="principles">
          {[
            { h: "AI reads.", p: "Models extract values from messy bills. A person confirms every one before it counts." },
            { h: "Rules calculate.", p: "Every emissions number comes from versioned, deterministic rules. Re-run it in five years and get the same answer." },
            { h: "People sign.", p: "Suppliers and accredited verifiers sign with cryptographic keys. Change one figure and the signature breaks." },
          ].map((item, i) => (
            <Reveal key={item.h} delay={i * 0.12}>
              <div className="principle">
                <h3 className="serif">{item.h}</h3><p>{item.p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="enter" className="section">
        <Reveal><span className="eyebrow">Live demo</span>
          <h2 className="serif section-title">Step into the supply chain.</h2>
          <p className="muted lead">Pick a role. No password. Follow the chain left to right.</p></Reveal>
        <div className="persona-row">
          {personas.map((p, i) => {
            const look = LOOKS[p.key];
            return (
              <Reveal key={p.key} delay={i * 0.1}>
                <SpotCard className="persona-card" onClick={() => enter(p)}>
                  <div className="persona-top">
                    <span className="persona-icon"><Icon name={look?.icon ?? "factory"} size={22} /></span>
                    <span className="eyebrow">{look?.label}</span>
                  </div>
                  <h3>{p.name}</h3>
                  <p className="muted">{look?.line}</p>
                  <span className="persona-go">Enter <Icon name="arrow" size={16} /></span>
                </SpotCard>
                {i < personas.length - 1 && <span className="chain-dot" />}
              </Reveal>
            );
          })}
        </div>
      </section>

      <footer className="land-foot">
        <Logo size={22} />
        <p className="muted">
          Facts from GTRI (via AlCircle), EY, CMS and the EU Official Journal.
          Demo data is synthetic. Not a regulatory filing.
        </p>
      </footer>

      <AnimatePresence>
        {entering && (
          <motion.div className="wipe" initial={{ clipPath: "circle(0% at 50% 80%)" }}
            animate={{ clipPath: "circle(150% at 50% 80%)" }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Logo size={40} />
              <p className="serif wipe-text">Opening {entering.name}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
