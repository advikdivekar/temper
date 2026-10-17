// ui/SpotCard.tsx
// A card with a soft glow that follows the mouse.
//
// How: on mouse move we write the pointer position into two CSS
// variables (--mx, --my). The stylesheet paints a radial gradient at
// that spot. No animation library needed, so it is very cheap.

import type { ReactNode } from "react";

export function SpotCard({
  children, className = "", onClick,
}: { children: ReactNode; className?: string; onClick?: () => void }) {
  function track(event: React.MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - box.top}px`);
  }
  return (
    <div className={`card spot ${className}`} onMouseMove={track} onClick={onClick}>
      {children}
    </div>
  );
}
