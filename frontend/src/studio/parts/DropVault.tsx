// studio/parts/DropVault.tsx
// A large drop area for source documents (bills, invoices, logs).
// While a file uploads we draw its fingerprint twice:
//   1. in your browser, instantly (Web Crypto SHA256)
//   2. as the server confirms it stored the same bytes
// A picture made from the fingerprint appears, so the idea of
// "proof the file did not change" is something you can see.

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { api } from "../../api/client";
import { Icon } from "../../ui/Icons";
import { useToast } from "../../ui/Toast";
import { Identicon } from "./Identicon";

export interface VaultFile { id: number; filename: string; sha256: string; size_bytes: number }

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function DropVault({ onUploaded, compact = false }: { onUploaded: (file: VaultFile) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<{ name: string; hash: string } | null>(null);
  const [matched, setMatched] = useState<boolean | null>(null);

  async function handle(file: File) {
    setMatched(null);
    setBusy({ name: file.name, hash: "" });
    try {
      const local = await sha256Hex(file);
      setBusy({ name: file.name, hash: local });
      const form = new FormData();
      form.append("file", file);
      const [saved] = await Promise.all([api<VaultFile>("/evidence", { form }), new Promise((d) => setTimeout(d, 1100))]);
      setMatched(saved.sha256 === local);
      onUploaded(saved);
      toast.success("Added to your vault", file.name);
    } catch (e) { toast.error("Upload failed", (e as Error).message); }
    finally { setBusy(null); }
  }

  return (
    <div>
      <div className={`dropvault ${over ? "over" : ""} ${compact ? "compact" : ""}`} onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); }}
        role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") input.current?.click(); }}>
        <AnimatePresence mode="wait">
          {busy ? (
            <motion.div key="busy" className="dv-busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Identicon hash={busy.hash || "0f1e2d3c4b5a69788796a5b4c3d2e1f0"} size={72} />
              <div><strong>{busy.name}</strong><div className="mono dv-hash">{busy.hash || "computing fingerprint..."}</div></div>
            </motion.div>
          ) : (
            <motion.div key="idle" className="dv-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.span className="dv-icon" animate={over ? { y: -6, scale: 1.12 } : { y: 0, scale: 1 }}><Icon name="upload" size={26} /></motion.span>
              <strong>Drop a bill, an invoice or a log</strong>
              <span>It is fingerprinted and stored. It is never edited.</span>
            </motion.div>
          )}
        </AnimatePresence>
        <input ref={input} type="file" hidden onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
      </div>
      {matched !== null && !busy && <p className={`dv-match ${matched ? "ok" : "bad"}`}>{matched ? "Browser and server fingerprints match" : "Fingerprint mismatch"}</p>}
    </div>
  );
}
