// landing/HeroGraph.tsx
// The animated picture at the top of the landing page. It shows the
// whole product in 6 seconds: a steel mill's verified number travels
// to a bolt maker, whose number then travels to an EU importer.
//
// Concepts:
//   SVG path + dash offset  makes the "data flows along the line" look
//   motion.circle with offsetPath  moves a dot along the line
//   a repeating keyframe loop  keeps the story playing

import { motion } from "motion/react";
import { Icon } from "../ui/Icons";

const NODES = [
  { id: "mill", x: 70, y: 70, title: "Steel Mill", value: "2.40", tone: "#16202c" },
  { id: "bolts", x: 330, y: 190, title: "Bolt Works", value: "2.64", tone: "#16202c" },
  { id: "eu", x: 590, y: 90, title: "EU Importer", value: "saves 47%", tone: "#ff5a1f" },
];

const LINK_ONE = "M 190 100 C 260 100, 250 220, 320 220";
const LINK_TWO = "M 450 220 C 520 220, 510 120, 580 120";

function Packet({ path, delay }: { path: string; delay: number }) {
  return (
    <motion.circle
      r="6" fill="#ff5a1f"
      style={{ offsetPath: `path("${path}")` }}
      initial={{ offsetDistance: "0%", opacity: 0 }}
      animate={{ offsetDistance: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 2.4, delay, repeat: Infinity, repeatDelay: 1.8, ease: "easeInOut" }}
    />
  );
}

export function HeroGraph() {
  return (
    <div className="hero-graph">
      <svg viewBox="0 0 740 340" width="100%" role="img"
        aria-label="A steel mill's verified emissions flow to a bolt maker and then to an EU importer">
        {[LINK_ONE, LINK_TWO].map((path) => (
          <motion.path key={path} d={path} fill="none" stroke="#0e0e10"
            strokeOpacity="0.2" strokeWidth="2" strokeDasharray="6 8"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, delay: 0.6 }} />
        ))}
        <Packet path={LINK_ONE} delay={1.4} />
        <Packet path={LINK_TWO} delay={3.2} />

        {NODES.map((node, index) => (
          <motion.g key={node.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.25, type: "spring", stiffness: 160, damping: 18 }}>
            <rect x={node.x} y={node.y} width="130" height="86" rx="18"
              fill={node.id === "eu" ? "#fff0e8" : "#ffffff"}
              stroke="#0e0e10" strokeOpacity="0.12" />
            <text x={node.x + 16} y={node.y + 28} fontSize="12" fill="#6b6a66"
              fontFamily="Inter" fontWeight="600">{node.title}</text>
            <text x={node.x + 16} y={node.y + 62} fontSize={node.id === "eu" ? 22 : 30}
              fill={node.tone} fontFamily="Instrument Serif">{node.value}</text>
          </motion.g>
        ))}

        <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 2.2, type: "spring", stiffness: 300, damping: 14 }}
          style={{ transformOrigin: "180px 80px" }}>
          <circle cx="180" cy="80" r="13" fill="#0f9d6b" />
          <path d="M174 80l4 4 8-8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </motion.g>
      </svg>
      <div className="hero-graph-caption">
        <Icon name="shield" size={16} /> Signed and verified at every step
      </div>
    </div>
  );
}
