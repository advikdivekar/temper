// landing/scenes/SiteFooter.tsx
// The closing footer: sources, honest limits, and an oversized
// wordmark that fades into the page.

import { Logo } from "../../brand/Brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="foot-grid">
        <div><Logo size={22} tone="light" /></div>
        <div className="mono foot-col">
          <span>SOURCES</span>
          <p>GTRI via AlCircle, EY, CMS, EU Official Journal.</p>
        </div>
      </div>
      <div className="wordmark serif" aria-hidden>temper</div>
    </footer>
  );
}
