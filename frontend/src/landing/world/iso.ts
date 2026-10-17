// world/iso.ts
// Isometric projection helpers for the supply chain world.
//
// Concept: isometric projection. We describe buildings on a flat grid
// (gx, gy) with a height (gz), and convert every point to a screen
// position. Moving along gx goes down and to the right. Moving along
// gy goes down and to the left. Height goes straight up. Because it
// is just maths, the whole 3D looking scene is plain SVG: light,
// sharp at any size, and readable by assistive tools.

export const UNIT = 38;
export const ORIGIN = { x: 400, y: 70 };

export interface Point { x: number; y: number }

export function project(gx: number, gy: number, gz = 0): Point {
  return {
    x: ORIGIN.x + (gx - gy) * 0.866 * UNIT,
    y: ORIGIN.y + (gx + gy) * 0.5 * UNIT - gz * UNIT,
  };
}

/** Turn a list of projected points into an SVG "points" string. */
export function toPoints(list: Point[]): string {
  return list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/** An SVG path through grid waypoints, on the ground (z = 0). */
export function groundPath(waypoints: [number, number][]): string {
  return waypoints
    .map(([gx, gy], i) => {
      const p = project(gx, gy);
      return `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(" ");
}
