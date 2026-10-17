// landing/parts/FloatingNav.tsx
// The top navigation, in three parts like a modern product site:
//   left    a pill of section links
//   centre  the wordmark
//   right   Verify and the main action
// It floats over the page. On narrow screens the links fold into a
// menu button and the pill shrinks.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wordmark } from "../../brand/Brand";

const LINKS = [
  { id: "world", label: "The chain" },
  { id: "problem", label: "Problem" },
  { id: "how", label: "How it works" },
];

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function FloatingNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  // Over the light paper scenes the wordmark turns dark so it stays readable.
  const [onPaper, setOnPaper] = useState(false);
  useEffect(() => {
    const scenes = [...document.querySelectorAll(".paper-scene")];
    const hits = new Set<Element>();
    const watcher = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) hits.add(e.target); else hits.delete(e.target); }
      setOnPaper(hits.size > 0);
    }, { rootMargin: "0px 0px -92% 0px" });
    scenes.forEach((s) => watcher.observe(s));
    return () => watcher.disconnect();
  }, []);
  return (
    <header className="fnav-wrap">
      <div className="fnav-bar">
        <nav className="fnav fnav-left" aria-label="Main">
          <div className="fnav-links">
            {LINKS.map((l) => (<button key={l.id} onClick={() => go(l.id)}>{l.label}</button>))}
            <button onClick={() => navigate("/architecture")}>Architecture</button>
          </div>
          <button className="fnav-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><span /><span /></button>
        </nav>
        <button className="fnav-brand" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Wordmark height={24} tone={onPaper ? "dark" : "light"} />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="fnav-panel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {LINKS.map((l) => (<button key={l.id} onClick={() => { go(l.id); setOpen(false); }}>{l.label}</button>))}
            <button onClick={() => navigate("/architecture")}>Architecture</button>
            <button onClick={() => navigate("/verify")}>Verify a pack</button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
