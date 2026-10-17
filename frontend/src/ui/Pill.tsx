// ui/Pill.tsx
// A small rounded label. The tone sets its colour.

import type { ReactNode } from "react";

export function Pill({
  children, tone = "neutral", dot = false,
}: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "ember"; dot?: boolean }) {
  return (
    <span className={`pill ${tone === "neutral" ? "" : tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}
