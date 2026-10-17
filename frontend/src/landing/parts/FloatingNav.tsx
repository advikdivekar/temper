// landing/parts/FloatingNav.tsx
// The compact pill navigation at the top. It floats over the page, so
// we keep it small. Links scroll to sections. On narrow screens the
// links collapse into a menu button that opens a small panel.

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Logo } from "../../ui/Icons";
import { useEnter } from "../EnterContext";

const LINKS = [
  { id: "problem", label: "Problem" },
  { id: "how", label: "How" },
  { id: "explorer", label: "Explorer" },
  { id: "principles", label: "Principles" },
];

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function FloatingNav() {
  const [open, setOpen] = useState(false);
  const { personas } = useEnter();
  return (
    <header className="fnav-wrap">
      <nav className="fnav" aria-label="Main">
        <button className="fnav-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Logo size={22} />
        </button>
        <div className="fnav-links">
          {LINKS.map((l) => (
            <button key={l.id} onClick={() => go(l.id)}>{l.label}</button>
          ))}
        </div>
        <button className="fnav-open" onClick={() => go("enter")} disabled={personas.length === 0}>Enter demo</button>
        <button className="fnav-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span /><span />
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div className="fnav-panel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {LINKS.map((l) => (
              <button key={l.id} onClick={() => { go(l.id); setOpen(false); }}>{l.label}</button>
            ))}
            <button onClick={() => { go("enter"); setOpen(false); }}>Enter demo</button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
