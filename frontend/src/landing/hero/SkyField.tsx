// landing/hero/SkyField.tsx
// The hero background: a calm sky of pixel art clouds.
//
// How it is made (no image files needed):
//   * We build the clouds from fractal noise: several layers of smooth
//     random bumps at different sizes, added together. That gives the
//     soft, uneven shapes of real clouds.
//   * Clouds sit low in the picture and thin out toward the top.
//   * Ordered dithering (an 8 by 8 Bayer pattern) breaks every edge and
//     shade into a stipple of square pixels, the printed look.
//   * We draw ONE frame into a small canvas, then let CSS stretch it
//     with crisp pixels and drift it very slowly sideways. There is no
//     per frame drawing, and it does not react to the pointer.

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

/** A repeatable pseudo random number for a grid corner. */
function corner(ix: number, iy: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/** Smooth value noise: blend the four surrounding corners. */
function noise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const top = corner(ix, iy) * (1 - sx) + corner(ix + 1, iy) * sx;
  const bottom = corner(ix, iy + 1) * (1 - sx) + corner(ix + 1, iy + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}

/** Fractal noise: four layers of noise, each half as strong and twice as fine. */
function fbm(x: number, y: number): number {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < 4; i++) { sum += noise(x * freq, y * freq) * amp; amp /= 2; freq *= 2; }
  return sum / 0.9375;
}

const CREAM = [241, 230, 196];
const TAN = [214, 198, 152];
const HAZE = [150, 168, 163];

export function SkyField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    const image = ctx.createImageData(W, H);
    const data = image.data;
    for (let y = 0; y < H; y++) {
      const ny = y / H;
      for (let x = 0; x < W; x++) {
        const nx = x / W;
        const base = fbm(nx * 5.2 + 3.1, ny * 4.4 + 1.7);
        const lit = fbm(nx * 5.2 + 3.1 - 0.02, ny * 4.4 + 1.7 - 0.035);
        const mass = base + (ny - 0.55) * 1.55;
        const density = Math.max(0, Math.min(1, (mass - 0.62) / 0.4));
        const pattern = BAYER[(y & 7) * 8 + (x & 7)];
        const i = (y * W + x) * 4;
        if (density + pattern * 0.34 - 0.17 < 0.1) { data[i + 3] = 0; continue; }
        const light = (base - lit) * 22 + 0.5 + (pattern - 0.5) * 0.4;
        const tone = density > 0.55 && light > 0.5 ? CREAM : density > 0.28 ? TAN : HAZE;
        data[i] = tone[0]; data[i + 1] = tone[1]; data[i + 2] = tone[2];
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, []);

  return <canvas ref={ref} width={W} height={H} className="sky-clouds" aria-hidden />;
}
