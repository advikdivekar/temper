// landing/EnterContext.tsx
// Shared "enter the demo as a persona" logic for the whole landing
// page. Several places can start it (hero button, floating pill,
// persona list), so it lives in one provider.
//
// Entering plays a short full screen wipe, then signs in through the
// demo endpoint and opens the right first page for that role.

import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Logo } from "../ui/Icons";
import { useToast } from "../ui/Toast";

export interface Persona { key: string; name: string; role: string; about: string }

interface EnterValue {
  personas: Persona[];
  enter: (persona: Persona) => Promise<void>;
}

const EnterContext = createContext<EnterValue | null>(null);

export function EnterProvider({ children }: { children: ReactNode }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [entering, setEntering] = useState<Persona | null>(null);

  useEffect(() => {
    api<Persona[]>("/demo/personas").then(setPersonas).catch(() =>
      toast.error("Cannot reach the backend", "Start it on port 8000, then refresh."));
  }, []);

  async function enter(persona: Persona) {
    setEntering(persona);
    try {
      const [result] = await Promise.all([
        api<{ token: string }>(`/demo/enter/${persona.key}`, { method: "POST" }),
        new Promise((done) => setTimeout(done, 900)),
      ]);
      await signIn(result.token);
      navigate(persona.role === "supplier" ? "/plant" : "/statements");
    } catch (problem) {
      setEntering(null);
      toast.error("Could not enter", (problem as Error).message);
    }
  }

  return (
    <EnterContext.Provider value={{ personas, enter }}>
      {children}
      <AnimatePresence>
        {entering && (
          <motion.div className="wipe" initial={{ clipPath: "circle(0% at 50% 85%)" }}
            animate={{ clipPath: "circle(150% at 50% 85%)" }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Logo size={40} />
              <p className="serif wipe-text">Opening {entering.name}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </EnterContext.Provider>
  );
}

export function useEnter(): EnterValue {
  const value = useContext(EnterContext);
  if (!value) throw new Error("useEnter must be used inside EnterProvider");
  return value;
}
