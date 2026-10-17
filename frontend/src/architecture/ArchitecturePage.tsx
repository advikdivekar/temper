// architecture/ArchitecturePage.tsx
// The public architecture page. One diagram, one flow, no tabs.
// Scroll to follow a request from a person's action down to what an
// importer receives. Every step names the files that implement it.

import { Link } from "react-router-dom";
import { Wordmark } from "../brand/Brand";
import { FlowDiagram } from "./FlowDiagram";

export function ArchitecturePage() {
  return (
    <div className="lp arch-page">
      <header className="verify-top">
        <Link to="/"><Wordmark height={20} tone="light" /></Link>
        <div className="row" style={{ gap: 24 }}><Link to="/verify" className="text-link">Verify a pack</Link><Link to="/" className="text-link">Back</Link></div>
      </header>
      <main className="arch-main">
        <span className="mono kicker">SYSTEM ARCHITECTURE</span>
        <h1 className="serif arch-title">How Temper works.</h1>
        <p className="muted-light arch-sub">Follow one request, top to bottom.</p>
        <div className="arch-legend mono"><span><i className="solid" />built</span><span><i className="dashed" />planned</span></div>
        <FlowDiagram />
        <p className="arch-end serif">AI stays at the edge. The calculation never depends on it.</p>
      </main>
    </div>
  );
}
