// pages/ReferencePage.tsx
// The numbers the engine relies on, in plain sight: emission factors,
// EU default values and the rules that turn them into results. Each
// row shows its source and version, because a calculation is only as
// trustworthy as its inputs. Rows whose source is not an official
// publication are flagged so nobody mistakes them for final values.

import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ReferenceData } from "../api/types";
import { PageHead } from "../ui/PageHead";
import { Pill } from "../ui/Pill";
import { Tabs } from "../ui/Tabs";
import { useToast } from "../ui/Toast";

type Tab = "defaults" | "factors" | "rules";

const unofficial = (source: string, version: string) => /placeholder|unverified|secondary/i.test(source + version);

export function ReferencePage() {
  const toast = useToast();
  const [data, setData] = useState<ReferenceData | null>(null);
  const [tab, setTab] = useState<Tab>("defaults");
  const [year, setYear] = useState("2026");

  useEffect(() => {
    api<ReferenceData>("/reference").then(setData).catch((e) => toast.error("Could not load reference data", (e as Error).message));
  }, []);

  return (
    <div className="stack">
      <PageHead eyebrow="Reference data" title="The numbers behind every result."
        description="Versioned and sourced. A statement records exactly which rows it used, so it can be reproduced years later." />
      <div className="card warnbox-flat">
        <Pill tone="warn" dot>Unverified values</Pill>
        <span>Rows marked below are placeholders or from secondary sources. Replace them from the official Commission publications before any real use.</span>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "defaults", label: "EU default values", count: data?.defaults.length },
        { id: "factors", label: "Emission factors", count: data?.factors.length }, { id: "rules", label: "Methodology rules" }]} />
      {!data && <div className="skeleton" style={{ height: 240 }} />}

      {data && tab === "defaults" && (
        <div className="card stack">
          <div className="toolbar"><span className="muted">Defaults rise every year by a fixed mark-up.</span>
            <div className="seg">{["2026", "2027", "2028"].map((y) => <button key={y} className={year === y ? "on" : ""} onClick={() => setYear(y)}><span style={{ position: "relative" }}>{y}</span></button>)}</div></div>
          <table className="table">
            <thead><tr><th>CN code</th><th>Country</th><th className="num">Base</th><th className="num">With {year} mark-up</th><th>Version</th><th>Status</th></tr></thead>
            <tbody>{data.defaults.map((d) => (
              <tr key={d.id}><td className="mono">{d.cn_code}</td><td>{d.country}</td><td className="num">{d.base}</td>
                <td className="num"><strong>{d.marked_up[year]}</strong></td><td className="mono">{d.version}</td>
                <td>{unofficial(d.source, d.version) ? <Pill tone="warn" dot>Unverified</Pill> : <Pill tone="good" dot>Official</Pill>}</td></tr>))}</tbody>
          </table>
        </div>
      )}

      {data && tab === "factors" && (
        <div className="card">
          <table className="table">
            <thead><tr><th>Name</th><th className="num">tCO2 per unit</th><th>Unit</th><th>Version</th><th>Status</th></tr></thead>
            <tbody>{data.factors.map((f) => (
              <tr key={f.id}><td>{f.name}</td><td className="num">{f.value}</td><td className="mono">{f.per_unit}</td><td className="mono">{f.version}</td>
                <td>{unofficial(f.source, f.version) ? <Pill tone="warn" dot>Placeholder</Pill> : <Pill tone="good" dot>Official</Pill>}</td></tr>))}</tbody>
          </table>
        </div>
      )}

      {data && tab === "rules" && data.methodologies.map((m) => (
        <div key={m.key} className="card stack">
          <div className="toolbar"><h3 className="mono">{m.key}</h3><Pill tone="ember">Active</Pill></div>
          <div className="grid-3">
            <div><span className="eyebrow">Electricity (indirect)</span><p>{m.includes_indirect ? "Counted" : "Not counted for steel and aluminium goods"}</p></div>
            <div><span className="eyebrow">Result precision</span><p>{m.see_decimals} decimals</p></div>
            <div><span className="eyebrow">Default mark-up</span><p>{Object.entries(m.markup).map(([y, v]) => `${y}: ${v}`).join(" / ")}</p></div>
          </div>
          <p className="muted">Unverified supplier data is never used as actual: the marked-up EU default applies instead. Attribution across products is by tonnes of product.</p>
        </div>
      ))}
    </div>
  );
}
