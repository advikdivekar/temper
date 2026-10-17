// landing/scenes/EnterScene.tsx
// Scene 7: the way in. Four rows, one per role. Each row is a real
// button that signs you into the demo as that persona. Hover moves the
// arrow and brightens the row, a small precise effect.

import { Reveal } from "../../ui/Reveal";
import { Icon } from "../../ui/Icons";
import { useEnter } from "../EnterContext";

const LOOKS: Record<string, { label: string; line: string }> = {
  mill: { label: "UPSTREAM", line: "Publish a verified number once and share it with every customer." },
  bolts: { label: "DOWNSTREAM SME", line: "Turn bills and logs into a statement your EU buyer accepts." },
  verifier: { label: "VERIFIER", line: "Review evidence, check the trace, sign an opinion." },
  importer: { label: "EU IMPORTER", line: "See verified suppliers and what each saves you." },
};

export function EnterScene() {
  const { personas, enter } = useEnter();
  return (
    <section id="enter" className="dark-scene" data-scene="7">
      <Reveal>
        <span className="mono kicker">LIVE DEMO</span>
        <h2 className="serif h2">Step into the supply chain.</h2>
        <p className="muted-light">Pick a role. No password. Follow the chain from top to bottom: mill, verifier, bolt works, importer.</p>
      </Reveal>
      <ul className="enter-list">
        {personas.map((p, i) => (
          <Reveal key={p.key} delay={i * 0.08}>
            <li>
              <button className="enter-row" onClick={() => enter(p)}>
                <span className="mono idx">0{i + 1}</span>
                <span className="enter-name serif">{p.name}</span>
                <span className="mono enter-role">{LOOKS[p.key]?.label}</span>
                <span className="enter-line">{LOOKS[p.key]?.line}</span>
                <span className="how-arrow"><Icon name="arrow" size={20} /></span>
              </button>
            </li>
          </Reveal>
        ))}
        {personas.length === 0 && <li className="muted-light">Waiting for the backend on port 8000...</li>}
      </ul>
    </section>
  );
}
