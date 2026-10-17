// landing/hero/FactoryField.tsx
// The hero background: a pixel art steel works skyline, drawn in code.
//
// Three layers give it depth, the way a landscape painting does:
//   far    pale hazy blocks and cooling towers
//   mid    sawtooth roofed halls, silos, a gantry crane
//   near   the dark main mill with striped chimneys and lit windows
// Between layers we lay a band of fog made with ordered dithering
// (comparing against an 8 by 8 Bayer pattern), which turns a smooth
// fade into a stipple of square pixels. That is the printed look.
//
// Smoke is a second picture: plumes that rise from the near chimneys,
// thicker at the base, drifting right, dithered into three tones.
//
// Everything is drawn ONCE into small canvases and stretched with
// crisp pixels. The smoke sways very slowly with CSS. Nothing here
// reacts to the pointer or to scrolling.

import { useEffect, useRef } from "react";

const W = 560;
const H = 230;

const BAYER = (() => {
  let m = [[0, 2], [3, 1]];
  for (let size = 2; size < 8; size *= 2) {
    const next: number[][] = Array.from({ length: size * 2 }, () => new Array(size * 2).fill(0));
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = m[y][x] * 4;
        next[y][x] = v; next[y][x + size] = v + 2;
        next[y + size][x] = v + 3; next[y + size][x + size] = v + 1;
      }
    }
    m = next;
  }
  return m.flat().map((v) => v / 64);
})();

/** A small repeatable random number generator, so the skyline is always the same. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function corner(ix: number, iy: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const top = corner(ix, iy) * (1 - sx) + corner(ix + 1, iy) * sx;
  const bottom = corner(ix, iy + 1) * (1 - sx) + corner(ix + 1, iy + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}
function fbm(x: number, y: number): number {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < 4; i++) { sum += noise(x * freq, y * freq) * amp; amp /= 2; freq *= 2; }
  return sum / 0.9375;
}

const FAR = "#90a4a1";
const MID = "#6c8481";
const NEAR = "#3b5452";
const DEEP = "#2a3f3e";
const STRIPE = "#4d6967";
const FOG: [number, number, number] = [176, 190, 185];
const GLOW = "#ecc98a";

type Draw = CanvasRenderingContext2D;

function rect(c: Draw, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Replace some pixels of what is already drawn with fog, more toward the bottom. */
function fog(c: Draw, y0: number, y1: number, from: number, to: number) {
  const image = c.getImageData(0, 0, W, H);
  const d = image.data;
  for (let y = y0; y < y1; y++) {
    const alpha = from + ((y - y0) / (y1 - y0)) * (to - from);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3] === 0) continue;
      if (BAYER[(y & 7) * 8 + (x & 7)] < alpha) { d[i] = FOG[0]; d[i + 1] = FOG[1]; d[i + 2] = FOG[2]; }
    }
  }
  c.putImageData(image, 0, 0);
}

/** A hyperbolic cooling tower: narrow waist, wide base. */
function coolingTower(c: Draw, cx: number, base: number, h: number, w: number, color: string) {
  for (let r = 0; r < h; r++) {
    const t = r / h;
    const half = (w / 2) * (0.62 + 0.38 * Math.pow(Math.abs(t - 0.62) * 2.2, 1.6) * (t < 0.62 ? 1 : 0.6) + 0.02);
    rect(c, cx - half, base - r, half * 2, 1, color);
  }
}

function farLayer(c: Draw) {
  const rnd = seeded(7);
  let x = -4;
  while (x < W) {
    const w = 14 + Math.floor(rnd() * 26), h = 12 + Math.floor(rnd() * 22);
    rect(c, x, 160 - h, w, h + 70, FAR);
    if (rnd() > 0.55) rect(c, x + w * 0.6, 160 - h - 18, 3, 18, FAR);   // chimney
    if (rnd() > 0.7) for (let k = 0; k < 3; k++) rect(c, x + k * 6, 160 - h - 4 + k % 2, 5, 4, FAR); // roof clutter
    x += w + Math.floor(rnd() * 5);
  }
  coolingTower(c, 96, 172, 62, 46, FAR);
  coolingTower(c, 438, 172, 58, 42, FAR);
}

