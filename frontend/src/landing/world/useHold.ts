// world/useHold.ts
// A "press and hold" gesture with real progress.
//
// How it works:
//   * progress is a number from 0 to 1 held in a motion value, so
//     updating it every frame does not re-render React.
//   * While the pointer or key is held, progress rises. Let go early
//     and it drains back down, so a hold must be deliberate.
//   * At 1 we call onComplete once.
//
// Accessibility: the same start/stop functions are wired to the
// Space and Enter keys by the caller, and a separate button offers an
// instant alternative for people who cannot hold.

import { useMotionValue } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

interface Options {
  holdMs: number;
  drainMs: number;
  onComplete: () => void;
}

export function useHold({ holdMs, drainMs, onComplete }: Options) {
  const progress = useMotionValue(0);
  const frame = useRef(0);
  const holding = useRef(false);
  const finished = useRef(false);
  const lastTime = useRef(0);
  const complete = useRef(onComplete);
  complete.current = onComplete;

  const tick = useCallback((now: number) => {
    const elapsed = now - lastTime.current;
    lastTime.current = now;
    const current = progress.get();
    const next = holding.current
      ? Math.min(1, current + elapsed / holdMs)
      : Math.max(0, current - elapsed / drainMs);
    progress.set(next);

    if (next >= 1 && !finished.current) {
      finished.current = true;
      complete.current();
    }
    const keepGoing = holding.current ? next < 1 : next > 0 && !finished.current;
    frame.current = keepGoing ? requestAnimationFrame(tick) : 0;
  }, [holdMs, drainMs, progress]);

  const begin = useCallback(() => {
    if (finished.current) return;
    holding.current = true;
    lastTime.current = performance.now();
    if (!frame.current) frame.current = requestAnimationFrame(tick);
  }, [tick]);

  const end = useCallback(() => {
    holding.current = false;
    lastTime.current = performance.now();
    if (!finished.current && progress.get() > 0 && !frame.current) {
      frame.current = requestAnimationFrame(tick);
    }
  }, [tick, progress]);

  const finishNow = useCallback(() => {
    holding.current = false;
    if (!finished.current) {
      finished.current = true;
      complete.current();
    }
    progress.set(1);
  }, [progress]);

  const reset = useCallback(() => {
    finished.current = false;
    holding.current = false;
    progress.set(0);
  }, [progress]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return { progress, begin, end, finishNow, reset };
}
