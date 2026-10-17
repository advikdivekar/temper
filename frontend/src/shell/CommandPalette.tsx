// shell/CommandPalette.tsx
// Press Cmd+K (or Ctrl+K) anywhere to jump to a page or a statement.
//
// How it works: a list of commands is built from the pages your role
// can see plus your statements. Typing filters the list. Arrow keys
// move the highlight, Enter runs the command, Escape closes. This is
// a keyboard first way to move around, common in professional tools.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Statement } from "../api/types";
import { Icon } from "../ui/Icons";
import { navFor } from "./nav";

interface Command { id: string; label: string; hint: string; icon: string; run: () => void }

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [statements, setStatements] = useState<Statement[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(""); setIndex(0);
    setTimeout(() => input.current?.focus(), 30);
    api<Statement[]>("/statements").then(setStatements).catch(() => undefined);
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    if (!me) return [];
    const go = (to: string) => () => { navigate(to); onClose(); };
    const pages = navFor(me.role).flatMap((g) => g.items).map((i) => ({
      id: i.to, label: i.label, hint: "Go to page", icon: i.icon, run: go(i.to),
    }));
    const extras: Command[] = [
      { id: "verify", label: "Verify a pack", hint: "Public tool", icon: "shield", run: go("/verify") },
      { id: "arch", label: "System architecture", hint: "How Temper works", icon: "link", run: go("/architecture") },
      { id: "out", label: "Switch persona", hint: "Sign out", icon: "x", run: () => { signOut(); navigate("/"); onClose(); } },
    ];
    const stmts = statements.map((s) => ({
      id: `s${s.id}`, label: `Statement #${s.id}: ${s.supplier}`,
      hint: `${s.period_start} to ${s.period_end}`, icon: "file", run: go(`/statements/${s.id}`),
    }));
    return [...pages, ...extras, ...stmts];
  }, [me, statements, navigate, onClose, signOut]);

  const shown = commands.filter((c) => (c.label + c.hint).toLowerCase().includes(query.toLowerCase())).slice(0, 9);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, shown.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && shown[index]) shown[index].run();
    if (e.key === "Escape") onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="palette-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="palette" role="dialog" aria-label="Command palette" initial={{ opacity: 0, y: -14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }} transition={{ type: "spring", stiffness: 380, damping: 30 }} onClick={(e) => e.stopPropagation()}>
            <input ref={input} value={query} onChange={(e) => { setQuery(e.target.value); setIndex(0); }} onKeyDown={onKey}
              placeholder="Jump to a page or statement" aria-label="Search commands" />
            <ul>
              {shown.map((c, i) => (
                <li key={c.id}>
                  <button className={i === index ? "on" : ""} onMouseEnter={() => setIndex(i)} onClick={c.run}>
                    <Icon name={c.icon} size={16} /><span>{c.label}</span><small className="mono">{c.hint}</small>
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="palette-empty">No matches</li>}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
