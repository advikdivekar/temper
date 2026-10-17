// architecture/ArchitecturePage.tsx
// The public architecture page: how Temper is built and why it can be
// trusted. Five tabs, each a different view of the same system:
//   System          layered components and what each one does
//   Data model      the database tables and how they connect
//   Request flows   animated sequences for the three key journeys
//   Security        threats, the control for each, and where it lives
//   Roadmap         what is built and what is honestly still planned

import { useState } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "../brand/Brand";
import { Tabs } from "../ui/Tabs";
import { DataModel } from "./DataModel";
import { FlowPlayer } from "./FlowPlayer";
import { RoadmapPanel, SecurityMatrix } from "./Panels";
import { SystemDiagram } from "./SystemDiagram";

type Tab = "system" | "data" | "flows" | "security" | "roadmap";

export function ArchitecturePage() {
  const [tab, setTab] = useState<Tab>("system");
  return (
    <div className="lp arch-page">
      <header className="verify-top"><Link to="/"><Wordmark height={16} tone="light" /></Link>
        <div className="row" style={{ gap: 24 }}><Link to="/verify" className="text-link">Verify a pack</Link><Link to="/" className="text-link">Back to Temper</Link></div></header>
      <main className="arch-main">
        <span className="mono kicker">SYSTEM ARCHITECTURE</span>
        <h1 className="serif display small">How Temper works,<br /><em className="ember-text">all the way down.</em></h1>
        <p className="muted-light lede-wide">A deterministic engine at the centre, a ledger that never forgets, signatures that cannot be faked, and AI kept at the edges, where a person always confirms. Everything below maps to real files in the repository.</p>
        <div className="lp-tabs">
          <Tabs value={tab} onChange={setTab} tabs={[
            { id: "system", label: "System" }, { id: "data", label: "Data model" }, { id: "flows", label: "Request flows" },
            { id: "security", label: "Security" }, { id: "roadmap", label: "Roadmap" }]} />
        </div>
        <div className="arch-body">
          {tab === "system" && <SystemDiagram />}
          {tab === "data" && <DataModel />}
          {tab === "flows" && <FlowPlayer />}
          {tab === "security" && <SecurityMatrix />}
          {tab === "roadmap" && <RoadmapPanel />}
        </div>
      </main>
    </div>
  );
}
