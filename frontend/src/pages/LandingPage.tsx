// pages/LandingPage.tsx
// The front door. Explains the product in a few lines and lets you
// enter as one of four demo personas. No password needed (demo mode).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface Persona {
  key: string;
  name: string;
  role: string;
  about: string;
}

const STEPS = [
  "A plant uploads bills and enters confirmed records.",
  "The engine calculates emissions per tonne with a full trace.",
  "The statement is signed and a verifier gives an opinion.",
  "A downstream maker links the mill's verified number.",
  "An EU importer sees the result and what it saves versus the default.",
];

export function LandingPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Persona[]>("/demo/personas")
      .then(setPersonas)
      .catch(() => setError("Cannot reach the backend. Is it running on port 8000?"));
  }, []);

  async function enter(persona: Persona) {
    const result = await api<{ token: string }>(`/demo/enter/${persona.key}`, { method: "POST" });
    await signIn(result.token);
    navigate(persona.role === "supplier" ? "/plant" : "/statements");
  }

  return (
    <div className="landing">
      <h1>Temper</h1>
      <p className="tagline">
        Verifiable carbon numbers for the EU border carbon tax (CBAM),
        built from a factory's everyday records and linked across the
        supply chain.
      </p>

      <ol className="steps">
        {STEPS.map((step) => <li key={step}>{step}</li>)}
      </ol>

      <h2>Enter the demo as</h2>
      {error && <p className="error">{error}</p>}
      <div className="persona-grid">
        {personas.map((p) => (
          <button key={p.key} className="persona" onClick={() => enter(p)}>
            <strong>{p.name}</strong>
            <span className="role">{p.role}</span>
            <span>{p.about}</span>
          </button>
        ))}
      </div>
      <p className="hint">
        Suggested order: Steel Mill, then Verifier, then Bolt Works, then EU Importer.
        Use Sign out to switch persona.
      </p>
    </div>
  );
}
