// architecture/FlowPlayer.tsx
// An animated sequence diagram. Pick a flow, then press Play to watch
// the request travel between the client, API, services, engine,
// database and audit log, one step at a time. Step and Reset give you
// control. Each step explains what happens and why.
//
// Concept: a sequence diagram has a vertical "lifeline" per actor and
// a horizontal arrow per message, ordered top to bottom in time.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ACTORS, FLOWS } from "./data";
import { Button } from "../ui/Button";
import { Tabs } from "../ui/Tabs";

const COL = 150, TOP = 56, ROW = 46;

export function FlowPlayer() {
  const [flowId, setFlowId] = useState(FLOWS[0].id);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const flow = FLOWS.find((f) => f.id === flowId)!;
  const x = (actor: string) => 50 + ACTORS.indexOf(actor) * COL;

  useEffect(() => { setStep(0); setPlaying(false); }, [flowId]);
  useEffect(() => {
    if (!playing) return;
    if (step >= flow.steps.length) { setPlaying(false); return; }
    const timer = setTimeout(() => setStep((s) => s + 1), 1300);
    return () => clearTimeout(timer);
  }, [playing, step, flow]);

  const current = flow.steps[Math.min(step, flow.steps.length) - 1];
  const height = TOP + flow.steps.length * ROW + 20;

  return (
    <div className="stack">
      <div className="lp-tabs">
        <Tabs value={flowId} onChange={setFlowId} tabs={FLOWS.map((f) => ({ id: f.id, label: f.title }))} />
      </div>
      <p className="muted-light">{flow.summary}</p>
      <div className="flow-grid">
        <div className="flow-svg-wrap">
          <svg viewBox={`0 0 ${50 + ACTORS.length * COL} ${height}`} width="100%" role="img" aria-label={`Sequence diagram: ${flow.title}`}>
            {ACTORS.map((a) => (
              <g key={a}>
                <text x={x(a)} y="24" textAnchor="middle" fill="#f1f0ee" fontSize="12" fontFamily="JetBrains Mono">{a}</text>
                <line x1={x(a)} x2={x(a)} y1="36" y2={height} stroke="#ffffff" strokeOpacity="0.15" strokeDasharray="3 5" />
              </g>
            ))}
            {flow.steps.map((s, i) => {
              const y = TOP + i * ROW, x1 = x(s.from), x2 = x(s.to), self = s.from === s.to, visible = i < step;
              return (
                <motion.g key={`${flowId}-${i}`} initial={false} animate={{ opacity: visible ? 1 : 0.1 }}>
                  {self ? (
                    <path d={`M ${x1} ${y} h 34 v 14 h -34`} fill="none" stroke={i === step - 1 ? "#ff5a1f" : "#a3a39f"} strokeWidth="1.6" />
                  ) : (
                    <>
                      <motion.line x1={x1} x2={x2} y1={y} y2={y} stroke={i === step - 1 ? "#ff5a1f" : "#a3a39f"} strokeWidth="1.6"
                        initial={false} animate={{ pathLength: visible ? 1 : 0 }} />
                      <polygon points={x2 > x1 ? `${x2},${y} ${x2 - 8},${y - 4} ${x2 - 8},${y + 4}` : `${x2},${y} ${x2 + 8},${y - 4} ${x2 + 8},${y + 4}`} fill={i === step - 1 ? "#ff5a1f" : "#a3a39f"} />
                    </>
                  )}
                  <text x={self ? x1 + 42 : (x1 + x2) / 2} y={self ? y + 4 : y - 7} textAnchor={self ? "start" : "middle"} fill={i === step - 1 ? "#ffffff" : "#8c8c88"} fontSize="10.5" fontFamily="JetBrains Mono">{s.label}</text>
                </motion.g>
              );
            })}
          </svg>
        </div>
        <div className="flow-side">
          <div className="row">
            <Button variant="ember" size="small" onClick={() => { if (step >= flow.steps.length) setStep(0); setPlaying(!playing); }}>{playing ? "Pause" : step >= flow.steps.length ? "Replay" : "Play"}</Button>
            <Button variant="ghost" size="small" disabled={step >= flow.steps.length} onClick={() => { setPlaying(false); setStep((s) => s + 1); }}>Step</Button>
            <Button variant="quiet" size="small" onClick={() => { setPlaying(false); setStep(0); }}>Reset</Button>
          </div>
          <span className="mono kicker">STEP {Math.min(step, flow.steps.length)} OF {flow.steps.length}</span>
          <AnimatePresence mode="wait">
            <motion.div key={`${flowId}${step}`} className="flow-detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {current ? <><strong className="mono">{current.label}</strong><p>{current.detail}</p></> : <p className="muted-light">Press Play or Step to begin.</p>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
