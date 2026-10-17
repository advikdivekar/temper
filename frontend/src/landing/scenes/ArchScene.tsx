// landing/scenes/ArchScene.tsx
// Scene 7: a short architecture teaser. Five layers, drawn as bands
// that slide in, with AI marked clearly as an edge layer that never
// touches the calculation. The button opens the full interactive
// architecture page.

import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Reveal } from "../../ui/Reveal";
import { Cta } from "../parts/Cta";

const BANDS = [
  { tag: "CLIENTS", title: "Web app / public verifier / API", note: "React, TypeScript, OpenAPI" },
  { tag: "API", title: "FastAPI / roles / bearer tokens", note: "Eight routers, schemas validate every request" },
  { tag: "SERVICES", title: "Statements / supply chain / trust / audit / packs", note: "Business logic, one file per concern" },
  { tag: "ENGINE", title: "certify_engine", note: "Pure Python. No database. No network. No AI.", hot: true },
  { tag: "DATA", title: "Ledger / evidence vault / key store", note: "Append only, content addressed, keys kept apart" },
];

export function ArchScene() {
  const navigate = useNavigate();
  return (
    <section id="architecture" className="dark-scene" data-scene="7">
      <div className="split-2">
        <Reveal className="col-text">
          <span className="mono kicker">ARCHITECTURE</span>
          <h2 className="serif h2">A calculator at the centre. AI at the edges.</h2>
          <p className="muted-light">Every emissions number comes from a pure, deterministic engine. Around it sit a ledger that never forgets, signatures that cannot be faked, and an audit chain that shows tampering. AI reads documents at the edge, and a person always confirms.</p>
          <div style={{ marginTop: 18 }}><Cta onClick={() => navigate("/architecture")}>Explore the full architecture</Cta></div>
        </Reveal>
        <div className="bands">
          {BANDS.map((b, i) => (
            <motion.div key={b.tag} className={`band ${b.hot ? "hot" : ""}`} initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <span className="mono">{b.tag}</span><strong>{b.title}</strong><small>{b.note}</small>
            </motion.div>
          ))}
          <motion.div className="band edge" initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.7 }}>
            <span className="mono">ML PLANE / PLANNED</span><strong>Extraction / evals / retrieval</strong><small>Suggests. A person confirms. Never on the calculation path.</small>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
