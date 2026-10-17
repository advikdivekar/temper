// ui/LiveNumber.tsx
// A number that glides smoothly to a new value whenever it changes
// (for example while dragging a slider). CountUp runs once; this one
// keeps following the value.
//
// Concept: a spring. Instead of jumping, the shown number is pulled
// toward the target like a weight on a spring, which feels natural.

import { animate, useMotionValue, useMotionValueEvent } from "motion/react";
import { useEffect, useState } from "react";

export function LiveNumber({
  value, decimals = 0, prefix = "",
}: { value: number; decimals?: number; prefix?: string }) {
  const motionValue = useMotionValue(value);
  const [shown, setShown] = useState(value);

  useMotionValueEvent(motionValue, "change", setShown);
  useEffect(() => {
    const controls = animate(motionValue, value, { type: "spring", stiffness: 140, damping: 22 });
    return () => controls.stop();
  }, [value, motionValue]);

  return (
    <span>
      {prefix}{shown.toLocaleString("en-IN", {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
      })}
    </span>
  );
}
