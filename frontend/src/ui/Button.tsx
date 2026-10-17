// ui/Button.tsx
// The one button used everywhere.
//
// Motion ideas used here:
//   whileHover / whileTap  a tiny lift and press, so it feels physical
//   loading                shows a spinner and blocks double clicks
//   disabledReason         if given, the button is disabled AND the
//                          reason is shown under it, so nobody is left
//                          wondering why a button does nothing

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  onClick?: () => void | Promise<void>;
  variant?: "primary" | "ember" | "ghost" | "quiet";
  size?: "small" | "normal" | "big";
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  type?: "button" | "submit";
}

export function Button({
  children, onClick, variant = "primary", size = "normal",
  loading = false, disabled = false, disabledReason, type = "button",
}: Props) {
  const blocked = disabled || loading || Boolean(disabledReason);
  const sizeClass = size === "normal" ? "" : size;
  return (
    <span className="btn-wrap">
      <motion.button
        type={type}
        className={`btn ${variant} ${sizeClass}`}
        disabled={blocked}
        onClick={onClick}
        whileHover={blocked ? undefined : { y: -2 }}
        whileTap={blocked ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
      >
        {loading && <span className="spinner" />}
        {children}
      </motion.button>
      {disabledReason && <small className="reason">{disabledReason}</small>}
    </span>
  );
}
