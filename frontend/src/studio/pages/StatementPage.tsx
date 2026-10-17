// studio/pages/StatementPage.tsx
// One statement, told as a story. The top is the number itself, set
// huge, racing against the EU default. Below it a line runs down the
// page and each step on it answers one question:
//   Where does the carbon come from?   the breakdown
//   Who is behind it?                  the supply chain
//   What is the proof?                 the evidence trail
//   Can I trust it?                    signatures and the trust trail
//   Has it changed?                    versions
//
// What you can DO sits in a floating dock at the bottom, and opens a
// focused sheet: sign (hold), share, review as a verifier (hold),
// try the savings, or read the calculation trace. The role decides
// which actions appear. Importers never see raw plant data.

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { Chain, Organization, Statement, VersionRow } from "../../api/types";
import { ChainGraph } from "../../features/statement/ChainGraph";
import { dateTime, shortHash } from "../../lib/format";
import { downloadPack } from "../../lib/pack";
import { CountUp } from "../../ui/CountUp";
import { Icon } from "../../ui/Icons";
import { LiveNumber } from "../../ui/LiveNumber";
import { useToast } from "../../ui/Toast";
import { HoldToConfirm } from "../parts/HoldToConfirm";
import { Identicon } from "../parts/Identicon";
import { Sheet } from "../parts/Sheet";
import { Spine, SpineStep } from "../parts/Spine";

type SheetKind = "sign" | "share" | "review" | "savings" | "trace" | null;

const EVENT_LABEL: Record<string, string> = {
  built: "Calculated", signed: "Signed by the supplier", verified_satisfactory: "Verified, satisfactory",
  verified_unsatisfactory: "Verifier raised concerns", shared: "Shared with",
};

function stateChip(s: Statement) {
  if (s.status === "stale") return <span className="chip bad"><i />Out of date</span>;
  if (s.verified) return <span className="chip good"><i />Verified</span>;
  if (s.status === "signed") return <span className="chip warn"><i />Awaiting a verifier</span>;
  return <span className="chip"><i />Draft</span>;
}

