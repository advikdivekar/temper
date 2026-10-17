// studio/pages/LibraryPage.tsx
// The numbers the engine relies on. Search the EU default values for
// India by CN code or product, see how a value rises from 2026 to 2028,
// and read the emission factors with their verification status.

import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type { ReferenceData } from "../../api/types";
import { useToast } from "../../ui/Toast";

const STATUS: Record<string, [string, string]> = {
  commission_file: ["good", "Commission file"], verified_guidance: ["good", "Verified in guidance"], unverified: ["warn", "Unverified"],
};

export function LibraryPage() {
  const toast = useToast();
  const [data, setData] = useState<ReferenceData | null>(null);
  const [query, setQuery] = useState("7318");
  const [pick, setPick] = useState<number | null>(null);
  useEffect(() => { api<ReferenceData>("/reference").then(setData).catch((e) => toast.error("Could not load the library", (e as Error).message)); }, []);

  const results = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.defaults.filter((d) => !q || d.cn_code.startsWith(q.replace(/\s/g, "")) || d.description.toLowerCase().includes(q)).slice(0, 14);
  }, [data, query]);
  const chosen = results.find((r) => r.id === pick) ?? results[0];

  return (
    <div>
      <div className="head"><span className="kicker">Library</span><h1 className="title">The numbers behind every result.</h1>
        <p className="lead">EU default values for India, direct emissions, tCO2 per tonne.</p></div>
      <input className="input" placeholder="Search a CN code or product" value={query} onChange={(e) => { setQuery(e.target.value); setPick(null); }} style={{ maxWidth: 420, marginBottom: 26 }} />
      <div className="lib">
        <div>{results.map((r) => (
          <button key={r.id} className={`lib-row ${chosen?.id === r.id ? "on" : ""}`} onClick={() => setPick(r.id)}><span className="mono">{r.cn_code}</span><span className="soft">{r.description}</span><b className="mono">{Number(r.base).toFixed(2)}</b></button>
        ))}{data && results.length === 0 && <p className="row-empty">No match.</p>}</div>
        {chosen && (
          <div>
            <span className="kicker">{chosen.cn_code} / India</span>
            <h2 className="title" style={{ fontSize: 26, margin: "8px 0" }}>{chosen.description}</h2>
            <div className="years">{[["2026", chosen.marked_up["2026"], "+10%"], ["2027", chosen.marked_up["2027"], "+20%"], ["2028 on", chosen.marked_up["2028"], "+30%"]].map(([y, v, m]) => (
              <div key={y} className="year"><span className="kicker">{y}</span><strong>{v}</strong><span className="soft mono" style={{ fontSize: 12 }}>{m}</span></div>))}</div>
            <p className="soft">Base {Number(chosen.base).toFixed(3)}. The mark-up rises every year to push suppliers toward verified data.</p>
            <p style={{ marginTop: 12 }}><i className={`dot ${STATUS[chosen.status]?.[0] ?? "warn"}`} />{STATUS[chosen.status]?.[1] ?? chosen.status}</p>
          </div>
        )}
      </div>
      <div className="head" style={{ marginTop: 64 }}><span className="kicker">Emission factors</span></div>
      <div className="factors">{data?.factors.map((f) => (
        <div key={f.id} className="factor"><strong>{f.name.replace("_", " ")}</strong><span className="n">{Number(f.value)}</span>
          <span className="soft">per {f.per_unit}</span><p><i className={`dot ${STATUS[f.status]?.[0] ?? "warn"}`} />{STATUS[f.status]?.[1] ?? f.status}</p><p>{f.source}</p></div>
      ))}</div>
    </div>
  );
}
