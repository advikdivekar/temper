// landing/parts/FloatingNav.tsx
// The top navigation, in three parts like a modern product site:
//   left    a pill of section links
//   centre  the wordmark
//   right   Verify and the main action
// It floats over the page. On narrow screens the links fold into a
// menu button and the pill shrinks.

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wordmark } from "../../brand/Brand";
import { useEnter } from "../EnterContext";

const LINKS = [
  { id: "world", label: "Chain" },
  { id: "problem", label: "Problem" },
  { id: "how", label: "How it works" },
  { id: "architecture", label: "Architecture" },
];

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function FloatingNav() {
  const [open, setOpen] = useState(false);
  const { personas } = useEnter();
  const navigate = useNavigate();
  return (
    <header className="fnav-wrap">
      <div className="fnav-bar">
        <nav className="fnav fnav-left" aria-label="Main">
          <div className="fnav-links">
            {LINKS.map((l) => (<button key={l.id} onClick={() => go(l.id)}>{l.label}</button>))}
          </div>
          <button className="fnav-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><span /><span /></button>
        </nav>
        <button className="fnav-brand" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Wordmark height={26} tone="light" />
        </button>
        <div className="fnav-right">
          <button className="fnav-verify" onClick={() => navigate("/verify")}>Verify a pack</button>
          <button className="fnav-open" onClick={() => go("enter")} disabled={personas.length === 0}>Open demo</button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="fnav-panel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {LINKS.map((l) => (<button key={l.id} onClick={() => { go(l.id); setOpen(false); }}>{l.label}</button>))}
            <button onClick={() => navigate("/verify")}>Verify a pack</button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
