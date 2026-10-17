// studio/pages/NetworkPage.tsx
// The supply chain around you: companies as circles, lines for where
// material and its carbon data flow. A solid dark line means verified
// data flows through it. A dashed grey line is still on the EU default.
// A dashed ember line is statements you shared. Volumes are never shown.

import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type { NetworkData } from "../../api/types";
import { useToast } from "../../ui/Toast";

const COL = 290, ROW = 140, R = 34;

export function NetworkPage() {
  const toast = useToast();
  const [data, setData] = useState<NetworkData | null>(null);
  useEffect(() => { api<NetworkData>("/network").then(setData).catch((e) => toast.error("Could not load the chain", (e as Error).message)); }, []);

  const layout = useMemo(() => {
    if (!data) return null;
    const depth = new Map<number, number>(data.nodes.map((n) => [n.id, 0]));
    for (let p = 0; p < data.nodes.length + 1; p++) for (const e of data.edges) { const next = (depth.get(e.from) ?? 0) + 1; if ((depth.get(e.to) ?? 0) < next) depth.set(e.to, next); }
    const rows = new Map<number, number>();
    const placed = data.nodes.map((n) => { const d = depth.get(n.id) ?? 0, r = rows.get(d) ?? 0; rows.set(d, r + 1); return { node: n, x: 70 + d * COL, y: 60 + r * ROW }; });
    return { placed, width: (Math.max(...depth.values()) + 1) * COL + 80, height: Math.max(...[...rows.values()]) * ROW + 50 };
  }, [data]);

  if (!data || !layout) return <div className="skeleton" style={{ height: 380 }} />;
  const at = (id: number) => layout.placed.find((p) => p.node.id === id)!;

  return (
    <div>
      <div className="head"><span className="kicker">The chain</span><h1 className="title">Who feeds whom.</h1></div>
      <div className="net">
        <svg width={layout.width} height={layout.height} role="img" aria-label="Supply chain">
          {data.edges.map((e, i) => {
            const a = at(e.from), b = at(e.to), x1 = a.x + R, y1 = a.y, x2 = b.x - R, y2 = b.y, mid = (x1 + x2) / 2;
            const shared = e.kind === "shared", onDefault = e.from === 0 || (!shared && e.verified === 0);
            return (<g key={i}><path d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`} fill="none" strokeWidth={onDefault ? 1.3 : 2.2}
              stroke={shared ? "#ff5a1f" : onDefault ? "#8b8a84" : "#0e0e10"} strokeDasharray={shared || onDefault ? "6 6" : "0"} />
              <text x={mid} y={(y1 + y2) / 2 - 10} textAnchor="middle" className="net-edge">{e.material}</text></g>);
          })}
          {layout.placed.map(({ node, x, y }) => (
            <g key={node.id}>
              <circle cx={x} cy={y} r={R} fill="#f7f5f1" stroke={node.you ? "#ff5a1f" : "#0e0e10"} strokeWidth={node.you ? 2.5 : 1} strokeDasharray={node.id === 0 ? "5 5" : "0"} />
              <text x={x} y={y + 8} textAnchor="middle" className="net-init">{node.id === 0 ? "EU" : node.name.slice(0, 1)}</text>
              <text x={x} y={y + R + 20} textAnchor="middle" className="net-name">{node.name}</text>
              <text x={x} y={y + R + 36} textAnchor="middle" className="net-sub">{node.id === 0 ? "default values" : `${node.role}, ${node.verified}/${node.statements} verified`}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="legend"><span><i className="dot" style={{ background: "#0e0e10" }} />verified data flows</span><span><i className="dot" />still on the EU default</span><span><i className="dot ember" />statements you shared</span></div>
    </div>
  );
}
