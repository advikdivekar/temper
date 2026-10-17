// architecture/Panels.tsx
// Two plain but important panels: the security matrix (which threat is
// handled by which control, and where it lives in the code) and the
// roadmap (what is built and what is honestly still planned).

import { motion } from "motion/react";
import { ROADMAP, THREATS } from "./data";
import { Icon } from "../ui/Icons";

const MARK = { done: "Handled", partial: "Partial", todo: "Not built" } as const;

export function SecurityMatrix() {
  return (
    <div className="threats">
      <div className="threat head mono"><span>THREAT</span><span>CONTROL</span><span>WHERE</span><span>STATE</span></div>
      {THREATS.map((t, i) => (
        <motion.div key={t.threat} className="threat" initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
          <strong>{t.threat}</strong><span>{t.control}</span><code>{t.where}</code>
          <span className={`state ${t.status}`}>{MARK[t.status]}</span>
        </motion.div>
      ))}
    </div>
  );
}

export function RoadmapPanel() {
  return (
    <div className="road">
      <div>
        <span className="mono kicker">BUILT AND TESTED</span>
        <ul>{ROADMAP.built.map((b, i) => <motion.li key={b} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}><Icon name="check" size={15} />{b}</motion.li>)}</ul>
      </div>
      <div>
        <span className="mono kicker">PLANNED, NOT BUILT</span>
        <ul className="planned">{ROADMAP.planned.map((b, i) => <motion.li key={b} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}><span className="ring" />{b}</motion.li>)}</ul>
      </div>
    </div>
  );
}
