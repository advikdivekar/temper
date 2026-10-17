// landing/scenes/WorldScene.tsx
// Scene 2: hold to follow ONE number through a supply chain.
//
// The hold is a timeline. Holding the button for about five seconds
// plays four stages in a fixed order:
//   1 the mill records its data
//   2 a verifier signs it off
//   3 the bolt works links to the verified number
//   4 the importer sees the saving
// Let go early and everything drains back, so you always see the
// stages in order and never skip ahead. A caption beside the picture
// says which stage you are in and what is happening, and four bars
// fill as you go.
//
// How: the hold gives a progress value from 0 to 1. Each part of the
// picture is a simple function of that value (for example, the
// verifier lights up between 20 and 40 percent). Nothing is stored
// per stage, so the picture can never disagree with the caption.
//
// Fallbacks: Space or Enter held works like a pointer hold, and
// "Show the result" jumps straight to the end.

import { motion, useMotionValueEvent, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import { useState } from "react";
import { Reveal } from "../../ui/Reveal";
import { ChainWorld } from "../world/ChainWorld";
import type { NodeKey, WorldState } from "../world/ChainWorld";
import { useHold } from "../world/useHold";

const clamp = (v: number) => Math.max(0, Math.min(1, v));
// Progress between two points on the 0 to 1 timeline, as 0 to 1.
const between = (p: number, from: number, to: number) => clamp((p - from) / (to - from));

// Where each stage starts on the timeline.
const STARTS = [0, 0.2, 0.45, 0.72];

const STAGES: { focus: NodeKey; title: string; text: string }[] = [
  { focus: "mill", title: "The mill records its data", text: "It uploads its bills and the engine calculates 2.40 tCO2 per tonne of steel." },
  { focus: "verifier", title: "A verifier signs it off", text: "They check the evidence and sign, so the mill's number now counts as verified." },
  { focus: "bolts", title: "The bolt works links to it", text: "Its steel now carries verified data, so its figure falls from 4.95 to 2.64." },
  { focus: "importer", title: "The importer sees the saving", text: "It receives 2.64 with proof of who signed it, 47% below the default." },
];

function useDerived(progress: MotionValue<number>, fn: (p: number) => number) {
  return useTransform(progress, fn);
}

export function WorldScene() {
  const [stage, setStage] = useState(-1);      // -1 idle, 0 to 3 playing
  const [done, setDone] = useState(false);
  const hold = useHold({ holdMs: 5200, drainMs: 1400, onComplete: () => setDone(true) });
  const p = hold.progress;

  // Which stage are we in? Update React state only when it changes.
  useMotionValueEvent(p, "change", (v) => {
    const next = v <= 0 ? -1 : STARTS.filter((s) => v >= s).length - 1;
    setStage((s) => (s === next ? s : next));
    if (v < 1) setDone((d) => (d ? false : d));
  });

  const state: WorldState = {
    mill: useDerived(p, (v) => between(v, 0, 0.14)),
    verifier: useDerived(p, (v) => between(v, 0.2, 0.34)),
    roadA: useDerived(p, (v) => between(v, 0.45, 0.58)),
    bolts: useDerived(p, (v) => between(v, 0.45, 0.62)),
    boltsNumber: useDerived(p, (v) => 4.95 - (4.95 - 2.64) * between(v, 0.48, 0.66)),
    roadB: useDerived(p, (v) => between(v, 0.72, 0.82)),
    importer: useDerived(p, (v) => between(v, 0.72, 0.86)),
    saving: useDerived(p, (v) => 47 * between(v, 0.76, 0.92)),
  };
  const dashOffset = useTransform(p, (v) => (1 - v) * 213.6);
  const segments = STARTS.map((start, i) => {
    const end = i === STARTS.length - 1 ? 1 : STARTS[i + 1];
    return useTransform(p, (v) => between(v, start, end));
  });

  const current = stage >= 0 ? STAGES[stage] : null;
  const caption = done
    ? { n: "DONE", title: "That is the whole chain", text: "4.95 became 2.64, and every step along the way is signed." }
    : current
      ? { n: `STEP ${stage + 1} OF 4`, title: current.title, text: current.text }
      : { n: "READY", title: "Hold to follow one number", text: "Today the EU default applies: the bolt works shows 4.95, and the importer pays for the gap." };

  return (
    <section id="world" className="world-scene">
      <Reveal className="world-copy">
        <span className="mono kicker">THE SUPPLY CHAIN</span>
        <h2 className="serif h2">Follow one number.</h2>

        <div className="guide" aria-live="polite">
          <div className="guide-segments" aria-hidden>
            {segments.map((s, i) => (<i key={i}><motion.b style={{ scaleX: s }} /></i>))}
          </div>
          <span className="mono kicker guide-count">{caption.n}</span>
          <h3 key={caption.title} className="guide-title">{caption.title}</h3>
          <p key={caption.text} className="guide-text">{caption.text}</p>
        </div>
      </Reveal>

      <div className="hero-world">
        <div className="world-stage">
          <ChainWorld state={state} focus={done ? null : current?.focus ?? null} />
          <div className="hold-dock">
            {!done ? (
              <>
                <button className="hold-btn" aria-label="Hold to follow the number through the chain. Press and hold Space or Enter."
                  onPointerDown={hold.begin} onPointerUp={hold.end} onPointerLeave={hold.end} onPointerCancel={hold.end}
                  onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); hold.begin(); } }}
                  onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") hold.end(); }}>
                  <svg viewBox="0 0 80 80" aria-hidden>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
                    <motion.circle cx="40" cy="40" r="34" fill="none" stroke="#ff5a1f" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray="213.6" style={{ strokeDashoffset: dashOffset }} transform="rotate(-90 40 40)" />
                  </svg>
                  <span className="mono">HOLD</span>
                </button>
                <button className="text-link small" onClick={hold.finishNow}>Show the result</button>
              </>
            ) : (
              <button className="text-link small" onClick={() => { hold.reset(); setDone(false); }}>Replay</button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
