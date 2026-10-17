// pages/StatementsPage.tsx
// A list of statements. Suppliers see their own; importers and
// verifiers see the ones shared with them.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Statement } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";

export function StatementsPage() {
  const [rows, setRows] = useState<Statement[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    setRows(await api<Statement[]>("/statements"));
  }
  useEffect(() => { load(); }, []);

  async function recompute() {
    const rebuilt = await api<Statement[]>("/statements/recompute", { method: "POST" });
    setMessage(`Recomputed ${rebuilt.length} statement(s)`);
    await load();
  }

  const anyStale = rows.some((r) => r.status === "stale");

  return (
    <div className="stack">
      {anyStale && (
        <div className="card warnbox">
          An upstream statement changed. Some statements are out of date.
          <button onClick={recompute}>Recompute stale statements</button>
        </div>
      )}
      {message && <p>{message}</p>}
      <table className="card">
        <thead><tr><th>#</th><th>Supplier</th><th>Plant</th><th>Period</th>
          <th>Emissions per tonne</th><th>State</th></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td><Link to={`/statements/${s.id}`}>{s.id}</Link></td>
              <td>{s.supplier}</td><td>{s.installation}</td>
              <td>{s.period_start} to {s.period_end}</td>
              <td>{Object.entries(s.see_by_product).map(([k, v]) => `${k}: ${v}`).join(", ")}</td>
              <td><StatusBadge statement={s} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
