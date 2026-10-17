// landing/parts/Ticker.tsx
// A strip of short phrases that scrolls forever.
//
// How: the list is written twice in a row, and the strip slides left
// by exactly half its width, then jumps back. Because both halves are
// identical the jump is invisible. It is pure CSS (see landing.css),
// pauses on hover, and stops completely for visitors who prefer
// reduced motion.

const PHRASES = [
  "Direct emissions", "Precursor chains", "EU default +30% by 2028",
  "SHA256 evidence", "Ed25519 signatures", "Hash chained audit log",
  "Verified by accredited verifiers", "Reproducible calculations",
];

export function Ticker() {
  const row = PHRASES.map((text) => <span key={text}>{text}</span>);
  return (
    <div className="ticker" aria-hidden>
      <div className="ticker-track">
        <div className="ticker-row">{row}</div>
        <div className="ticker-row">{row}</div>
      </div>
    </div>
  );
}
