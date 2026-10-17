// studio/pages/StatementPage.tsx
// One statement. A big number, one sentence, the few things you can do,
// and three plain sections:
//   Where the carbon comes from   one bar and the purchased inputs
//   Who is behind it              the supply chain, drawn small
//   Proof and trust               the files, the signatures, the dates
// What you can do depends on your role and shows as buttons under the
// number. Each opens one small dialog. Importers never see raw plant
// data, only the result and its trust trail.

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { Chain, Organization, Statement } from "../../api/types";
import { ChainGraph } from "../../features/statement/ChainGraph";
import { dateTime, shortHash } from "../../lib/format";
import { downloadPack } from "../../lib/pack";
import { CountUp } from "../../ui/CountUp";
import { Icon } from "../../ui/Icons";
import { LiveNumber } from "../../ui/LiveNumber";
import { useToast } from "../../ui/Toast";
import { Identicon } from "../parts/Identicon";
import { Modal } from "../parts/Modal";

type Dialog = "sign" | "share" | "review" | "saving" | "trace" | null;

const EVENT: Record<string, string> = {
  built: "Calculated", signed: "Signed by the supplier", verified_satisfactory: "Verified, satisfactory",
  verified_unsatisfactory: "Verifier raised concerns", shared: "Shared with",
};

