// features/plant/DataComposer.tsx
// Add one confirmed record: a fuel, electricity or output quantity.
//
// Guidance built in: suggestion chips for names and units, red field
// outlines for bad input, and a button that says WHY it is disabled
// instead of silently doing nothing.

import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "../../ui/Button";

type Kind = "fuel" | "electricity" | "output";

const SUGGESTIONS: Record<Kind, { names: string[]; units: string[] }> = {
  fuel: { names: ["coal", "natural_gas", "diesel"], units: ["tonne", "gj"] },
  electricity: { names: ["grid_india"], units: ["kwh", "mwh"] },
  output: { names: ["steel_coil", "bolts"], units: ["tonne"] },
};

export interface NewRecord {
  kind: Kind; name: string; amount: string; unit: string;
}

interface Props {
  hasPlant: boolean;
  hasEvidence: boolean;
  onAdd: (record: NewRecord) => Promise<void>;
}

export function DataComposer({ hasPlant, hasEvidence, onAdd }: Props) {
  const [kind, setKind] = useState<Kind>("fuel");
  const [name, setName] = useState("coal");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("tonne");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const amountBad = amount !== "" && !(Number(amount) > 0);
  const missing = !hasPlant
    ? "Add a plant first."
    : !hasEvidence
    ? "Upload evidence first, every number needs a source."
    : !name.trim()
    ? "Give the record a name."
    : !(Number(amount) > 0)
    ? "Enter an amount greater than zero."
    : undefined;

  function pickKind(next: Kind) {
    setKind(next);
    setName(SUGGESTIONS[next].names[0]);
    setUnit(SUGGESTIONS[next].units[0]);
  }

  async function submit() {
    setTouched(true);
    setBusy(true);
    try {
      await onAdd({ kind, name: name.trim(), amount, unit });
      setAmount("");
      setTouched(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="seg">
        {(["fuel", "electricity", "output"] as Kind[]).map((k) => (
          <button key={k} className={kind === k ? "on" : ""} onClick={() => pickKind(k)}>
            {kind === k && (
              <motion.span layoutId="seg-pill" className="seg-pill"
                transition={{ type: "spring", stiffness: 420, damping: 32 }} />
            )}
            <span style={{ position: "relative" }}>{k}</span>
          </button>
        ))}
      </div>

      <div className="row">
        <div className="field grow">
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field grow">
          <label>Amount</label>
          <input className={`input ${amountBad || (touched && !amount) ? "invalid" : ""}`}
            inputMode="decimal" placeholder="e.g. 1000" value={amount}
            onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="field" style={{ width: 120 }}>
          <label>Unit</label>
          <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {["tonne", "kg", "gj", "kwh", "mwh"].map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="suggest">
        {SUGGESTIONS[kind].names.map((n) => (
          <button key={n} onClick={() => setName(n)}>{n}</button>
        ))}
      </div>

      <div>
        <Button variant="ember" loading={busy} disabledReason={missing} onClick={submit}>
          Add to ledger
        </Button>
      </div>
    </div>
  );
}
