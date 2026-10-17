// world/Readout.tsx
// A number that follows a motion value WITHOUT re-rendering React.
//
// Why: the heat value changes 60 times a second while you hold. If we
// stored it in React state every frame the whole scene would redraw.
// Instead we write the text straight into the DOM node. This is a
// common technique for fast animated numbers.

import type { MotionValue } from "motion/react";
import { useEffect, useRef } from "react";

interface Props {
  source: MotionValue<number>;
  format: (value: number) => string;
  className?: string;
}

export function Readout({ source, format, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const write = (value: number) => {
      if (ref.current) ref.current.textContent = format(value);
    };
    write(source.get());
    return source.on("change", write);
  }, [source, format]);

  return <span ref={ref} className={className} />;
}

/** The same idea for text inside an SVG picture. */
export function SvgReadout({
  source, format, x, y, className,
}: Props & { x: number; y: number }) {
  const ref = useRef<SVGTextElement>(null);

  useEffect(() => {
    const write = (value: number) => {
      if (ref.current) ref.current.textContent = format(value);
    };
    write(source.get());
    return source.on("change", write);
  }, [source, format]);

  return <text ref={ref} x={x} y={y} className={className} />;
}

/** The same idea for a run of text inside an SVG text element (a tspan). */
export function ReadoutSpan({ source, format }: Omit<Props, "className">) {
  const ref = useRef<SVGTSpanElement>(null);

  useEffect(() => {
    const write = (value: number) => {
      if (ref.current) ref.current.textContent = format(value);
    };
    write(source.get());
    return source.on("change", write);
  }, [source, format]);

  return <tspan ref={ref} />;
}
