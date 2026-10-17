// landing/parts/Cta.tsx
// The rectangular call to action from the editorial design: a label
// cell and a separate arrow cell. On hover the arrow cell fills and
// the arrow slides, a small precise movement instead of a big effect.

import { Icon } from "../../ui/Icons";

interface Props {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "light" | "ember";
  disabled?: boolean;
}

export function Cta({ children, onClick, tone = "light", disabled }: Props) {
  return (
    <button className={`cta ${tone}`} onClick={onClick} disabled={disabled}>
      <span className="cta-label">{children}</span>
      <span className="cta-arrow"><Icon name="arrow" size={16} /></span>
    </button>
  );
}
