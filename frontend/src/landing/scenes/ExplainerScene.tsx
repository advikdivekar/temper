// landing/scenes/ExplainerScene.tsx
// Scene 5: an interactive explainer in the style of a technical
// product page. Three tabs change what the diagram emphasises, and
// one slider changes how much of the steel input has verified data.
//
// The maths is the same as the product demo:
//   direct emissions       0.24 tCO2 per tonne of bolts
//   steel at EU default    4.708 tCO2 per tonne of steel (4.28 + 10%)
//   steel verified by mill 2.40 tCO2 per tonne of steel
//   SEE = 0.24 + default x (1 - share) + verified x share
// Savings use the importer simulator formula at 500 t and 80 euro.
// All numbers are synthetic and labelled as an illustration.

import { motion } from "motion/react";
import { useState } from "react";
import { LiveNumber } from "../../ui/LiveNumber";
import { Reveal } from "../../ui/Reveal";

const DIRECT = 0.24;
const DEFAULT_STEEL = 4.708;
const VERIFIED_STEEL = 2.4;
const TONNES = 500;
const PRICE = 80;

const TABS = [
  { id: "gap", title: "Find the gap", text: "With no verified upstream data, every tonne of steel is counted at the marked-up default, and so is every bolt made from it." },
  { id: "link", title: "Link the chain", text: "As the mill's verified statement covers more of the steel you buy, the bolt maker's number falls along a straight line." },
  { id: "ship", title: "Ship the number", text: "The importer sees the lower figure and its verification, and the saving against the default appears in euros." },
];

export function ExplainerScene() {
  const [tab, setTab] = useState(0);
  const [share, setShare] = useState(0.6);

  const see = DIRECT + DEFAULT_STEEL * (1 - share) + VERIFIED_STEEL * share;
  const defaultSee = DIRECT + DEFAULT_STEEL;
  const saving = (defaultSee - see) * TONNES * PRICE;

  // Plot: x is verified share 0 to 1, y is the resulting number.
  const px = (s: number) => 70 + s * 400;
  const py = (v: number) => 230 - ((v - 2) / 3.2) * 190;

  return (
    <section id="explorer" className="dark-scene" data-scene="5">
      <div className="split-2 wide">
        <Reveal className="col-text">
          <span className="mono kicker">TECHNICAL EXPLAINER</span>
          <h2 className="serif h2">Why data across the whole chain matters.</h2>
          <p className="muted-light">
            A bolt's carbon is mostly the steel inside it. Only verified upstream
            data can lower that part, so one verified mill helps every customer it sells to.
          </p>
          <div className="tab-list" role="tablist" aria-label="Explainer steps">
            {TABS.map((t, i) => (
              <button key={t.id} role="tab" aria-selected={tab === i} className={tab === i ? "on" : ""} onClick={() => setTab(i)}>
                <span className="tab-title">{t.title}</span>
                {tab === i && <motion.span className="tab-text" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>{t.text}</motion.span>}
              </button>
            ))}
          </div>
          <div className="slider-block">
            <label className="mono" htmlFor="share">Steel covered by verified data: {Math.round(share * 100)}%</label>
            <input id="share" className="range-light" type="range" min={0} max={100} value={Math.round(share * 100)}
              onChange={(e) => setShare(Number(e.target.value) / 100)} />
          </div>
        </Reveal>

        <Reveal className="panel tall" delay={0.1}>
          <div className="panel-head mono"><span>BOLTS / tCO2 PER TONNE</span><span>ILLUSTRATIVE DEMO</span></div>
          <svg viewBox="0 0 520 280" width="100%" role="img"
            aria-label={`With ${Math.round(share * 100)} percent verified steel the bolt number is ${see.toFixed(2)}`}>
            {[2, 3, 4, 5].map((v) => (
              <g key={v}>
                <line x1="70" x2="470" y1={py(v)} y2={py(v)} stroke="#fff" strokeOpacity="0.07" />
                <text x="36" y={py(v) + 4} fill="#7c7c7c" fontSize="10" fontFamily="JetBrains Mono">{v}.0</text>
              </g>
            ))}
            <motion.path d={`M ${px(0)} ${py(DIRECT + DEFAULT_STEEL)} L ${px(1)} ${py(DIRECT + VERIFIED_STEEL)}`}
              stroke="#f4f4f4" strokeWidth="2" fill="none" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }} />
            <line x1={px(share)} x2={px(share)} y1={py(see)} y2="240" stroke="#ff5a1f" strokeDasharray="3 4" />
            <motion.circle r="7" fill="#ff5a1f" animate={{ cx: px(share), cy: py(see) }} transition={{ type: "spring", stiffness: 220, damping: 24 }} />
            <text x="70" y="262" fill="#7c7c7c" fontSize="10" fontFamily="JetBrains Mono">0% verified</text>
            <text x="410" y="262" fill="#7c7c7c" fontSize="10" fontFamily="JetBrains Mono">100% verified</text>
            <text x={px(0) + 8} y={py(defaultSee) - 10} fill="#8c8c8c" fontSize="10" fontFamily="JetBrains Mono">EU default 4.95</text>
          </svg>
          <div className="readouts">
            <div className={tab === 0 ? "hot" : ""}><span className="mono">DEFAULT</span><b className="serif">{defaultSee.toFixed(2)}</b></div>
            <div className={tab === 1 ? "hot" : ""}><span className="mono">YOUR NUMBER</span><b className="serif"><LiveNumber value={see} decimals={2} /></b></div>
            <div className={tab === 2 ? "hot" : ""}><span className="mono">IMPORTER SAVES</span><b className="serif"><LiveNumber value={saving} prefix="€" /></b></div>
          </div>
          <p className="caption mono">Synthetic figures, 500 t imported at €80 per certificate, before the free allocation adjustment. Not measured data.</p>
        </Reveal>
      </div>
    </section>
  );
}
