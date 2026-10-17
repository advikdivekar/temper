// features/plant/ProgressRail.tsx
// Four step progress bar across the top of the plant workspace.
// Each bar fills with ember colour as that step is completed, which
// tells the user exactly where they are and what comes next.

import { motion } from "motion/react";
import { Icon } from "../../ui/Icons";

export interface RailStep { label: string; done: boolean }

export function ProgressRail({ steps }: { steps: RailStep[] }) {
  const current = steps.findIndex((s) => !s.done);
  return (
    <div className="rail">
      {steps.map((step, i) => (
        <div key={step.label}
          className={`rail-step ${step.done ? "done" : i === current ? "now" : ""}`}>
          <div className="rail-bar">
            <motion.div className="rail-fill" initial={false}
              animate={{ width: step.done ? "100%" : i === current ? "18%" : "0%" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          <small>
            {step.done ? <Icon name="check" size={14} /> : <span>{i + 1}</span>}
            {step.label}
          </small>
        </div>
      ))}
    </div>
  );
}
