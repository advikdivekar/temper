// landing/parts/SceneIndex.tsx
// A tiny fixed counter on the right edge ("03 / 07") that tells you
// which scene you are in, like chapters of a story. It watches every
// element marked with data-scene using an IntersectionObserver.

import { useEffect, useState } from "react";

export function SceneIndex({ total }: { total: number }) {
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    const scenes = [...document.querySelectorAll<HTMLElement>("[data-scene]")];
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(Number((entry.target as HTMLElement).dataset.scene));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    scenes.forEach((s) => watcher.observe(s));
    return () => watcher.disconnect();
  }, []);

  return (
    <div className="scene-index mono" aria-hidden>
      <span>{String(current).padStart(2, "0")}</span>
      <i style={{ height: `${(current / total) * 100}%` }} />
      <span>{String(total).padStart(2, "0")}</span>
    </div>
  );
}
