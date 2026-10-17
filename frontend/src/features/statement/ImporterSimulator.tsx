// features/statement/ImporterSimulator.tsx
// For an EU importer: drag two sliders and watch the saving versus the
// penalty default update live.
//
// saving = (default minus actual) x tonnes imported x certificate price
// It ignores the free allocation adjustment, so it is an upper bound.

import { useState } from "react";
import type { Statement } from "../../api/types";
import { LiveNumber } from "../../ui/LiveNumber";

export function ImporterSimulator({ statement }: { statement: Statement }) {
  const [tonnes, setTonnes] = useState(500);
  const [price, setPrice] = useState(80);
  const product = Object.keys(statement.see_by_product)[0];
  const actual = Number(statement.see_by_product[product]);
  const defaultSee = Number(statement.default_see_by_product?.[product] ?? actual);
  const perTonne = Math.max(defaultSee - actual, 0);
  const saving = perTonne * tonnes * price;

  return (
    <div className="card dark stack sticky">
      <span className="eyebrow light">Your saving versus default</span>
      <div className="serif" style={{ fontSize: 52, lineHeight: 1 }}>
        <LiveNumber value={saving} prefix="€" />
      </div>
      <p style={{ opacity: 0.7 }}>per year at these volumes. Before free allocation adjustment.</p>

      <div className="field"><label style={{ color: "rgba(255,255,255,.6)" }}>Tonnes imported: {tonnes}</label>
        <input className="range" type="range" min={10} max={5000} step={10} value={tonnes}
          onChange={(e) => setTonnes(Number(e.target.value))} /></div>
      <div className="field"><label style={{ color: "rgba(255,255,255,.6)" }}>Certificate price: €{price}</label>
        <input className="range" type="range" min={30} max={150} step={1} value={price}
          onChange={(e) => setPrice(Number(e.target.value))} /></div>
    </div>
  );
}
