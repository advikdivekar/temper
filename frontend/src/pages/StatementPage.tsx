// pages/StatementPage.tsx
// One statement, in full. Three tabs:
//   Overview        the result, where the carbon comes from, the chain
//   Evidence trail  the exact records and files behind every figure
//   Versions        earlier versions and what changed
// The right column holds the actions this role can take. The role
// decides what is shown:
//   supplier  full detail + sign / share / recompute
//   verifier  full detail + review desk
//   importer  result and chain only + saving simulator

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Chain, Statement } from "../api/types";
import { BreakdownBar } from "../features/statement/BreakdownBar";
import { ChainGraph } from "../features/statement/ChainGraph";
import { EvidenceTrail } from "../features/statement/EvidenceTrail";
import { ImporterSimulator } from "../features/statement/ImporterSimulator";
import { ResultHero } from "../features/statement/ResultHero";
import { StatementTools } from "../features/statement/StatementTools";
import { SupplierActions } from "../features/statement/SupplierActions";
import { TrustTimeline } from "../features/statement/TrustTimeline";
import { VerifierActions } from "../features/statement/VerifierActions";
import { VersionsPanel } from "../features/statement/VersionsPanel";
import { Icon } from "../ui/Icons";
import { Pill } from "../ui/Pill";
import { Reveal } from "../ui/Reveal";
import { StatePill } from "../ui/StatePill";
import { Tabs } from "../ui/Tabs";
import { useToast } from "../ui/Toast";

type Tab = "overview" | "evidence" | "versions";

export function StatementPage() {
  const { id } = useParams();
  const { me } = useAuth();
  const toast = useToast();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [chain, setChain] = useState<Chain | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        api<Statement>(`/statements/${id}`),
        api<Chain>(`/statements/${id}/chain`),
      ]);
      setStatement(s);
      setChain(c);
    } catch (problem) {
      toast.error("Could not open this statement", (problem as Error).message);
    }
  }, [id]);

  useEffect(() => { setStatement(null); setTab("overview"); load(); }, [load]);

  if (!statement || !me) {
    return <div className="stack"><div className="skeleton" style={{ height: 60, width: 360 }} />
      <div className="skeleton" style={{ height: 260 }} /><div className="skeleton" style={{ height: 200 }} /></div>;
  }

  const owner = me.role === "supplier" && statement.trace !== undefined;
  const detailed = statement.trace !== undefined;
  const tabs = [
    { id: "overview" as Tab, label: "Overview" },
    ...(detailed ? [{ id: "evidence" as Tab, label: "Evidence trail", count: statement.inputs?.length }] : []),
    { id: "versions" as Tab, label: "Versions" },
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <Link to="/statements" className="muted"><Icon name="arrow" size={14} /> All statements</Link>
          <h1 className="serif page-title">{statement.supplier}</h1>
          <p className="muted">{statement.installation} · {statement.period_start} to {statement.period_end} · statement #{statement.id}</p>
        </div>
        <div className="row"><StatePill statement={statement} />
          {statement.signature_valid && <Pill tone="good" dot>Signature valid</Pill>}</div>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      <div className="split">
        <div className="stack">
          {tab === "overview" && (
            <>
              <ResultHero statement={statement} />
              {detailed && statement.breakdown && <Reveal><BreakdownBar data={statement.breakdown} /></Reveal>}
              {chain && (
                <Reveal>
                  <div className="card">
                    <span className="eyebrow">Supply chain behind this number</span>
                    <div style={{ marginTop: 14 }}><ChainGraph chain={chain} /></div>
                  </div>
                </Reveal>
              )}
              <Reveal>
                <div className="card stack">
                  <span className="eyebrow">Trust trail</span>
                  {statement.timeline && <TrustTimeline events={statement.timeline} />}
                  <div className="hashbox mono"><span className="muted">content hash</span><br />{statement.content_hash}</div>
                  <p className="muted">Methodology {statement.methodology}</p>
                  {detailed && (
                    <>
                      <button className="btn quiet small" style={{ width: "fit-content" }} onClick={() => setShowTrace(!showTrace)}>
                        {showTrace ? "Hide" : "Show"} calculation trace
                      </button>
                      {showTrace && <div className="trace">{statement.trace!.map((l, i) => <div key={i}>{l}</div>)}</div>}
                    </>
                  )}
                </div>
              </Reveal>
            </>
          )}
          {tab === "evidence" && (
            <div className="card stack">
              <span className="eyebrow">Every input, with its proof</span>
              <p className="muted">These are the exact ledger rows this figure was calculated from, each tied to the file that supports it.</p>
              <EvidenceTrail inputs={statement.inputs ?? []} />
            </div>
          )}
          {tab === "versions" && <VersionsPanel statementId={statement.id} />}
        </div>

        <div className="stack">
          {owner && <SupplierActions statement={statement} onChange={load} />}
          {me.role === "verifier" && <VerifierActions statement={statement} onChange={load} />}
          {me.role === "importer" && <ImporterSimulator statement={statement} />}
          <StatementTools statement={statement} />
        </div>
      </div>
    </div>
  );
}
