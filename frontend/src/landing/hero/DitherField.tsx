// landing/hero/DitherField.tsx
// The full screen animated background of the hero: a field of heat
// that shimmers upward like air over hot metal, drawn as a coarse
// grid of pixels. It reacts to the pointer, so moving the mouse warms
// the metal under it.
//
// How it works:
//   * We render to a SMALL canvas (220 by 124 pixels) and let CSS
//     stretch it to fill the screen with crisp square pixels. Small
//     canvas means very little work per frame.
//   * For every pixel we compute a "heat" value from a few overlapping
//     sine waves, a glow rising from the bottom, and a bump under the
//     pointer.
//   * Dithering: instead of smooth shades we compare the heat with a
//     repeating 8 by 8 pattern (a Bayer matrix). Pixels above the
//     pattern turn on. This gives the stippled, printed look.
//   * It pauses when scrolled out of view, runs at about 30 frames per
//     second, and draws one still frame for reduced motion users.

import { useEffect, useRef } from "react";

const W = 220;
const H = 124;

// An 8 by 8 Bayer matrix, scaled to 0..1. Built once.
const BAYER = (() => {
  let m = [[0, 2], [3, 1]];
  for (let size = 2; size < 8; size *= 2) {
    const next: number[][] = Array.from({ length: size * 2 }, () => new Array(size * 2).fill(0));
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = m[y][x] * 4;
        next[y][x] = v;
        next[y][x + size] = v + 2;
        next[y + size][x] = v + 3;
        next[y + size][x + size] = v + 1;
      }
    }
    m = next;
  }
  return m.flat().map((v) => v / 64);
})();

export function DitherField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(W, H);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0.62, y: 0.55, tx: 0.62, ty: 0.55 };
    let visible = true;
    let raf = 0;
    let last = 0;

    function draw(time: number) {
      const data = image.data;
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      for (let y = 0; y < H; y++) {
        const ny = y / H;
        for (let x = 0; x < W; x++) {
          const nx = x / W;
          let v = Math.sin(nx * 9 + time * 0.4 + Math.sin(ny * 6 + time * 0.3) * 1.5);
          v += Math.sin(ny * 11 - time * 0.5 + nx * 3);
          v += Math.sin((nx + ny) * 7 + time * 0.25);
          v = v / 6 + 0.5;
          const heat = Math.max(0, 1 - Math.hypot((nx - 0.55) * 0.85, (1 - ny) * 1.0));
          const near = Math.hypot((nx - pointer.x) * 1.78, ny - pointer.y);
          const bump = Math.max(0, 1 - near * 3.4);
          const value = v * 0.3 + heat * 0.98 + bump * bump * 0.9;
          const on = value > 0.3 + BAYER[(y & 7) * 8 + (x & 7)] * 0.55;
          const i = (y * W + x) * 4;
          if (on) {
            const warm = Math.min(1, value);
            data[i] = 255;
            data[i + 1] = 70 + warm * 70;
            data[i + 2] = 20 + warm * 30;
            data[i + 3] = 70 + warm * 185;
          } else {
            data[i + 3] = 0;
          }
        }
      }
      ctx.putImageData(image, 0, 0);
    }

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < 33) return;
      last = now;
      draw(now / 1000);
    }

    if (reduce) {
      draw(2);
    } else {
      raf = requestAnimationFrame(loop);
    }

    const move = (e: PointerEvent) => {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = Math.min(1, e.clientY / window.innerHeight);
    };
    window.addEventListener("pointermove", move);
    const watcher = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    watcher.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      watcher.disconnect();
    };
  }, []);

  return <canvas ref={ref} width={W} height={H} className="dither" aria-hidden />;
}
