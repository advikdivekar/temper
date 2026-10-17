// landing/parts/LogoStrip.tsx
// The strip along the bottom of the hero, in the spirit of a "trusted
// by" row. We have no customers to show yet, and we will not invent
// any. So this strip names what Temper is built on and aligned with:
// the regulation, the standards, and the technical foundations. Each
// is a plain wordmark. It scrolls slowly and fades at both edges.

const MARKS = [
  "EU CBAM", "Regulation 2023/956", "Implementing Reg. 2025/2547", "ISO 14064", "GHG Protocol",
  "WBCSD PACT", "India CCTS", "Ed25519", "SHA-256", "PostgreSQL", "OpenAPI", "FastAPI",
];

export function LogoStrip() {
  const row = MARKS.map((m) => <span key={m} className="mark">{m}</span>);
  return (
    <div className="logo-strip">
      <span className="mono strip-label">Built on and aligned with</span>
      <div className="strip-window" aria-hidden>
        <div className="strip-track"><div className="strip-row">{row}</div><div className="strip-row">{row}</div></div>
      </div>
    </div>
  );
}
