// ui/CopyButton.tsx
// Copies text to the clipboard and briefly confirms with a tick.

import { useState } from "react";
import { Icon } from "./Icons";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      setDone(false);
    }
  }
  return (
    <button className="btn quiet small" onClick={copy} aria-label={label}>
      <Icon name={done ? "check" : "file"} size={14} />{done ? "Copied" : label}
    </button>
  );
}
