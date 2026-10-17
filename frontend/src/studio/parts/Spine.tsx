// studio/parts/Spine.tsx
// A vertical story with a line down the left. The line fills with
// ember as you scroll, and each step's dot lights when it arrives.
// It is the same idea as the architecture page's flow, used here to
// tell the story of one statement or one chain of events, top to
// bottom, instead of stacking panels.

import { motion, useInView, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import type { ReactNode } from "react";

export function Spine({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 70%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });
  return (
    <div className="spine" ref={ref}>
      <div className="spine-line" aria-hidden><motion.i style={{ scaleY: fill }} /></div>
      {children}
    </div>
  );
}

export function SpineStep({ n, title, note, children }: { n: string; title: string; note?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -35% 0px" });
  return (
    <section className="spine-step" ref={ref}>
      <motion.span className="spine-dot" animate={seen ? { scale: [0.4, 1.3, 1], backgroundColor: "#ff5a1f" } : {}} transition={{ duration: 0.5 }} />
      <motion.div className="spine-body" initial={{ opacity: 0, y: 26 }} animate={seen ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        <header className="spine-head">
          <span className="mono kicker">{n}</span>
          <h2 className="spine-title">{title}</h2>
          {note && <p className="spine-note">{note}</p>}
        </header>
        {children}
      </motion.div>
    </section>
  );
}
