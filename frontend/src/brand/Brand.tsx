// brand/Brand.tsx
// The Temper brand marks as React components.
//
//   Wordmark  the full "TEMPER" lettering with the folded ribbon M
//   Mark      the compact T glyph used as an app icon and in tight spaces
//   Logo      mark and wordmark together (replaces the old text logo)
//
// Colours: tone "light" is for dark backgrounds (a chrome gradient
// like the original logo). Tone "dark" is for light backgrounds. The
// fold of the M turns ember in the dark tone, the brand accent.

import { useId } from "react";
import { WORDMARK } from "./wordmarkPaths";

interface WordmarkProps { height?: number; tone?: "light" | "dark"; className?: string; fluid?: boolean }

export function Wordmark({ height = 20, tone = "light", className, fluid = false }: WordmarkProps) {
  const id = useId();
  const [x, y, w, h] = WORDMARK.viewBox.split(" ").map(Number);
  const top = tone === "light" ? "#ffffff" : "#1d2733";
  const bottom = tone === "light" ? "#8d929a" : "#0e0e10";
  const fold = tone === "light" ? "#5b6068" : "#ff5a1f";
  return (
    <svg className={className} height={fluid ? undefined : height} width={fluid ? "100%" : (height * w) / h} viewBox={`${x} ${y} ${w} ${h}`}
      role="img" aria-label="Temper">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <path d={WORDMARK.letters} fill={`url(#${id})`} />
      <path d={WORDMARK.mLight} fill={`url(#${id})`} />
      <path d={WORDMARK.mDark} fill={fold} />
    </svg>
  );
}

export function Mark({ size = 28 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#ffb08a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0b0c0e" />
      <path d="M14 16H50V25H36.5V50H27.5V25H14Z" fill={`url(#${id})`} />
      <path d="M14 16H27.5V25H14Z" fill="#ff5a1f" />
    </svg>
  );
}

export function Logo({ size = 28, tone = "dark", wordmark = true }: { size?: number; tone?: "light" | "dark"; wordmark?: boolean }) {
  return (
    <span className="logo">
      <Mark size={size} />
      {wordmark && <Wordmark height={Math.round(size * 0.46)} tone={tone} />}
    </span>
  );
}
