// ui/CountUp.tsx
// A number that counts up to its value when it appears.
//
// Concept: animate(from, to, options) from the motion library runs a
// smooth tween and calls onUpdate each frame. We store the current
// frame value in state so React redraws the text.

import { animate, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  grouping?: boolean;
}

export function CountUp({
  value, decimals = 0, duration = 1.4, prefix = "", suffix = "", grouping = true,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true, margin: "-40px" });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setShown,
    });
    return () => controls.stop();
  }, [visible, value, duration]);

  return (
    <span ref={ref}>
      {prefix}{shown.toLocaleString("en-IN", {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
        useGrouping: grouping,
      })}{suffix}
    </span>
  );
}
