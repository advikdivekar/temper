// pages/StatementDetailPage.tsx
// One statement in full. What you can do depends on your role:
//   supplier: read the trace, sign, share with importers or verifiers
//   verifier: read the trace and give a signed opinion
//   importer: see the result, its verification, and the saving versus
//             the EU default (never the raw trace)

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Organization, Savings, Statement } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";

export function StatementDetailPage() {
  const { id } = useParams();
  const { me } = useAuth();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [recipient, setRecipient] = useState("");
  const [comments, setComments] = useState("");
  const [tonnes, setTonnes] = useState("100");
  const [price, setPrice] = useState("80");
  const [savings, setSavings] = useState<Savings | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setStatement(await api<Statement>(`/statements/${id}`));
  }
  useEffect(() => {
    load();
    if (me?.role === "supplier") {
      api<Organization[]>("/auth/organizations").then(setOrgs);
    }
  }, [id]);

  async function guard(action: () => Promise<void>) {
    setError("");
    try { await action(); await load(); } catch (e) { setError((e as Error).message); }
  }

  if (!statement || !me) return <p>Loading</p>;
  const product = Object.keys(statement.see_by_product)[0];

  const sign = () => guard(async () => {
    await api(`/statements/${id}/sign`, { method: "POST" });
  });
  const share = () => guard(async () => {
    await api(`/statements/${id}/share`, { body: { recipient_org_id: Number(recipient) } });
  });
  const opine = (conclusion: string) => guard(async () => {
    await api(`/statements/${id}/opinion`, { body: { conclusion, comments } });
  });
  const calcSavings = () => guard(async () => {
    const query = `product=${product}&tonnes=${tonnes}&certificate_price_eur=${price}`;
    setSavings(await api<Savings>(`/statements/${id}/savings?${query}`));
  });

  return (
    <div className="stack">
      {error && <p className="error">{error}</p>}
      <section className="card">
        <h2>Statement {statement.id} <StatusBadge statement={statement} /></h2>
        <p>{statement.supplier}, {statement.installation}, {statement.period_start} to {statement.period_end}</p>
        <p>Rules: {statement.methodology}</p>
        <h3>Emissions per tonne of product (tCO2)</h3>
        <ul>
          {Object.entries(statement.see_by_product).map(([k, v]) => (
            <li key={k}><strong>{k}</strong>: {v}</li>
          ))}
        </ul>
        <p className="hint">Signature {statement.signature_valid ? "valid" : "not present or invalid"}.
          Content hash {statement.content_hash.slice(0, 16)}...</p>
        {statement.opinions.map((o, i) => (
          <p key={i}>Verifier opinion: {o.conclusion}</p>
        ))}
      </section>

      {statement.trace && (
        <section className="card">
          <h3>How this number was calculated</h3>
          <ol>{statement.trace.map((line, i) => <li key={i}>{line}</li>)}</ol>
          {statement.precursors && statement.precursors.map((p, i) => (
            <p key={i}>Precursor {p.material}, {p.tonnes} t:{" "}
              {p.uses_default ? "EU default value" :
                <a href={`/statements/${p.upstream_statement_id}`}>supplier statement {p.upstream_statement_id}</a>}
            </p>
          ))}
        </section>
      )}

      {me.role === "supplier" && (
        <section className="card">
          {statement.status === "draft" && <button onClick={sign}>Sign statement</button>}
          <div className="row">
            <select value={recipient} onChange={(e) => setRecipient(e.target.value)}>
              <option value="">Share with...</option>
              {orgs.filter((o) => o.role !== "supplier").map((o) => (
                <option key={o.id} value={o.id}>{o.name} ({o.role})</option>
              ))}
            </select>
            <button onClick={share} disabled={!recipient}>Share</button>
          </div>
        </section>
      )}

      {me.role === "verifier" && statement.status === "signed" && (
        <section className="card">
          <h3>Your opinion</h3>
          <input placeholder="Comments" value={comments} onChange={(e) => setComments(e.target.value)} />
          <button onClick={() => opine("satisfactory")}>Satisfactory</button>
          <button onClick={() => opine("unsatisfactory")}>Unsatisfactory</button>
        </section>
      )}

      {me.role === "importer" && (
        <section className="card">
          <h3>Saving versus EU default</h3>
          <div className="row">
            <input value={tonnes} onChange={(e) => setTonnes(e.target.value)} placeholder="Tonnes imported" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Certificate price EUR" />
            <button onClick={calcSavings}>Calculate</button>
          </div>
          {savings && (
            <p>Actual {savings.actual_see} vs default {savings.default_see} tCO2 per tonne:
              saving about <strong>EUR {savings.saving_eur}</strong>. {savings.note}</p>
          )}
        </section>
      )}
    </div>
  );
}
