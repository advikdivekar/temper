// landing/parts/FloatingCta.tsx
// The slim pill fixed to the bottom of the screen, always one click
// from the main action. It appears once you scroll past the hero and
// hides when the persona section is already on screen. The menu
// button opens a small list of personas so you can enter from here.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Icon } from "../../ui/Icons";
import { useEnter } from "../EnterContext";

export function FloatingCta() {
  const { personas, enter } = useEnter();
  const [past, setPast] = useState(false);
  const [covered, setCovered] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Hide the pill where it would cover something: the persona list,
    // and the slide deck's progress rail.
    const watcher = new IntersectionObserver((entries) => {
      setCovered((c) => {
        const next = { ...c };
        for (const e of entries) next[e.target.id] = e.isIntersecting;
        return next;
      });
    }, { threshold: 0.3 });
    for (const id of ["enter", "how"]) {
      const target = document.getElementById(id);
      if (target) watcher.observe(target);
    }
    return () => { window.removeEventListener("scroll", onScroll); watcher.disconnect(); };
  }, []);

  const show = past && !covered.enter && !covered.how;
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fcta" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}>
          <AnimatePresence>
            {menu && (
              <motion.ul className="fcta-menu" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                {personas.map((p) => (
                  <li key={p.key}><button onClick={() => enter(p)}>{p.name}<span className="mono">{p.role}</span></button></li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
          <div className="fcta-bar">
            <span className="fcta-mark" aria-hidden />
            <button className="fcta-main" onClick={() => document.getElementById("enter")?.scrollIntoView({ behavior: "smooth" })}>
              Enter the demo
            </button>
            <button className="fcta-more" aria-label="Choose a persona" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <Icon name={menu ? "x" : "plus"} size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
