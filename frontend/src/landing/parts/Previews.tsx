// landing/parts/Previews.tsx
// Five tiny live pictures, one per step of how Temper works. They
// are shown next to the numbered list on the landing page. Each one
// replays when it appears (the "key" prop changes when you switch
// rows), and they use currentColor so they fit light or dark pages.

import { motion } from "motion/react";

export function FingerprintPreview() {
  const hash = "9f2c1a7e04b8d35a61c9e0f4";
  return (
    <div className="pv">
      <span className="eyebrow">sha256</span>
      <div className="pv-hash mono">
        {hash.split("").map((ch, i) => (
          <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>{ch}</motion.span>
        ))}
      </div>
      <p className="pv-note">sample_coal_invoice.pdf matches the stored fingerprint</p>
    </div>
  );
}

export function EnginePreview() {
  const rows = [
    { l: "Fuel burned", w: 12 }, { l: "Purchased steel", w: 88 },
  ];
  return (
    <div className="pv">
      <span className="eyebrow">where the carbon comes from</span>
      {rows.map((r, i) => (
        <div key={r.l} className="pv-bar-row"><small>{r.l}</small>
          <motion.i initial={{ width: 0 }} animate={{ width: `${r.w}%` }} transition={{ delay: 0.15 + i * 0.15, duration: 0.8 }} /></div>
      ))}
      <p className="pv-note mono">264.0 tCO2 / 100 t = 2.64</p>
    </div>
  );
}

export function ChainPreview() {
  return (
    <div className="pv">
      <span className="eyebrow">supply chain</span>
      <svg viewBox="0 0 260 70" width="100%">
        {[20, 120, 220].map((x, i) => (
          <motion.circle key={x} cx={x} cy="35" r="11" fill="none" stroke="currentColor" strokeWidth="1.5"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.25 }} />
        ))}
        <motion.path d="M31 35H109M131 35H209" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
      </svg>
      <p className="pv-note mono">mill 2.40 to bolt works 2.64</p>
    </div>
  );
}

export function SignaturePreview() {
  return (
    <div className="pv">
      <span className="eyebrow">signature</span>
      <svg viewBox="0 0 220 60" width="100%">
        <motion.path d="M8 40 C 28 6, 44 54, 62 26 S 98 6, 118 36 S 160 44, 212 16" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4 }} />
      </svg>
      <p className="pv-note mono">ed25519 valid / opinion: satisfactory</p>
    </div>
  );
}

export function SavingsPreview() {
  return (
    <div className="pv">
      <span className="eyebrow">importer view</span>
      <div className="pv-big serif">47% <small>below the default</small></div>
      <p className="pv-note">Result and status only. Raw volumes stay private.</p>
    </div>
  );
}
