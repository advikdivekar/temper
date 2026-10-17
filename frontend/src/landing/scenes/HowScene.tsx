// landing/scenes/HowScene.tsx
// Scene 4: how Temper works, as a numbered list (not a grid of
// cards). Hovering or focusing a row changes the live preview on the
// right. Each row has outlined tags for the real mechanisms used.

import { useState } from "react";
import { Reveal } from "../../ui/Reveal";
import { Icon } from "../../ui/Icons";
import {
  ChainPreview, EnginePreview, FingerprintPreview, SavingsPreview, SignaturePreview,
} from "../parts/Previews";

const STEPS = [
  { n: "01", title: "Fingerprint the evidence", tags: ["SHA256", "CONTENT ADDRESSED", "TAMPER CHECK"],
    text: "Bills, invoices and logs are stored under their hash. A changed file no longer matches its name.", view: <FingerprintPreview /> },
  { n: "02", title: "Calculate with rules, not guesses", tags: ["DECIMAL MATHS", "VERSIONED METHOD", "FULL TRACE"],
    text: "A deterministic engine applies the methodology and records every step. Re-run it in five years, get the same number.", view: <EnginePreview /> },
  { n: "03", title: "Link the chain", tags: ["PRECURSORS", "STALE TRACKING", "NO CYCLES"],
    text: "A maker points at its mill's verified statement. When the mill revises, everything downstream is flagged and recomputed in order.", view: <ChainPreview /> },
  { n: "04", title: "Sign and verify", tags: ["ED25519", "VERIFIER OPINION", "AUDIT CHAIN"],
    text: "Suppliers sign. Accredited verifiers add a signed opinion. Every action lands in a hash chained log that shows tampering.", view: <SignaturePreview /> },
  { n: "05", title: "Share what matters", tags: ["SHARE GRANTS", "REVOCABLE", "SELECTIVE DISCLOSURE"],
    text: "Importers receive the result and its status, never raw volumes, and see what each supplier saves against the default.", view: <SavingsPreview /> },
];

export function HowScene() {
  const [active, setActive] = useState(0);
  return (
    <section id="how" className="paper-scene" data-scene="4">
      <Reveal>
        <span className="mono kicker dark">HOW IT WORKS</span>
        <h2 className="serif h2">From a pile of bills to a number an auditor signs.</h2>
      </Reveal>
      <div className="how-layout">
        <ol className="how-list">
          {STEPS.map((s, i) => (
            <li key={s.n}>
              <button className={`how-row ${active === i ? "on" : ""}`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)}>
                <span className="mono idx">{s.n}</span>
                <span className="how-body">
                  <span className="how-title">{s.title}</span>
                  <span className="tags">{s.tags.map((t) => <span key={t} className="tag small">{t}</span>)}</span>
                  <span className="how-text">{s.text}</span>
                  <span className="how-inline">{active === i && s.view}</span>
                </span>
                <span className="how-arrow"><Icon name="arrow" size={18} /></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="how-preview" key={active}>{STEPS[active].view}</div>
      </div>
    </section>
  );
}
