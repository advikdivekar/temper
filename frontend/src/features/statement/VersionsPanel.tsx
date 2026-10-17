// features/statement/VersionsPanel.tsx
// Every version of a statement for its period, and what changed.
// When an input is corrected, a new version is created instead of
// editing the old one. Here we show them side by side with the
// change in the headline number, so a revision is never silent.

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { VersionRow } from "../../api/types";
import { dateTime } from "../../lib/format";
import { Pill } from "../../ui/Pill";

export function VersionsPanel({ statementId }: { statementId: number }) {
  const [rows, setRows] = useState<VersionRow[] | null>(null);
  useEffect(() => { api<VersionRow[]>(`/statements/${statementId}/versions`).then(setRows); }, [statementId]);
  if (!rows) return <div className="skeleton" style={{ height: 120 }} />;

  return (
    <div className="stack">
      {rows.map((v, i) => {
        const product = Object.keys(v.see_by_product)[0];
        const prev = i > 0 ? rows[i - 1] : null;
        const delta = prev ? Number(v.see_by_product[product]) - Number(prev.see_by_product[product]) : 0;
        return (
          <motion.div key={v.id} className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="toolbar">
              <div><strong>Version {i + 1}</strong> <span className="muted mono">statement #{v.id}</span></div>
              <div className="row">{v.current && <Pill tone="ember">Current</Pill>}<Pill>{v.status}</Pill></div>
            </div>
            <div className="big-n">{Number(v.see_by_product[product]).toFixed(2)}<small>tCO2 per tonne of {product.replace("_", " ")}</small></div>
            {prev && delta !== 0 && (
              <p style={{ color: delta < 0 ? "var(--good)" : "var(--bad)", fontWeight: 600 }}>
                {delta < 0 ? "Down" : "Up"} {Math.abs(delta).toFixed(3)} from the previous version
              </p>
            )}
            <p className="muted mono">{dateTime(v.created_at)}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