export function StatementPage() {
  const { id } = useParams();
  const { me } = useAuth();
  const toast = useToast();
  const [s, setS] = useState<Statement | null>(null);
  const [chain, setChain] = useState<Chain | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [checks, setChecks] = useState([false, false, false]);
  const [comments, setComments] = useState("");
  const [tonnes, setTonnes] = useState(500);
  const [price, setPrice] = useState(80);

  const load = useCallback(async () => {
    try {
      const [st, c, v] = await Promise.all([
        api<Statement>(`/statements/${id}`), api<Chain>(`/statements/${id}/chain`), api<VersionRow[]>(`/statements/${id}/versions`),
      ]);
      setS(st); setChain(c); setVersions(v);
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
  const perTonne = Math.max(def - see, 0);
  const saving = perTonne * tonnes * price;
  const activeShares = (s.timeline ?? []).filter((e) => e.event === "shared" && !e.revoked);

  async function act(work: () => Promise<void>, ok: string, close = true) {
    try { await work(); await load(); toast.success(ok); if (close) setTimeout(() => setSheet(null), 900); }
    catch (e) { toast.error("That did not work", (e as Error).message); throw e; }
  }

  return (
    <div>
      <Link to="/statements" className="back-link mono"><Icon name="arrow" size={13} /> STATEMENTS</Link>
      <div className="story-top">
        <div>
          <span className="kicker mono">{s.supplier} / {s.installation} / {s.period_start} to {s.period_end}</span>
          <div className="huge-n story-n"><CountUp value={see} decimals={2} duration={1.6} /><small>tCO2 / t {product.replace("_", " ")}</small></div>
          <div className="story-chips">{stateChip(s)}{s.signature_valid && <span className="chip good"><i />Signature valid</span>}<span className="chip">#{s.id}</span></div>
        </div>
        <div className="race">
          <div className="race-row"><span>Verified data</span>
            <div className="race-track"><motion.i style={{ background: "var(--ember)" }} initial={{ width: 0 }} animate={{ width: `${(see / longest) * 100}%` }} transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} /></div><b className="mono">{see.toFixed(2)}</b></div>
          <div className="race-row"><span>EU default</span>
            <div className="race-track"><motion.i style={{ background: "#5b6573" }} initial={{ width: 0 }} animate={{ width: `${(def / longest) * 100}%` }} transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }} /></div><b className="mono">{def ? def.toFixed(2) : "n/a"}</b></div>
          {cut > 0 && <motion.p className="race-cut" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}><b>{cut}%</b> below the EU default</motion.p>}
        </div>
      </div>

      <Spine>
        {detailed && s.breakdown && (
          <SpineStep n="01" title="Where the carbon comes from">
            <div className="stack-big">
              {[["Fuel burned", Number(s.breakdown.direct), "#ff5a1f"], ["Purchased steel", Number(s.breakdown.precursor), "#8d99a8"]].filter(([, v]) => (v as number) > 0).map(([label, value, color], i, arr) => {
                const total = arr.reduce((a, r) => a + (r[1] as number), 0);
                return <motion.div key={label as string} style={{ background: color as string }} initial={{ width: 0 }} whileInView={{ width: `${((value as number) / total) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.15 }}><span>{label as string}</span></motion.div>;
              })}
            </div>
            <div className="lot-lines">
              {s.breakdown.lots.map((lot, i) => (
                <div key={i} className="lot-line">
                  <span>{lot.material}{lot.used_for ? ` for ${lot.used_for.replace("_", " ")}` : ""}</span>
                  <span className="mono">{Number(lot.tonnes).toLocaleString("en-IN")} t at {Number(lot.intensity).toFixed(2)}</span>
                  {lot.basis === "actual" ? <span className="chip good"><i />Verified supplier data</span> : <span className="chip warn"><i />EU default, marked up</span>}
                </div>
              ))}
            </div>
          </SpineStep>
        )}

        <SpineStep n={detailed ? "02" : "01"} title="Who is behind it">
          {chain && <div className="chain-dark"><ChainGraph chain={chain} dark /></div>}
        </SpineStep>

        {detailed && (
          <SpineStep n="03" title="The proof" note="Each figure traces to a record, and each record to a file. The picture is the file's fingerprint.">
            <div className="proof-list">
              {(s.inputs ?? []).map((i, k) => (
                <motion.div key={i.record_id} className="proof-row" initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.05 }}>
                  <Identicon hash={i.sha256} size={40} />
                  <div><strong>{Number(i.amount).toLocaleString("en-IN")} {i.unit} {i.name.replace("_", " ")}</strong><span>{i.filename}</span></div>
                  <span className="mono muted-light">{shortHash(i.sha256, 12)}</span>
                </motion.div>
              ))}
            </div>
          </SpineStep>
        )}

        <SpineStep n={detailed ? "04" : "02"} title="Can it be trusted">
          <div className="trust-line">
            {(s.timeline ?? []).map((e, k) => (
              <motion.div key={k} className="trust-event" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.1 }}>
                <i className={e.event.startsWith("verified_sat") ? "good" : ""} />
                <strong>{EVENT_LABEL[e.event] ?? e.event}{e.event === "shared" ? ` ${e.by}` : e.by ? `: ${e.by}` : ""}</strong>
                <span className="mono muted-light">{dateTime(e.at)}</span>
              </motion.div>
            ))}
          </div>
          <div className="hash-row"><Identicon hash={s.content_hash} size={48} color="#3fd9a0" /><div><span className="kicker mono">CONTENT HASH</span><code>{s.content_hash}</code></div></div>
        </SpineStep>

        {versions.length > 1 && (
          <SpineStep n={detailed ? "05" : "03"} title="Has it changed">
            <div className="version-row">
              {versions.map((v, k) => (
                <div key={v.id} className={`version ${v.current ? "on" : ""}`}>
                  <span className="mono kicker">VERSION {k + 1}{v.current ? " / CURRENT" : ""}</span>
                  <strong>{Number(v.see_by_product[product]).toFixed(2)}</strong>
                  <span className="mono muted-light">#{v.id} / {dateTime(v.created_at)}</span>
                </div>
              ))}
            </div>
          </SpineStep>
        )}
      </Spine>

      {/* The action dock */}
      <div className="dock" role="toolbar" aria-label="Statement actions">
        {owner && s.status === "draft" && <button className="dock-btn primary" onClick={() => setSheet("sign")}><Icon name="lock" size={15} />Sign</button>}
        {owner && s.status === "signed" && <button className="dock-btn primary" onClick={() => setSheet("share")}><Icon name="link" size={15} />Share</button>}
        {owner && s.status === "stale" && <button className="dock-btn primary" onClick={() => act(async () => { await api("/statements/recompute", { method: "POST" }); }, "Recomputed with the latest upstream data", false)}><Icon name="refresh" size={15} />Recompute</button>}
        {me.role === "verifier" && s.status === "signed" && <button className="dock-btn primary" onClick={() => setSheet("review")}><Icon name="shield" size={15} />Review</button>}
        {me.role === "importer" && <button className="dock-btn primary" onClick={() => setSheet("savings")}><Icon name="ship" size={15} />Savings</button>}
        {me.role !== "supplier" && !s.verified && s.supplier !== me.organization_name && me.role === "importer" && (
          <button className="dock-btn" onClick={() => act(async () => { await api("/requests", { body: { to_org_id: s.supplier_org_id, statement_id: s.id, kind: "verify", message: `Please get statement #${s.id} verified.` } }); }, "Request sent", false)}>Ask for verification</button>
        )}
        {s.status !== "draft" && <button className="dock-btn" onClick={() => downloadPack(s.id).then(() => toast.success("Pack downloaded")).catch((e) => toast.error("Could not download", (e as Error).message))}><Icon name="file" size={15} />Pack</button>}
        {detailed && <button className="dock-btn" onClick={() => setSheet("trace")}>Calculation</button>}
      </div>

      <Sheet open={sheet === "sign"} title="SIGN THIS STATEMENT" onClose={() => setSheet(null)}>
        <p className="sheet-text">Signing locks these figures with your private key. Any later change breaks the signature.</p>
        <HoldToConfirm label="Hold to sign" doneLabel="Signed" onConfirm={() => act(async () => { await api(`/statements/${s.id}/sign`, { method: "POST" }); }, "Signed. The figures are locked.")} />
      </Sheet>

      <Sheet open={sheet === "share"} title="SHARE THIS STATEMENT" onClose={() => setSheet(null)}>
        <div className="share-list">
          {orgs.filter((o) => o.role !== "admin" && o.name !== me.organization_name).map((o) => {
            const shared = activeShares.some((e) => e.by === o.name);
            return (
              <div key={o.id} className="share-row">
                <div><strong>{o.name}</strong><span className="mono muted-light">{o.role}</span></div>
                {shared ? <span className="chip good"><i />Shared</span> : <button className="pill-btn" onClick={() => act(async () => { await api(`/statements/${s.id}/share`, { body: { recipient_org_id: o.id } }); }, `Shared with ${o.name}`, false)}>Share</button>}
              </div>
            );
          })}
        </div>
        {activeShares.length > 0 && <p className="sheet-text">Recipients see the result and its status, never your raw data. You can revoke any time.
          {" "}{activeShares.map((g) => <button key={g.grant_id} className="link-btn" onClick={() => act(async () => { await api(`/shares/${g.grant_id}/revoke`, { method: "POST" }); }, "Access revoked", false)}>Revoke {g.by}</button>)}</p>}
      </Sheet>

      <Sheet open={sheet === "review"} title="REVIEW AS VERIFIER" onClose={() => setSheet(null)}>
        <div className="review-checks">
          {["Evidence fingerprints are intact", "The calculation trace reproduces the figure", "Precursor sources are valid and verified"].map((label, i) => (
            <button key={label} className={`review-check ${checks[i] ? "on" : ""}`} onClick={() => setChecks(checks.map((c, j) => (j === i ? !c : c)))}>
              <span>{checks[i] && <Icon name="check" size={14} />}</span>{label}
            </button>
          ))}
        </div>
        <input className="sheet-input" placeholder="Comments (optional)" value={comments} onChange={(e) => setComments(e.target.value)} />
        <div className="review-actions">
          <HoldToConfirm label="Hold to sign: satisfactory" doneLabel="Signed" disabledReason={checks.every(Boolean) ? undefined : "Tick every check first."}
            onConfirm={() => act(async () => { await api(`/statements/${s.id}/opinion`, { body: { conclusion: "satisfactory", comments } }); }, "Opinion signed: satisfactory")} />
          <button className="pill-btn ghost" onClick={() => act(async () => { await api(`/statements/${s.id}/opinion`, { body: { conclusion: "unsatisfactory", comments } }); }, "Concerns raised")}>Raise concerns</button>
        </div>
      </Sheet>

      <Sheet open={sheet === "savings"} title="YOUR SAVING VERSUS THE EU DEFAULT" onClose={() => setSheet(null)}>
        <div className="huge-n sheet-n"><LiveNumber value={saving} prefix="€" /></div>
        <p className="sheet-text">per year at these volumes, before the free allocation adjustment. ({def.toFixed(2)} minus {see.toFixed(2)}) × tonnes × price.</p>
        <label className="slide"><span className="mono">TONNES IMPORTED: {tonnes}</span><input type="range" min={10} max={5000} step={10} value={tonnes} onChange={(e) => setTonnes(Number(e.target.value))} /></label>
        <label className="slide"><span className="mono">CERTIFICATE PRICE: €{price}</span><input type="range" min={30} max={150} step={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>
      </Sheet>

      <Sheet open={sheet === "trace"} title="THE CALCULATION" onClose={() => setSheet(null)}>
        <div className="trace-dark">{(s.trace ?? []).map((l, i) => <div key={i}><span>{String(i + 1).padStart(2, "0")}</span>{l}</div>)}</div>
        <p className="sheet-text">Every line comes from a deterministic engine. No number is produced by a language model.</p>
      </Sheet>
    </div>
  );
}
