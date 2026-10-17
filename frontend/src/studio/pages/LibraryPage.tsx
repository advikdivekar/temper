// studio/pages/LibraryPage.tsx
// The reference library: the numbers the engine relies on. Search the
// EU default values by CN code or product name, see how a value rises
// from 2026 to 2028, and read the emission factors with their status.
//
// Honesty is part of the design. Every row says where it came from
// and whether it is confirmed:
//   Commission file   from the Commission's own Excel for the
//                     correcting act, informational, not the legal text
//   Verified          confirmed in a guidance document we hold
//   Unverified        from memory or a secondary source, to be checked

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type { ReferenceData } from "../../api/types";
import { useToast } from "../../ui/Toast";

const STATUS: Record<string, { label: string; tone: string }> = {
  commission_file: { label: "Commission file", tone: "good" },
  verified_guidance: { label: "Verified in guidance", tone: "good" },
  unverified: { label: "Unverified", tone: "warn" },
};

export function LibraryPage() {
  const toast = useToast();
  const [data, setData] = useState<ReferenceData | null>(null);
  const [query, setQuery] = useState("7318");
  const [pick, setPick] = useState<string | null>(null);

  useEffect(() => { api<ReferenceData>("/reference").then(setData).catch((e) => toast.error("Could not load the library", (e as Error).message)); }, []);

  const results = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.defaults.filter((d) => !q || d.cn_code.startsWith(q.replace(/\s/g, "")) || d.description.toLowerCase().includes(q)).slice(0, 14);
  }, [data, query]);
  const chosen = results.find((r) => r.cn_code === pick) ?? results[0];

  return (
    <div>
      <div className="stage-head">
        <span className="kicker mono">LIBRARY</span>
        <h1 className="stage-title">The numbers behind every result.</h1>
        <p className="stage-sub">EU default values for India, direct emissions, tCO2 per tonne.</p>
      </div>

      <input className="search-line huge" placeholder="Search a CN code or product" value={query} onChange={(e) => { setQuery(e.target.value); setPick(null); }} />

      <div className="lib-grid">
        <div className="lib-list">
          {results.map((r, i) => (
            <motion.button key={r.id} className={`lib-row ${chosen?.id === r.id ? "on" : ""}`} onClick={() => setPick(r.cn_code)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}>
              <span className="mono">{r.cn_code}</span><span className="lib-desc">{r.description}</span><b className="mono">{Number(r.base).toFixed(2)}</b>
            </motion.button>
          ))}
          {data && results.length === 0 && <p className="muted-light">No match.</p>}
        </div>

        {chosen && (
          <div className="lib-detail" key={chosen.id}>
            <span className="kicker mono">{chosen.cn_code} / INDIA</span>
            <h2 className="lib-title">{chosen.description}</h2>
            <div className="lib-years">
              {[["2026", chosen.marked_up["2026"], "+10%"], ["2027", chosen.marked_up["2027"], "+20%"], ["2028 on", chosen.marked_up["2028"], "+30%"]].map(([y, v, m], i) => (
                <motion.div key={y} className="lib-year" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.12 }}>
                  <span className="mono kicker">{y}</span><strong>{v}</strong><span className="mono">{m}</span>
                  <motion.i initial={{ height: 0 }} animate={{ height: `${(Number(v) / (Number(chosen.base) * 1.35)) * 100}%` }} transition={{ delay: 0.3 + i * 0.12, duration: 0.8 }} />
                </motion.div>
              ))}
            </div>
            <p className="muted-light">Base {Number(chosen.base).toFixed(3)}. The mark-up rises every year to push suppliers toward real, verified data.</p>
            <span className={`chip ${STATUS[chosen.status]?.tone ?? "warn"}`}><i />{STATUS[chosen.status]?.label ?? chosen.status}</span>
          </div>
        )}
      </div>

      <div className="stage-head" style={{ marginTop: 70 }}>
        <span className="kicker mono">EMISSION FACTORS</span>
      </div>
      <div className="factor-row">
        {data?.factors.map((f) => (
          <div key={f.id} className="factor">
            <strong>{f.name.replace("_", " ")}</strong>
            <span className="factor-n">{Number(f.value)}<small> per {f.per_unit}</small></span>
            <span className={`chip ${STATUS[f.status]?.tone ?? "warn"}`}><i />{STATUS[f.status]?.label ?? f.status}</span>
            <p>{f.source}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