function midLayer(c: Draw) {
  const base = 196;
  // Sawtooth hall, left.
  rect(c, 14, base - 30, 232, 40, MID);
  for (let k = 0; k < 9; k++) {
    for (let dx = 0; dx < 26; dx++) rect(c, 14 + k * 26 + dx, base - 30 - Math.round((dx / 25) * 13), 1, Math.round((dx / 25) * 13), MID);
  }
  // Silos.
  for (let k = 0; k < 4; k++) {
    const sx = 262 + k * 15;
    rect(c, sx, base - 46, 11, 56, MID);
    for (let r = 0; r < 5; r++) rect(c, sx + r * 0.6, base - 46 - 5 + r, 11 - r * 1.2, 1, MID);
  }
  // Storage tank.
  rect(c, 340, base - 24, 52, 34, MID);
  for (let r = 0; r < 8; r++) rect(c, 340 + r * 0.8, base - 24 - 8 + r, 52 - r * 1.6, 1, MID);
  // Gantry crane.
  rect(c, 410, base - 64, 100, 3, MID);
  rect(c, 414, base - 64, 3, 74, MID);
  rect(c, 504, base - 64, 3, 74, MID);
  rect(c, 456, base - 60, 2, 24, MID);
  rect(c, 452, base - 36, 10, 6, MID);
  // Pipe rack.
  rect(c, 250, base - 12, 160, 2, MID);
  for (let k = 0; k < 9; k++) rect(c, 252 + k * 19, base - 12, 2, 22, MID);
}

function nearLayer(c: Draw) {
  const base = H - 16;
  const rnd = seeded(21);
  // Foreground shed with sawtooth roof, left.
  rect(c, -4, base - 36, 150, 44, NEAR);
  for (let k = 0; k < 6; k++) {
    for (let dx = 0; dx < 25; dx++) rect(c, -4 + k * 25 + dx, base - 36 - Math.round((dx / 24) * 12), 1, Math.round((dx / 24) * 12), NEAR);
  }
  // Main mill hall.
  rect(c, 372, base - 60, 200, 68, NEAR);
  rect(c, 384, base - 72, 96, 14, NEAR);
  rect(c, 500, base - 74, 62, 16, NEAR);
  // Chimneys with stripes.
  for (const [cx, w, top] of [[412, 11, 78], [454, 9, 86], [522, 12, 70]] as const) {
    rect(c, cx - w / 2, top, w, base - top, DEEP);
    for (let y = top + 6; y < base - 60; y += 14) rect(c, cx - w / 2, y, w, 4, STRIPE);
    rect(c, cx - w / 2 - 1, top, w + 2, 3, DEEP);
  }
  // Conveyor bridge.
  for (let k = 0; k < 120; k++) rect(c, 146 + k, base - 36 - Math.round(k * 0.22), 1, 3, NEAR);
  // Lit windows: small warm panes scattered on the hall.
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 22; col++) {
      if (rnd() > 0.42) rect(c, 378 + col * 8.2, base - 54 + row * 12, 4, 3, GLOW);
    }
  }
  for (let col = 0; col < 12; col++) if (rnd() > 0.5) rect(c, 6 + col * 11, base - 22, 4, 3, GLOW);
  // Ground and rails.
  rect(c, 0, base + 6, W, 12, DEEP);
  rect(c, 0, base + 9, W, 1, STRIPE);
}

function drawSmoke(c: Draw) {
  const image = c.createImageData(W, H);
  const d = image.data;
  const base = H - 16;
  const stacks = [{ x: 412, y: 78 }, { x: 454, y: 86 }, { x: 522, y: 70 }];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let density = 0;
      for (const s of stacks) {
        const dy = s.y - y;
        if (dy <= 0 || dy > 110) continue;
        const centre = s.x + dy * 0.38 + Math.sin(dy * 0.08) * 4;
        const width = 6 + dy * 0.46;
        const across = Math.max(0, 1 - Math.abs(x - centre) / width);
        density += across * Math.exp(-dy / 50) * (0.55 + 0.9 * fbm(x * 0.045, y * 0.05));
      }
      if (density <= 0.05) continue;
      const pattern = BAYER[(y & 7) * 8 + (x & 7)];
      const level = density + pattern * 0.3 - 0.15;
      if (level < 0.12) continue;
      const i = (y * W + x) * 4;
      const tone = level > 0.55 ? [241, 230, 196] : level > 0.3 ? [214, 198, 152] : [196, 206, 199];
      d[i] = tone[0]; d[i + 1] = tone[1]; d[i + 2] = tone[2]; d[i + 3] = 255;
    }
  }
  void base;
  c.putImageData(image, 0, 0);
}

export function FactoryField() {
  const scene = useRef<HTMLCanvasElement>(null);
  const smoke = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = scene.current!.getContext("2d", { willReadFrequently: true })!;
    c.imageSmoothingEnabled = false;
    farLayer(c);  fog(c, 120, 175, 0.15, 0.55);
    midLayer(c);  fog(c, 150, 210, 0.1, 0.5);
    nearLayer(c);
    drawSmoke(smoke.current!.getContext("2d")!);
  }, []);

  return (
    <>
      <canvas ref={scene} width={W} height={H} className="factory-canvas" aria-hidden />
      <canvas ref={smoke} width={W} height={H} className="factory-canvas smoke" aria-hidden />
    </>
  );
}
