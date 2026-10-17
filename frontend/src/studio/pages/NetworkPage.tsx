// studio/pages/NetworkPage.tsx
// The supply chain around you, as a glowing graph. Companies are
// circles, sized by how many statements they have. Lines show where
// material, and its carbon data, flows:
//   bright line, travelling dot   verified data flows through
//   dim dashed line               still on the EU default
//   ember dashed line             statements you shared with a customer
// Hover a company to light up its connections. Volumes are never shown.

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type { NetworkData } from "../../api/types";
import { useToast } from "../../ui/Toast";

const COL = 300, ROW = 150, R = 40;

export function NetworkPage() {
  const toast = useToast();
  const [data, setData] = useState<NetworkData | null>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => { api<NetworkData>("/network").then(setData).catch((e) => toast.error("Could not load the chain", (e as Error).message)); }, []);

  const layout = useMemo(() => {
    if (!data) return null;
    const depth = new Map<number, number>(data.nodes.map((n) => [n.id, 0]));
    for (let pass = 0; pass < data.nodes.length + 1; pass++)
      for (const e of data.edges) { const next = (depth.get(e.from) ?? 0) + 1; if ((depth.get(e.to) ?? 0) < next) depth.set(e.to, next); }
    const rows = new Map<number, number>();
    const placed = data.nodes.map((n) => {
      const d = depth.get(n.id) ?? 0, row = rows.get(d) ?? 0;
      rows.set(d, row + 1);
      return { node: n, x: 90 + d * COL, y: 80 + row * ROW };
    });
    return { placed, width: (Math.max(...depth.values()) + 1) * COL + 120, height: Math.max(...[...rows.values()]) * ROW + 60 };
  }, [data]);

  if (!data || !layout) return <div className="skeleton" style={{ height: 420 }} />;
  const at = (id: number) => layout.placed.find((p) => p.node.id === id)!;
  const lit = (e: { from: number; to: number }) => active === null || e.from === active || e.to === active;

  return (
    <div>
      <div className="stage-head">
        <span className="kicker mono">THE CHAIN</span>
        <h1 className="stage-title">Who feeds whom.</h1>
        <div className="row-chips"><span className="chip good"><i />verified data flows</span><span className="chip"><i />still on the EU default</span><span className="chip ember"><i />statements you shared</span></div>
      </div>
      <div className="net-wrap">
        <svg width={layout.width} height={layout.height} role="img" aria-label="Supply chain network">
          {data.edges.map((e, i) => {
            const a = at(e.from), b = at(e.to);
            const x1 = a.x + R, y1 = a.y, x2 = b.x - R, y2 = b.y, mid = (x1 + x2) / 2;
            const path = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
            const shared = e.kind === "shared", onDefault = e.from === 0 || (!shared && e.verified === 0);
            const color = shared ? "#ff5a1f" : onDefault ? "#6f6f6b" : "#e9e9e6";
            return (
              <g key={i} opacity={lit(e) ? 1 : 0.12}>
                <motion.path d={path} fill="none" stroke={color} strokeWidth={onDefault ? 1.4 : 2 + Math.min(e.links, 3)} strokeDasharray={onDefault || shared ? "6 7" : "0"}
                  style={{ filter: onDefault ? undefined : `drop-shadow(0 0 6px ${color}66)` }} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: i * 0.1 }} />
                {!onDefault && !shared && <motion.circle r="4.5" fill="#ff5a1f" style={{ offsetPath: `path("${path}")` }} initial={{ offsetDistance: "0%" }} animate={{ offsetDistance: "100%" }} transition={{ duration: 2.4, repeat: Infinity, ease: "linear", delay: i * 0.5 }} />}
                <text x={mid} y={(y1 + y2) / 2 - 12} textAnchor="middle" className="net-edge">{e.material}</text>
              </g>
            );
          })}
          {layout.placed.map(({ node, x, y }, i) => {
            const isDefault = node.id === 0;
            const verified = node.statements ? node.verified / node.statements : 0;
            return (
              <motion.g key={node.id} onMouseEnter={() => setActive(node.id)} onMouseLeave={() => setActive(null)} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: active === null || active === node.id || data.edges.some((e) => (e.from === node.id && e.to === active) || (e.to === node.id && e.from === active)) ? 1 : 0.3, scale: 1 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 18 }} style={{ transformOrigin: `${x}px ${y}px` }}>
                <circle cx={x} cy={y} r={R} fill="#0e1114" stroke={node.you ? "#ff5a1f" : "#a3a39f"} strokeWidth={node.you ? 2.5 : 1} strokeDasharray={isDefault ? "5 5" : "0"} />
                {!isDefault && <circle cx={x} cy={y} r={R - 6} fill="none" stroke="#3fd9a0" strokeWidth="3" strokeDasharray={`${verified * 2 * Math.PI * (R - 6)} 999`} transform={`rotate(-90 ${x} ${y})`} opacity={0.9} />}
                <text x={x} y={y + 6} textAnchor="middle" className="net-initial">{isDefault ? "EU" : node.name.slice(0, 1)}</text>
                <text x={x} y={y + R + 22} textAnchor="middle" className="net-name">{node.name}</text>
                <text x={x} y={y + R + 38} textAnchor="middle" className="net-sub">{isDefault ? "default values" : `${node.role} · ${node.verified}/${node.statements} verified`}</text>
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
