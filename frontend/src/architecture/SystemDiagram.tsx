// architecture/SystemDiagram.tsx
// The layered system diagram. Rows are layers (clients at the top, data
// at the bottom). Click any box to see what it does, which files hold
// it, and what it talks to. Boxes it is connected to light up.
//
// Dashed boxes are PLANNED, not built. We show them so the picture is
// honest about what exists and what is still to come.

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { LAYERS, NODES } from "./data";
import type { ArchNode } from "./data";
import { Pill } from "../ui/Pill";

export function SystemDiagram() {
  const [selected, setSelected] = useState<ArchNode>(NODES.find((n) => n.id === "statements")!);
  const linked = new Set([selected.id, ...selected.talksTo, ...NODES.filter((n) => n.talksTo.includes(selected.id)).map((n) => n.id)]);

  return (
    <div className="sys-layout">
      <div className="sys-layers">
        {LAYERS.map((layer, li) => {
          const nodes = NODES.filter((n) => n.layer === layer);
          return (
            <motion.div key={layer} className="sys-layer" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: li * 0.06 }}>
              <span className="mono sys-layer-name">{String(li + 1).padStart(2, "0")} {layer}</span>
              <div className="sys-nodes">
                {nodes.map((n) => (
                  <button key={n.id} className={`sys-node ${n.status} ${selected.id === n.id ? "on" : linked.has(n.id) ? "linked" : ""}`} onClick={() => setSelected(n)}>
                    <strong>{n.title}</strong><span>{n.subtitle}</span>
                    {n.status === "planned" && <em className="mono">PLANNED</em>}
                  </button>
                ))}
              </div>
              {li < LAYERS.length - 1 && <span className="sys-flow" aria-hidden />}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.aside key={selected.id} className="sys-detail" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
          <div className="toolbar"><span className="mono kicker">{selected.layer.toUpperCase()}</span>
            <Pill tone={selected.status === "built" ? "good" : "warn"} dot>{selected.status === "built" ? "Built" : "Planned"}</Pill></div>
          <h3 className="serif">{selected.title}</h3>
          <p className="muted-light">{selected.subtitle}</p>
          <span className="mono kicker">WHAT IT DOES</span>
          <ul>{selected.does.map((d) => <li key={d}>{d}</li>)}</ul>
          {selected.guarantees && <><span className="mono kicker">GUARANTEE</span><ul className="guar">{selected.guarantees.map((g) => <li key={g}>{g}</li>)}</ul></>}
          <span className="mono kicker">WHERE IT LIVES</span>
          <div className="filelist">{selected.files.map((f) => <code key={f}>{f}</code>)}</div>
          {selected.talksTo.length > 0 && <>
            <span className="mono kicker">TALKS TO</span>
            <div className="row">{selected.talksTo.map((id) => { const n = NODES.find((x) => x.id === id)!;
              return <button key={id} className="chip-btn" onClick={() => setSelected(n)}>{n.title}</button>; })}</div></>}
        </motion.aside>
      </AnimatePresence>
    </div>
  );
}
