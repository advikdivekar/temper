// landing/scenes/WorldScene.tsx
// Scene 2: an explorable world. A small isometric supply chain that
// you can touch. Hold the ingot at the centre to "temper" the chain,
// which turns the world from cold steel to ember and drops the carbon
// number from the EU default to the verified figure.
//
// Fallbacks so nobody is stuck:
//   * Space or Enter held on the button works like a pointer hold
//   * "Temper instantly" completes it with one click
//   * Each building is selectable and explained in plain text

import { motion, useTransform } from "motion/react";
import { useState } from "react";
import { Reveal } from "../../ui/Reveal";
import { Ticker } from "../parts/Ticker";
import { ChainWorld } from "../world/ChainWorld";
import type { NodeKey } from "../world/ChainWorld";
import { useHold } from "../world/useHold";

const NODE_INFO: Record<NodeKey, { name: string; role: string; text: string }> = {
  mill: { name: "Steel Mill", role: "Upstream supplier", text: "Builds one signed, verified statement and shares it with every customer, instead of answering the same data request again and again." },
  bolts: { name: "Bolt Works", role: "Downstream SME", text: "Links its steel to the mill's verified number. Until that number exists, the EU default applies and the buyer pays for the gap." },
  verifier: { name: "Verifier", role: "Accredited third party", text: "Drills from every figure to its evidence and the exact calculation, then signs an opinion. Only verified data counts as actual." },
  importer: { name: "EU Importer", role: "Authorised declarant", text: "Sees the result and its verification, never the raw plant data, and what each supplier saves against the penalty default." },
};

export function WorldScene() {
  const [tempered, setTempered] = useState(false);
  const [selected, setSelected] = useState<NodeKey>("bolts");
  const hold = useHold({ holdMs: 1700, drainMs: 900, onComplete: () => setTempered(true) });
  // How much of the progress ring is still empty (SVG dash offset).
  const dashOffset = useTransform(hold.progress, (p) => (1 - p) * 213.6);
  const info = NODE_INFO[selected];

  return (
    <section id="world" className="world-scene" data-scene="2">
      <Reveal className="world-copy">
        <span className="mono kicker">THE SUPPLY CHAIN</span>
        <h2 className="serif h2">Hold the ingot.<br /><em className="ember-text">Watch the chain temper.</em></h2>
        <p className="muted-light">A bolt's carbon is mostly the steel inside it. Until the mill's number is verified, everyone downstream is stuck with the default. Press and hold, and see what changes when the data is real.</p>
      </Reveal>

      <div className="hero-world">
        <div className="world-stage">
          <ChainWorld heat={hold.progress} selected={selected} tempered={tempered} onSelect={setSelected} />
          <div className="hold-dock">
            {!tempered ? (
              <>
                <button className="hold-btn" aria-label="Hold to temper the supply chain. Press and hold Space or Enter."
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
                <span className="mono hold-hint">Hold to temper the chain</span>
                <button className="text-link small" onClick={hold.finishNow}>Temper instantly</button>
              </>
            ) : (
              <motion.div className="tempered-note" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <span className="mono">TEMPERED</span>
                <p>The chain now uses verified data. Default 4.95 became 2.64.</p>
                <button className="text-link small" onClick={() => { hold.reset(); setTempered(false); }}>Replay</button>
              </motion.div>
            )}
          </div>
        </div>

        <div className="node-panel" aria-live="polite">
          <div className="node-tabs" role="tablist" aria-label="Explore the supply chain">
            {(Object.keys(NODE_INFO) as NodeKey[]).map((key) => (
              <button key={key} role="tab" aria-selected={selected === key} className={selected === key ? "on" : ""}
                onClick={() => setSelected(key)}>{NODE_INFO[key].name}</button>
            ))}
          </div>
          <motion.div key={selected} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <span className="mono kicker">{info.role}</span>
            <p>{info.text}</p>
          </motion.div>
        </div>
      </div>
      <Ticker />
    </section>
  );
}
