// studio/parts/Sheet.tsx
// A panel that slides up from the bottom of the screen over a dimmed
// page. Used for the focused actions on a statement (share, review,
// savings, trace) so they never leave the page or cover the story
// permanently. Escape or a click outside closes it.

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Icon } from "../../ui/Icons";

export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 34 }}>
            <div className="sheet-head">
              <span className="mono kicker">{title}</span>
              <button className="sheet-x" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
