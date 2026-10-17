// ui/Toast.tsx
// Notifications that slide in at the bottom right.
//
// Why: errors used to appear as a small line at the top of the page
// and were easy to miss. A toast is large, coloured, and stays long
// enough to read. Errors stay 8 seconds, successes 3.5.
//
// Concept: React Context again. Any component calls useToast() and
// then toast.error("...") or toast.success("...").

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icons";

interface ToastItem {
  id: number;
  kind: "error" | "success" | "info";
  title: string;
  message?: string;
}

interface ToastApi {
  error: (title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastItem["kind"], title: string, message?: string) => {
      const id = nextId++;
      setItems((current) => [...current, { id, kind, title, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 8000 : 3500);
    },
    [dismiss],
  );

  const api: ToastApi = {
    error: (title, message) => push("error", title, message),
    success: (title, message) => push("success", title, message),
    info: (title, message) => push("info", title, message),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              className={`toast ${item.kind}`}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              role="alert"
            >
              <Icon name={item.kind === "error" ? "x" : "check"} />
              <div>
                <strong>{item.title}</strong>
                {item.message && <span>{item.message}</span>}
              </div>
              <button className="x" onClick={() => dismiss(item.id)}>
                <Icon name="x" size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
