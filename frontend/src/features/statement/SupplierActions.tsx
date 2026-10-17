// features/statement/SupplierActions.tsx
// What the owning supplier can do with its statement:
//   sign it (locks the figures), share it with named organizations,
//   revoke a share, and recompute if an upstream number changed.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { Organization, Statement } from "../../api/types";
import { Button } from "../../ui/Button";
import { Icon } from "../../ui/Icons";
import { useToast } from "../../ui/Toast";

interface Props { statement: Statement; onChange: () => Promise<void> }

export function SupplierActions({ statement, onChange }: Props) {
  const toast = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api<Organization[]>("/auth/organizations").then(setOrgs).catch(() => undefined);
  }, []);

  async function act(name: string, work: () => Promise<void>, ok: string) {
    setBusy(name);
    try { await work(); await onChange(); toast.success(ok); }
    catch (problem) { toast.error("That did not work", (problem as Error).message); }
    finally { setBusy(""); }
  }

  const activeShares = (statement.timeline ?? []).filter((e) => e.event === "shared" && !e.revoked);

  return (
    <div className="card stack">
      <span className="eyebrow">Your actions</span>

      {statement.status === "stale" && (
        <div className="stack">
          <p><strong>This statement is out of date.</strong> An upstream supplier changed their number.</p>
          <Button variant="ember" loading={busy === "recompute"} onClick={() =>
            act("recompute", async () => { await api("/statements/recompute", { method: "POST" }); }, "Recomputed with the latest upstream data")}>
            <Icon name="refresh" size={16} /> Recompute now
          </Button>
        </div>
      )}

      {statement.status === "draft" && (
        <div className="stack">
          <p className="muted">Signing locks these figures with your private key. Any later change breaks the signature.</p>
          <Button variant="ember" loading={busy === "sign"} onClick={() =>
            act("sign", async () => { await api(`/statements/${statement.id}/sign`, { method: "POST" }); }, "Signed. The figures are now locked.")}>
            <Icon name="lock" size={16} /> Sign statement
          </Button>
        </div>
      )}

      {statement.status === "signed" && (
        <div className="stack">
          <div className="field">
            <label>Share with</label>
            <select className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)}>
              <option value="">Choose an organization</option>
              {orgs.filter((o) => o.role !== "admin").map((o) => (
                <option key={o.id} value={o.id}>{o.name} ({o.role})</option>
              ))}
            </select>
          </div>
          <Button loading={busy === "share"} disabledReason={recipient ? undefined : "Choose who to share with."}
            onClick={() => act("share", async () => {
              await api(`/statements/${statement.id}/share`, { body: { recipient_org_id: Number(recipient) } });
              setRecipient("");
            }, "Shared. They can now see the result, not your raw data.")}>
            <Icon name="link" size={16} /> Share
          </Button>
        </div>
      )}

      <AnimatePresence>
        {activeShares.map((s) => (
          <motion.div key={s.grant_id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span>Shared with <strong>{s.by}</strong></span>
            <Button variant="quiet" size="small" loading={busy === `r${s.grant_id}`} onClick={() =>
              act(`r${s.grant_id}`, async () => { await api(`/shares/${s.grant_id}/revoke`, { method: "POST" }); }, "Access revoked")}>
              Revoke
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
