// studio/parts/Modal.tsx
// A plain centered dialog for the one focused thing you are doing
// (sign, share, review, estimate a saving). Click outside or press
// Escape to close.

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Icon } from "../../ui/Icons";

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.25 }}>
            <div className="modal-head"><h3>{title}</h3><button className="modal-x" onClick={onClose} aria-label="Close"><Icon name="x" size={15} /></button></div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
