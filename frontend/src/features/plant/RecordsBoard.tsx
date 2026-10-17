// features/plant/RecordsBoard.tsx
// The confirmed records, sorted into three lanes: fuel, electricity
// and output. New cards animate in; removed ones animate out.
//
// "Correct" does not edit a record. It adds a replacement that points
// at the old one, so history is never lost (the append only ledger).

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { ActivityRecord } from "../../api/types";
import { Button } from "../../ui/Button";

interface Props {
  records: ActivityRecord[];
  onCorrect: (record: ActivityRecord, amount: string) => Promise<void>;
}

const LANES = [
  { kind: "fuel", title: "Fuel burned" },
  { kind: "electricity", title: "Electricity" },
  { kind: "output", title: "Products made" },
];

function RecordCard({ record, onCorrect }: { record: ActivityRecord; onCorrect: Props["onCorrect"] }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(record.amount);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try { await onCorrect(record, amount); setEditing(false); }
    finally { setBusy(false); }
  }

  return (
    <motion.div layout className="rec" initial={{ opacity: 0, scale: 0.9, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}>
      <small>{record.name}</small>
      {editing ? (
        <div className="row">
          <input className="input grow" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button size="small" loading={busy} onClick={save}>Save</Button>
        </div>
      ) : (
        <b>{Number(record.amount).toLocaleString("en-IN")} <small>{record.unit}</small></b>
      )}
      <small>Evidence #{record.evidence_id}</small>
      {!editing && <Button variant="quiet" size="small" onClick={() => setEditing(true)}>Correct</Button>}
    </motion.div>
  );
}

export function RecordsBoard({ records, onCorrect }: Props) {
  return (
    <div className="board">
      {LANES.map((lane) => {
        const items = records.filter((r) => r.kind === lane.kind);
        return (
          <div key={lane.kind} className="lane">
            <h4>{lane.title}<span>{items.length}</span></h4>
            <AnimatePresence mode="popLayout">
              {items.map((r) => <RecordCard key={r.id} record={r} onCorrect={onCorrect} />)}
            </AnimatePresence>
            {items.length === 0 && <div className="empty">Nothing yet</div>}
          </div>
        );
      })}
    </div>
  );
}