export function StatementPage() {
  const { id } = useParams();
  const { me } = useAuth();
  const toast = useToast();
  const [s, setS] = useState<Statement | null>(null);
  const [chain, setChain] = useState<Chain | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [checks, setChecks] = useState([false, false, false]);
  const [comments, setComments] = useState("");
  const [tonnes, setTonnes] = useState(500);
  const [price, setPrice] = useState(80);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [st, c] = await Promise.all([api<Statement>(`/statements/${id}`), api<Chain>(`/statements/${id}/chain`)]);
      setS(st); setChain(c);
    } catch (e) { toast.error("Could not open this statement", (e as Error).message); }
  }, [id]);
  useEffect(() => { setS(null); load(); }, [load]);
  useEffect(() => { if (me?.role === "supplier") api<Organization[]>("/auth/organizations").then(setOrgs).catch(() => undefined); }, [me?.role]);

  if (!s || !me) return <div className="skeleton" style={{ height: 420 }} />;

  const product = Object.keys(s.see_by_product)[0];
  const see = Number(s.see_by_product[product]);
  const def = Number(s.default_see_by_product?.[product] ?? 0);
  const cut = def > 0 ? Math.round((1 - see / def) * 100) : 0;
  const longest = Math.max(see, def, 0.0001);
  const detailed = s.trace !== undefined;
  const owner = me.role === "supplier" && detailed;
  const saving = Math.max(def - see, 0) * tonnes * price;
  const shares = (s.timeline ?? []).filter((e) => e.event === "shared" && !e.revoked);
  const state = s.status === "stale" ? ["bad", "Out of date"] : s.verified ? ["good", "Verified"] : s.status === "signed" ? ["warn", "Awaiting a verifier"] : ["", "Draft"];

  async function act(work: () => Promise<void>, ok: string, close = true) {
    setBusy(true);
    try { await work(); await load(); toast.success(ok); if (close) setDialog(null); }
    catch (e) { toast.error("That did not work", (e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <Link to="/statements" className="back kicker">&larr; Statements</Link>
      <div className="st-top">
        <div>
          <span className="kicker">{s.supplier} / {s.installation} / {s.period_start} to {s.period_end}</span>
          <div className="big" style={{ marginTop: 14 }}><CountUp value={see} decimals={2} duration={1.4} /><small>tCO2 / t {product.replace("_", " ")}</small></div>
          <p className="st-sub"><i className={`dot ${state[0]}`} />{state[1]}{s.signature_valid ? ", signature valid" : ""}. {cut > 0 ? `${cut}% below the EU default of ${def.toFixed(2)}.` : "At the EU default."}</p>
          <div className="actions">
            {owner && s.status === "draft" && <button className="btn-solid ember" onClick={() => setDialog("sign")}>Sign statement</button>}
            {owner && s.status === "signed" && <button className="btn-solid ember" onClick={() => setDialog("share")}>Share</button>}
            {owner && s.status === "stale" && <button className="btn-solid ember" disabled={busy} onClick={() => act(async () => { await api("/statements/recompute", { method: "POST" }); }, "Recomputed", false)}>Recompute</button>}
            {me.role === "verifier" && s.status === "signed" && <button className="btn-solid ember" onClick={() => setDialog("review")}>Review and sign</button>}
            {me.role === "importer" && <button className="btn-solid ember" onClick={() => setDialog("saving")}>Estimate my saving</button>}
            {me.role === "importer" && !s.verified && <button className="btn-line" onClick={() => act(async () => { await api("/requests", { body: { to_org_id: s.supplier_org_id, statement_id: s.id, kind: "verify", message: `Please get statement #${s.id} verified.` } }); }, "Request sent", false)}>Ask for verification</button>}
            {s.status !== "draft" && <button className="btn-line" onClick={() => downloadPack(s.id).then(() => toast.success("Pack downloaded")).catch((e) => toast.error("Could not download", (e as Error).message))}>Download pack</button>}
            {detailed && <button className="btn-text" onClick={() => setDialog("trace")}>Show the calculation</button>}
          </div>
        </div>
        <div className="race">
          <div className="race-row"><span>Verified</span><div className="race-track"><motion.i style={{ background: "var(--ember)" }} initial={{ width: 0 }} animate={{ width: `${(see / longest) * 100}%` }} transition={{ duration: 1, delay: 0.2 }} /></div><b className="mono">{see.toFixed(2)}</b></div>
          <div className="race-row"><span>EU default</span><div className="race-track"><motion.i style={{ background: "#8b8a84" }} initial={{ width: 0 }} animate={{ width: `${(def / longest) * 100}%` }} transition={{ duration: 1, delay: 0.35 }} /></div><b className="mono">{def ? def.toFixed(2) : "n/a"}</b></div>
        </div>
      </div>

      {detailed && s.breakdown && (
        <div className="section">
          <span className="kicker">Where the carbon comes from</span>
          <div>
            <div className="bar-stack">
              {[["Fuel burned", Number(s.breakdown.direct), "#ff5a1f"], ["Purchased steel", Number(s.breakdown.precursor), "#4b4b47"]].filter((r) => (r[1] as number) > 0).map((r, _i, arr) => {
                const total = arr.reduce((a, x) => a + (x[1] as number), 0);
                return <div key={r[0] as string} style={{ width: `${((r[1] as number) / total) * 100}%`, background: r[2] as string }}>{r[0] as string}</div>;
              })}
            </div>
            <div className="lines">
              {s.breakdown.lots.map((lot, i) => (
                <div key={i} className="line"><span>{lot.material}{lot.used_for ? ` for ${lot.used_for.replace("_", " ")}` : ""}</span>
                  <span className="mono">{Number(lot.tonnes).toLocaleString("en-IN")} t at {Number(lot.intensity).toFixed(2)}</span>
                  <span className="qstate"><i className={`dot ${lot.basis === "actual" ? "good" : "warn"}`} />{lot.basis === "actual" ? "Verified supplier data" : "EU default, marked up"}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <span className="kicker">Who is behind it</span>
        <div className="chain-box">{chain && <ChainGraph chain={chain} />}</div>
      </div>

      <div className="section">
        <span className="kicker">Proof and trust</span>
        <div>
          {detailed && (
            <div className="proof">
              {(s.inputs ?? []).map((i) => (
                <div key={i.record_id} className="proof-row"><Identicon hash={i.sha256} size={28} />
                  <span>{i.name.replace("_", " ")}, {Number(i.amount).toLocaleString("en-IN")} {i.unit === "tonne" ? "t" : i.unit.toUpperCase()}<span className="soft">{i.filename}</span></span>
                  <span className="mono soft">{shortHash(i.sha256, 10)}</span></div>
              ))}
            </div>
          )}
          <div className="trust">
            {(s.timeline ?? []).map((e, k) => (
              <div key={k} className="trust-row"><span>{EVENT[e.event] ?? e.event}{e.event === "shared" ? ` ${e.by}` : e.by ? `: ${e.by}` : ""}</span><span className="soft mono">{dateTime(e.at)}</span></div>
            ))}
          </div>
          <p className="hash">content hash {s.content_hash}</p>
        </div>
      </div>

      <Modal open={dialog === "sign"} title="Sign this statement" onClose={() => setDialog(null)}>
        <p className="soft">Signing locks these figures with your private key. Any later change breaks the signature.</p>
        <button className="btn-solid ember" disabled={busy} style={{ alignSelf: "flex-start" }} onClick={() => act(async () => { await api(`/statements/${s.id}/sign`, { method: "POST" }); }, "Signed. The figures are locked.")}>Sign now</button>
      </Modal>

      <Modal open={dialog === "share"} title="Share this statement" onClose={() => setDialog(null)}>
        <div className="choice-list">
          {orgs.filter((o) => o.role !== "admin" && o.name !== me.organization_name).map((o) => {
            const shared = shares.some((e) => e.by === o.name);
            return (
              <div key={o.id} className="choice-row" style={{ cursor: "default" }}>
                <span>{o.name} <span className="kicker">{o.role}</span></span>
                {shared ? <span className="qstate"><i className="dot good" />Shared</span> : <button className="btn-line" disabled={busy} onClick={() => act(async () => { await api(`/statements/${s.id}/share`, { body: { recipient_org_id: o.id } }); }, `Shared with ${o.name}`, false)}>Share</button>}
              </div>
            );
          })}
        </div>
        <p className="soft">Recipients see the result and its status, never your raw data.{" "}
          {shares.map((g) => <button key={g.grant_id} className="link-inline" onClick={() => act(async () => { await api(`/shares/${g.grant_id}/revoke`, { method: "POST" }); }, "Access revoked", false)}>Revoke {g.by}</button>)}</p>
      </Modal>

      <Modal open={dialog === "review"} title="Review as verifier" onClose={() => setDialog(null)}>
        {["Evidence fingerprints are intact", "The calculation reproduces the figure", "Precursor sources are valid and verified"].map((label, i) => (
          <button key={label} className={`check-row ${checks[i] ? "on" : ""}`} onClick={() => setChecks(checks.map((c, j) => (j === i ? !c : c)))}><span>{checks[i] && <Icon name="check" size={13} />}</span>{label}</button>
        ))}
        <input className="input" placeholder="Comments (optional)" value={comments} onChange={(e) => setComments(e.target.value)} />
        <div className="actions">
          <button className="btn-solid ember" disabled={busy || !checks.every(Boolean)} onClick={() => act(async () => { await api(`/statements/${s.id}/opinion`, { body: { conclusion: "satisfactory", comments } }); }, "Opinion signed: satisfactory")}>Sign: satisfactory</button>
          <button className="btn-line" disabled={busy} onClick={() => act(async () => { await api(`/statements/${s.id}/opinion`, { body: { conclusion: "unsatisfactory", comments } }); }, "Concerns raised")}>Raise concerns</button>
        </div>
        {!checks.every(Boolean) && <span className="soft">Tick every check to sign.</span>}
      </Modal>

      <Modal open={dialog === "saving"} title="Your saving versus the EU default" onClose={() => setDialog(null)}>
        <div className="saving"><LiveNumber value={saving} prefix="€" /></div>
        <p className="soft">per year, before the free allocation adjustment. ({def.toFixed(2)} minus {see.toFixed(2)}) × tonnes × price.</p>
        <label className="field">Tonnes imported: {tonnes}<input className="range" type="range" min={10} max={5000} step={10} value={tonnes} onChange={(e) => setTonnes(Number(e.target.value))} /></label>
        <label className="field">Certificate price: €{price}<input className="range" type="range" min={30} max={150} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>
      </Modal>

      <Modal open={dialog === "trace"} title="The calculation" onClose={() => setDialog(null)}>
        <div className="trace-box">{(s.trace ?? []).map((l, i) => <div key={i}><span>{String(i + 1).padStart(2, "0")}</span>{l}</div>)}</div>
        <p className="soft">Every line comes from a deterministic engine. No number is produced by a language model.</p>
      </Modal>
    </div>
  );
}
