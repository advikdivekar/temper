// features/statement/StatementTools.tsx
// Tools available to anyone who can read a statement:
//   Download pack   a self contained JSON file an auditor can check
//                   on the public verify page, with no account
//   Ask supplier    for recipients: send a request to the supplier
//                   when a statement is not yet verified

import { useState } from "react";
import { Link } from "react-router-dom";
import { api, getToken } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { Statement } from "../../api/types";
import { Button } from "../../ui/Button";
import { Icon } from "../../ui/Icons";
import { useToast } from "../../ui/Toast";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function StatementTools({ statement }: { statement: Statement }) {
  const { me } = useAuth();
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const canPack = statement.status !== "draft";
  const mine = me?.organization_name === statement.supplier;

  async function download() {
    try {
      const response = await fetch(`${BASE}/statements/${statement.id}/pack`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error((await response.json()).detail ?? "Download failed");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = `temper-pack-statement-${statement.id}.json`; link.click();
      URL.revokeObjectURL(url);
      toast.success("Pack downloaded", "Check it any time on the verify page.");
    } catch (e) { toast.error("Could not download the pack", (e as Error).message); }
  }

  async function ask() {
    setAsking(true);
    try {
      await api("/requests", { body: {
        to_org_id: statement.supplier_org_id, statement_id: statement.id, kind: "verify",
        message: `Please get statement #${statement.id} (${statement.period_start} to ${statement.period_end}) verified.` } });
      toast.success("Request sent", `${statement.supplier} will see it in their inbox.`);
    } catch (e) { toast.error("Could not send the request", (e as Error).message); }
    finally { setAsking(false); }
  }

  return (
    <div className="card stack">
      <span className="eyebrow">Proof and requests</span>
      <Button variant="ghost" onClick={download} disabledReason={canPack ? undefined : "Sign the statement to export a pack."}>
        <Icon name="file" size={16} />Download verification pack
      </Button>
      <Link className="text-link-dark" to="/verify"><Icon name="shield" size={14} /> Check a pack independently</Link>
      {!mine && !statement.verified && (
        <Button variant="quiet" loading={asking} onClick={ask}>Ask {statement.supplier} to get this verified</Button>
      )}
    </div>
  );
}
