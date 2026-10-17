// features/statement/ChainGraph.tsx
// The supply chain behind a statement, drawn as nodes and links.
//
// How the layout works:
//   * The statement you are viewing is the rightmost column.
//   * Each step upstream moves one column left.
//   * A precursor that used the EU default has no company behind it,
//     so we draw a ghost node labelled "EU default".
// Links draw themselves and a dot travels along each one.

import { motion } from "motion/react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Chain } from "../../api/types";

const COL = 250;
const ROW = 120;
const BOX_W = 190;
const BOX_H = 76;

interface Placed { key: string; id: number | null; x: number; y: number; label: string; value: string; verified: boolean; ghost: boolean }

export function ChainGraph({ chain, dark = false }: { chain: Chain; dark?: boolean }) {
  const ink = dark ? "#f1f0ee" : "#0e0e10";
  const soft = dark ? "#a3a39f" : "#6b6a66";
  const box = dark ? "#0e1114" : "#ffffff";
  const ghost = dark ? "#14181c" : "#f3f0ea";
  const navigate = useNavigate();

  const layout = useMemo(() => {
    const depth = new Map<number, number>([[chain.root, 0]]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const edge of chain.edges) {
        if (edge.from !== null && depth.has(edge.to)) {
          const next = depth.get(edge.to)! + 1;
          if ((depth.get(edge.from) ?? -1) < next) { depth.set(edge.from, next); grew = true; }
        }
      }
    }
    const maxDepth = Math.max(...depth.values(), 0) + 1;
    const placed: Placed[] = [];
    const rowCount = new Map<number, number>();
    const spot = (d: number) => {
      const row = rowCount.get(d) ?? 0;
      rowCount.set(d, row + 1);
      return { x: (maxDepth - d) * COL - COL + 20, y: 20 + row * ROW };
    };
    for (const node of chain.nodes) {
      const d = depth.get(node.id) ?? 0;
      const first = Object.entries(node.see_by_product)[0];
      placed.push({ key: `n${node.id}`, id: node.id, ...spot(d), label: node.supplier,
        value: first ? `${first[1]} tCO2/t` : "", verified: node.verified, ghost: false });
    }
    for (const edge of chain.edges) {
      if (edge.from === null) {
        const d = (depth.get(edge.to) ?? 0) + 1;
        placed.push({ key: `g${edge.to}`, id: null, ...spot(d), label: "EU default value",
          value: edge.material, verified: false, ghost: true });
      }
    }
    return { placed, width: maxDepth * COL + 40, height: Math.max(...placed.map((p) => p.y)) + BOX_H + 30 };
  }, [chain]);

  const find = (key: string) => layout.placed.find((p) => p.key === key)!;
  const links = chain.edges.map((edge) => {
    const from = find(edge.from === null ? `g${edge.to}` : `n${edge.from}`);
    const to = find(`n${edge.to}`);
    const x1 = from.x + BOX_W, y1 = from.y + BOX_H / 2, x2 = to.x, y2 = to.y + BOX_H / 2;
    const mid = (x1 + x2) / 2;
    return { path: `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`, ghost: edge.uses_default };
  });

  return (
    <div className="chain-wrap">
      <svg width={layout.width} height={layout.height} role="img" aria-label="Supply chain behind this statement">
        {links.map((link, i) => (
          <g key={i}>
            <motion.path d={link.path} fill="none" stroke={link.ghost ? "#6f6f6b" : dark ? "#d8d8d4" : "#16202c"}
              strokeWidth="2" strokeDasharray={link.ghost ? "5 6" : "0"}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.3 + i * 0.2 }} />
            {!link.ghost && (
              <motion.circle r="5" fill="#ff5a1f" style={{ offsetPath: `path("${link.path}")` }}
                initial={{ offsetDistance: "0%" }} animate={{ offsetDistance: "100%" }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }} />
            )}
          </g>
        ))}
        {layout.placed.map((node, i) => (
          <motion.g key={node.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12, type: "spring", stiffness: 200, damping: 20 }}
            style={{ cursor: node.id ? "pointer" : "default" }}
            onClick={() => node.id && navigate(`/statements/${node.id}`)}>
            <rect x={node.x} y={node.y} width={BOX_W} height={BOX_H} rx="2"
              fill={node.ghost ? ghost : box} stroke={node.verified ? "#0f9d6b" : ink}
              strokeOpacity={node.verified ? 1 : 0.15} strokeWidth={node.verified ? 2 : 1}
              strokeDasharray={node.ghost ? "5 5" : "0"} />
            <text x={node.x + 16} y={node.y + 28} fontSize="13" fontWeight="600" fontFamily="Inter" fill={ink}>{node.label}</text>
            <text x={node.x + 16} y={node.y + 54} fontSize="14" fontFamily="JetBrains Mono" fill={soft}>{node.value}</text>
            {node.verified && <circle cx={node.x + BOX_W - 18} cy={node.y + 20} r="8" fill="#0f9d6b" />}
            {node.verified && <path d={`M ${node.x + BOX_W - 22} ${node.y + 20} l3 3 5 -6`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />}
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
