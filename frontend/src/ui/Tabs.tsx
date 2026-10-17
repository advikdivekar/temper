// ui/Tabs.tsx
// A row of tabs with a sliding underline.
//
// Motion idea: the underline is one element shared by all tabs
// (layoutId), so it glides from the old tab to the new one instead of
// jumping. Tabs are real buttons with the right ARIA roles.

import { motion } from "motion/react";
import { useId } from "react";

interface Props<T extends string> {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
}

export function Tabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  const group = useId();
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} role="tab" aria-selected={value === tab.id}
          className={value === tab.id ? "on" : ""} onClick={() => onChange(tab.id)}>
          {tab.label}
          {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
          {value === tab.id && (
            <motion.span layoutId={`tab-line-${group}`} className="tab-line"
              transition={{ type: "spring", stiffness: 420, damping: 34 }} />
          )}
        </button>
      ))}
    </div>
  );
}
