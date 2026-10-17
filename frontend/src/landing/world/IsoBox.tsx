// world/IsoBox.tsx
// One building block of the scene: a box drawn with three faces
// (top, left, right) so it looks solid. Optional rows of windows are
// drawn on the two side faces.
//
// Lighting trick: the top face is lightest, the left is medium and
// the right is darkest, as if light comes from above left. Three flat
// shades are enough to make a flat SVG read as a 3D object.

import { motion } from "motion/react";
import type { MotionValue } from "motion/react";
import { project, toPoints } from "./iso";

export interface Tone { top: string; left: string; right: string }

interface Props {
  gx: number; gy: number;   // ground position
  w: number; d: number;     // size along gx and gy
  h: number;                // height
  z?: number;               // lift off the ground
  tone: Tone;
  glow?: MotionValue<string>;   // colour of the windows
  columns?: number;
  rows?: number;
}

export function IsoBox({
  gx, gy, w, d, h, z = 0, tone, glow, columns = 0, rows = 0,
}: Props) {
  const top = toPoints([
    project(gx, gy, z + h), project(gx + w, gy, z + h),
    project(gx + w, gy + d, z + h), project(gx, gy + d, z + h),
  ]);
  const left = toPoints([
    project(gx, gy + d, z), project(gx + w, gy + d, z),
    project(gx + w, gy + d, z + h), project(gx, gy + d, z + h),
  ]);
  const right = toPoints([
    project(gx + w, gy, z), project(gx + w, gy + d, z),
    project(gx + w, gy + d, z + h), project(gx + w, gy, z + h),
  ]);

  // Windows: a small quadrilateral for each column and row on a face.
  function windowsOn(face: "left" | "right") {
    const items: string[] = [];
    for (let c = 0; c < columns; c++) {
      for (let r = 0; r < rows; r++) {
        const u0 = (c + 0.22) / columns, u1 = (c + 0.78) / columns;
        const v0 = z + h * ((r + 0.25) / rows), v1 = z + h * ((r + 0.7) / rows);
        const at = (u: number, v: number) =>
          face === "left"
            ? project(gx + w * u, gy + d, v)
            : project(gx + w, gy + d * (1 - u), v);
        items.push(toPoints([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]));
      }
    }
    return items;
  }

  return (
    <g>
      <polygon points={left} fill={tone.left} />
      <polygon points={right} fill={tone.right} />
      <polygon points={top} fill={tone.top} />
      {glow && columns > 0 && [...windowsOn("left"), ...windowsOn("right")].map((points, i) => (
        <motion.polygon key={i} points={points} style={{ fill: glow }} opacity={0.9} />
      ))}
    </g>
  );
}
