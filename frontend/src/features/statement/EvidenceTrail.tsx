// features/statement/EvidenceTrail.tsx
// The drill down from a figure to its proof. This lists the exact
// ledger rows the statement was calculated from and the evidence file
// behind each one, with its fingerprint. A verifier reads this table
// to check that the numbers trace to real documents.

import type { StatementInput } from "../../api/types";
import { shortHash } from "../../lib/format";
import { CopyButton } from "../../ui/CopyButton";

export function EvidenceTrail({ inputs }: { inputs: StatementInput[] }) {
  if (inputs.length === 0) return <p className="muted">No inputs recorded for this statement.</p>;
  return (
    <table className="table">
      <thead><tr><th>Kind</th><th>Name</th><th className="num">Amount</th><th>Evidence file</th><th>Fingerprint</th></tr></thead>
      <tbody>
        {inputs.map((i) => (
          <tr key={i.record_id}>
            <td>{i.kind}</td><td>{i.name}</td>
            <td className="num">{Number(i.amount).toLocaleString("en-IN")} {i.unit}</td>
            <td>{i.filename}</td>
            <td className="mono">{shortHash(i.sha256, 12)} <CopyButton text={i.sha256} label="" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
