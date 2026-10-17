// studio/parts/useWorldState.ts
// Turns plain numbers into the animated values the isometric world
// needs. Give it targets (0 to 1 for how lit a building is, and the
// numbers shown on labels) and it glides the picture toward them
// whenever they change. The same ChainWorld that powers the landing
// walkthrough is reused here to show a real organization's chain.

import { animate, useMotionValue } from "motion/react";
import { useEffect } from "react";
import type { WorldState } from "../../landing/world/ChainWorld";

export type WorldTargets = {
  [K in keyof WorldState]: number;
};

export function useWorldState(targets: WorldTargets): WorldState {
  const state: WorldState = {
    mill: useMotionValue(0), verifier: useMotionValue(0), bolts: useMotionValue(0), importer: useMotionValue(0),
    roadA: useMotionValue(0), roadB: useMotionValue(0), millNumber: useMotionValue(targets.millNumber),
    boltsNumber: useMotionValue(targets.boltsNumber), saving: useMotionValue(0),
  };
  const key = JSON.stringify(targets);
  useEffect(() => {
    const moves = (Object.keys(targets) as (keyof WorldState)[]).map((k) =>
      animate(state[k], targets[k], { duration: 1.4, ease: [0.22, 1, 0.36, 1] }));
    return () => moves.forEach((m) => m.stop());
  }, [key]);
  return state;
}
