// landing/scenes/SiteFooter.tsx
// The closing footer: sources, honest limits, and an oversized
// wordmark that fades into the page.

import { Mark, Wordmark } from "../../brand/Brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="foot-grid">
        <div className="foot-brand"><Mark size={26} /><Wordmark height={12} tone="light" /></div>
        <div className="mono foot-col">
          <span>SOURCES</span>
          <p>GTRI via AlCircle, EY, CMS, DQS, EU Official Journal (Regulation 2023/956 and Implementing Regulation 2025/2547).</p>
        </div>
        <div className="mono foot-col">
          <span>HONEST LIMITS</span>
          <p>Demo data is synthetic. Default values and factors are unverified placeholders. Not a regulatory filing.</p>
        </div>
      </div>
      <div className="wordmark-big" aria-hidden><Wordmark height={400} tone="light" fluid /></div>
    </footer>
  );
}
