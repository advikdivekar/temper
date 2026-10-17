// pages/NetworkPage.tsx
// The supply chain around you, drawn as a graph.
//
// Companies are nodes. A link means material flows from one company
// to another and its carbon data travels with it. Link style tells
// the story at a glance:
//   solid dark    verified data flows through this link
//   dashed grey   this link is still on the EU default
//   dashed ember  statements you have shared with a customer
// Volumes are never shown here, only who connects to whom.

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { NetworkData, NetNode } from "../api/types";
import { PageHead } from "../ui/PageHead";
import { Pill } from "../ui/Pill";
import { useToast } from "../ui/Toast";

const COL = 270, ROW = 124, BOX_W = 210, BOX_H = 84;

export function NetworkPage() {
  const toast = useToast();
  const [data, setData] = useState<NetworkData | null>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    api<NetworkData>("/network").then(setData).catch((e) => toast.error("Could not load the network", (e as Error).message));
  }, []);

  const layout = useMemo(() => {
    if (!data) return null;
    const depth = new Map<number, number>(data.nodes.map((n) => [n.id, 0]));
    for (let pass = 0; pass < data.nodes.length + 1; pass++) {
      for (const e of data.edges) {
        const next = (depth.get(e.from) ?? 0) + 1;
        if ((depth.get(e.to) ?? 0) < next) depth.set(e.to, next);
      }
    }
    const rows = new Map<number, number>();
    const placed = data.nodes.map((n) => {
      const d = depth.get(n.id) ?? 0;
      const row = rows.get(d) ?? 0;
      rows.set(d, row + 1);
      return { node: n, x: 30 + d * COL, y: 30 + row * ROW };
    });
    const width = (Math.max(...depth.values()) + 1) * COL + 40;
    const height = Math.max(...[...rows.values()]) * ROW + 40;
    return { placed, width, height };
  }, [data]);

  if (!data || !layout) return <div className="skeleton" style={{ height: 420 }} />;

  const at = (id: number) => layout.placed.find((p) => p.node.id === id)!;
  const connected = (id: number) => data.edges.some((e) => (e.from === id || e.to === id) && active !== null && (e.from === active || e.to === active));

  return (
    <div className="stack">
      <PageHead eyebrow="Supply chain" title="Who feeds whom."
        description="Every company in your data chain, and whether verified data or the EU default flows between them." />
      <div className="card">
        <div className="chain-wrap" style={{ overflowX: "auto" }}>
          <svg width={layout.width} height={layout.height} role="img" aria-label="Supply chain network">
            {data.edges.map((e, i) => {
              const a = at(e.from), b = at(e.to);
              const x1 = a.x + BOX_W, y1 = a.y + BOX_H / 2, x2 = b.x, y2 = b.y + BOX_H / 2, mid = (x1 + x2) / 2;
              const path = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
              const shared = e.kind === "shared";
              const onDefault = e.from === 0 || (!shared && e.verified === 0);
              const lit = active === null || e.from === active || e.to === active;
              return (
                <g key={i} opacity={lit ? 1 : 0.15}>
                  <motion.path d={path} fill="none" strokeWidth={1.5 + Math.min(e.links, 4)}
                    stroke={shared ? "#ff5a1f" : onDefault ? "#a5a39d" : "#16202c"}
                    strokeDasharray={shared || onDefault ? "6 6" : "0"}
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: i * 0.1 }} />
                  {!onDefault && !shared && (
                    <motion.circle r="4.5" fill="#ff5a1f" style={{ offsetPath: `path("${path}")` }}
                      initial={{ offsetDistance: "0%" }} animate={{ offsetDistance: "100%" }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "linear", delay: i * 0.4 }} />
                  )}
                  <text x={mid} y={(y1 + y2) / 2 - 8} textAnchor="middle" className="chart-axis">{e.material} / {e.links}</text>
                </g>
              );
            })}
            {layout.placed.map(({ node, x, y }, i) => (
              <motion.g key={node.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: active === null || active === node.id || connected(node.id) ? 1 : 0.3, y: 0 }}
                transition={{ delay: i * 0.08 }} onMouseEnter={() => setActive(node.id)} onMouseLeave={() => setActive(null)} style={{ cursor: "default" }}>
                <rect x={x} y={y} width={BOX_W} height={BOX_H} rx="2" fill={node.id === 0 ? "#e8e5de" : "#fff"}
                  stroke={node.you ? "#ff5a1f" : "#0e0e10"} strokeOpacity={node.you ? 1 : 0.18} strokeWidth={node.you ? 2 : 1} strokeDasharray={node.id === 0 ? "5 5" : "0"} />
                <text x={x + 14} y={y + 26} fontSize="14" fontWeight="600" fontFamily="Inter" fill="#0e0e10">{node.name}</text>
                <text x={x + 14} y={y + 46} fontSize="10" fontFamily="JetBrains Mono" fill="#6b6a66" letterSpacing="1">{node.role.toUpperCase()}{node.you ? " / YOU" : ""}</text>
                {node.id !== 0 && <text x={x + 14} y={y + 68} fontSize="12" fontFamily="JetBrains Mono" fill="#16202c">{node.verified}/{node.statements} verified</text>}
              </motion.g>
            ))}
          </svg>
        </div>
        <div className="legend" style={{ marginTop: 16 }}>
          <span><i style={{ background: "#16202c" }} />verified data flows</span>
          <span><i style={{ background: "#a5a39d" }} />still on EU default</span>
          <span><i style={{ background: "#ff5a1f" }} />statements you shared</span>
        </div>
      </div>
      <div className="grid-3">
        {data.nodes.filter((n: NetNode) => n.id !== 0).map((n) => (
          <div key={n.id} className="card"><span className="eyebrow">{n.role}</span><h3>{n.name}</h3>
            <p className="muted">{n.verified} of {n.statements} statements verified</p>
            {n.you && <Pill tone="ember">Your organization</Pill>}</div>
        ))}
      </div>
    </div>
  );
}
