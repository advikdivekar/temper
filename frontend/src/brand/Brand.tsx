// brand/Brand.tsx
// The Temper brand marks as React components.
//
//   Wordmark  the lowercase word "temper" in a clean geometric sans
//   Mark      a round app mark: a white lowercase t on ember
//   Logo      mark and wordmark together
//
// Colour: tone "light" is for dark or photographic backgrounds
// (white). Tone "dark" is for light backgrounds (near black).

import { GLYPH_T, WORDMARK } from "./wordmarkPaths";
import transform from "./markTransform.json";

interface WordmarkProps { height?: number; tone?: "light" | "dark"; className?: string; fluid?: boolean }

export function Wordmark({ height = 20, tone = "light", className, fluid = false }: WordmarkProps) {
  const [x, y, w, h] = WORDMARK.viewBox.split(" ").map(Number);
  return (
    <svg className={className} height={fluid ? undefined : height} width={fluid ? "100%" : (height * w) / h}
      viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label="temper">
      <path d={WORDMARK.letters} fill={tone === "light" ? "#ffffff" : "#0e0e10"} />
    </svg>
  );
}

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="32" fill="#ff5a1f" />
      <path transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.s})`} d={GLYPH_T.path} fill="#ffffff" />
    </svg>
  );
}

export function Logo({ size = 28, tone = "dark", wordmark = true }: { size?: number; tone?: "light" | "dark"; wordmark?: boolean }) {
  return (
    <span className="logo">
      <Mark size={size} />
      {wordmark && <Wordmark height={Math.round(size * 0.5)} tone={tone} />}
    </span>
  );
}
