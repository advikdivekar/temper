// ui/Icons.tsx
// A small set of line icons, drawn as inline SVG so they can take any
// colour (they use "currentColor") and never need a network request.

import type { ReactElement } from "react";

const paths: Record<string, ReactElement> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  factory: <path d="M3 20V9l6 4V9l6 4V5h3v15H3zM7 20v-3m4 3v-3m4 3v-3" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM8.5 12l2.5 2.5L15.5 10" />,
  link: <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1" />,
  upload: <path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16" />,
  file: <path d="M7 3h7l5 5v13H7V3zM14 3v5h5" />,
  flame: <path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" />,
  lock: <path d="M6 11h12v9H6v-9zM8.5 11V8a3.5 3.5 0 017 0v3" />,
  bolt: <path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" />,
  eye: <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  ship: <path d="M3 17l2 3h14l2-3-9-3-9 3zM12 14V4l5 5h-5" />,
  refresh: <path d="M20 11a8 8 0 10-2 6M20 5v6h-6" />,
};

export function Icon({
  name, size = 18, stroke = 1.8,
}: { name: keyof typeof paths | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#FF5A1F" />
        <path d="M9 22V10h14M16 10v12" stroke="white" strokeWidth="3"
          fill="none" strokeLinecap="round" />
      </svg>
      <span>Temper</span>
    </span>
  );
}
