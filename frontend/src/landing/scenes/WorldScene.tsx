// landing/scenes/WorldScene.tsx
// Scene 2: a guided, step by step walkthrough of ONE number as it
// moves through a supply chain. Five steps, always in the same order,
// with Back and Next, a dot for each step, and an optional Play that
// advances on its own.
//
// Why a sequence: the idea is easy to lose when everything moves at
// once. Here, each step changes one thing in the picture, outlines the
// building it is about, and says in a sentence what is happening.
//
// How it works: the step number picks a row from STEPS. Each row
// lists target values (0 to 1) for the parts of the picture, and we
// animate the picture's values toward them. The picture never decides
// anything itself.

import { animate, useMotionValue } from "motion/react";
import { useEffect, useState } from "react";
import { Reveal } from "../../ui/Reveal";
import { Icon } from "../../ui/Icons";
import { ChainWorld } from "../world/ChainWorld";
import type { NodeKey, WorldState } from "../world/ChainWorld";

interface Targets {
  mill: number; verifier: number; bolts: number; importer: number;
  roadA: number; roadB: number; boltsNumber: number; saving: number;
}

const STEPS: { focus: NodeKey | null; title: string; text: string; to: Targets }[] = [
  { focus: "bolts", title: "Today, the default applies",
    text: "The bolt works buys steel from a mill with no verified data. So the EU default is used, and the importer pays for it.",
    to: { mill: 0, verifier: 0, bolts: 0, importer: 0, roadA: 0, roadB: 0, boltsNumber: 4.95, saving: 0 } },
  { focus: "mill", title: "The mill records its data",
    text: "It uploads its bills and confirms its fuel use. The engine calculates 2.40 tCO2 per tonne of steel.",
    to: { mill: 1, verifier: 0, bolts: 0, importer: 0, roadA: 0, roadB: 0, boltsNumber: 4.95, saving: 0 } },
  { focus: "verifier", title: "A verifier signs it off",
    text: "They check the evidence and the calculation, then sign. Now the mill's number counts as verified.",
    to: { mill: 1, verifier: 1, bolts: 0, importer: 0, roadA: 0, roadB: 0, boltsNumber: 4.95, saving: 0 } },
  { focus: "bolts", title: "The bolt works links to it",
    text: "Its steel now carries the verified number instead of the default, so its own figure falls from 4.95 to 2.64.",
    to: { mill: 1, verifier: 1, bolts: 1, importer: 0, roadA: 1, roadB: 0, boltsNumber: 2.64, saving: 0 } },
  { focus: "importer", title: "The importer sees the saving",
    text: "It receives 2.64 with proof of who signed it. That is 47% below the default it would have paid.",
    to: { mill: 1, verifier: 1, bolts: 1, importer: 1, roadA: 1, roadB: 1, boltsNumber: 2.64, saving: 47 } },
];

export function WorldScene() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const state: WorldState = {
    mill: useMotionValue(0), verifier: useMotionValue(0), bolts: useMotionValue(0), importer: useMotionValue(0),
    roadA: useMotionValue(0), roadB: useMotionValue(0), boltsNumber: useMotionValue(4.95), saving: useMotionValue(0),
  };

  // Move the picture toward the current step's targets.
  useEffect(() => {
    const target = STEPS[step].to;
    const moves = (Object.keys(target) as (keyof Targets)[]).map((key) =>
      animate(state[key], target[key], { duration: 1.1, ease: [0.22, 1, 0.36, 1] }));
    return () => moves.forEach((m) => m.stop());
  }, [step]);

  // Optional autoplay: advance every few seconds, stop at the end.
  useEffect(() => {
    if (!playing) return;
    if (step >= STEPS.length - 1) { setPlaying(false); return; }
    const timer = setTimeout(() => setStep((s) => s + 1), 4800);
    return () => clearTimeout(timer);
  }, [playing, step]);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <section id="world" className="world-scene" data-scene="2">
      <Reveal className="world-copy">
        <span className="mono kicker">THE SUPPLY CHAIN</span>
        <h2 className="serif h2">Follow one number.</h2>

        <div className="guide" role="group" aria-label="Walkthrough">
          <span className="mono kicker guide-count">STEP {step + 1} OF {STEPS.length}</span>
          <h3 key={step + "t"} className="guide-title">{current.title}</h3>
          <p key={step + "p"} className="guide-text">{current.text}</p>

          <div className="guide-dots">
            {STEPS.map((s, i) => (
              <button key={s.title} className={i === step ? "on" : i < step ? "past" : ""} aria-label={`Go to step ${i + 1}: ${s.title}`}
                onClick={() => { setStep(i); setPlaying(false); }} />
            ))}
          </div>

          <div className="guide-controls">
            <button className="guide-btn" disabled={step === 0} onClick={() => { setStep(step - 1); setPlaying(false); }}>
              <Icon name="arrow" size={14} /> Back
            </button>
            <button className="guide-btn primary" onClick={() => { if (last) { setStep(0); } else { setStep(step + 1); } setPlaying(false); }}>
              {last ? "Start again" : step === 0 ? "Start" : "Next"} {!last && <Icon name="arrow" size={14} />}
            </button>
            <button className="guide-link" onClick={() => { if (last) setStep(0); setPlaying(!playing); }}>
              {playing ? "Pause" : "Play automatically"}
            </button>
          </div>
        </div>
      </Reveal>

      <div className="hero-world">
        <div className="world-stage"><ChainWorld state={state} focus={current.focus} /></div>
      </div>
    </section>
  );
}
