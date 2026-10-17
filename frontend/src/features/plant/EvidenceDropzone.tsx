// features/plant/EvidenceDropzone.tsx
// Drop a bill or invoice. We fingerprint it twice:
//   1. in your browser, instantly (Web Crypto SHA256)
//   2. on the server, which stores it under the same fingerprint
// When both match, the file is proven to have arrived unchanged.
// Showing this makes the idea of "evidence integrity" visible.

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { api } from "../../api/client";
import { Icon } from "../../ui/Icons";
import { Pill } from "../../ui/Pill";
import { useToast } from "../../ui/Toast";

export interface EvidenceFile {
  id: number;
  filename: string;
  sha256: string;
  size_bytes: number;
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Props {
  files: EvidenceFile[];
  activeId: number | null;
  onUploaded: (file: EvidenceFile) => void;
  onPick: (id: number) => void;
}

export function EvidenceDropzone({ files, activeId, onUploaded, onPick }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<{ name: string; hash: string } | null>(null);
  const [matched, setMatched] = useState<boolean | null>(null);
  const toast = useToast();

  async function handle(file: File) {
    setMatched(null);
    setBusy({ name: file.name, hash: "" });
    try {
      const localHash = await sha256Hex(file);
      setBusy({ name: file.name, hash: localHash });
      const form = new FormData();
      form.append("file", file);
      const [saved] = await Promise.all([
        api<EvidenceFile>("/evidence", { form }),
        new Promise((done) => setTimeout(done, 900)),
      ]);
      setMatched(saved.sha256 === localHash);
      onUploaded(saved);
      toast.success("Evidence stored", `${file.name} is now fingerprinted.`);
    } catch (problem) {
      toast.error("Upload failed", (problem as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <div className={`dropzone ${over ? "over" : ""}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setOver(false);
          if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]);
        }}>
        <motion.span className="up" animate={over ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }}>
          <Icon name="upload" size={24} />
        </motion.span>
        <strong>Drop a bill, invoice or log here</strong>
        <span className="muted">or click to choose a file. It is hashed, never edited.</span>
        <input ref={input} type="file" hidden
          onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
      </div>

      <AnimatePresence>
        {busy && (
          <motion.div className="file-chip" initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Icon name="file" size={22} />
            <div>
              <strong>{busy.name}</strong>
              <div className="mono hash">{busy.hash || "computing fingerprint..."}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {matched !== null && !busy && (
        <Pill tone={matched ? "good" : "bad"} dot>
          {matched ? "Browser and server fingerprints match" : "Fingerprint mismatch"}
        </Pill>
      )}

      {files.length > 0 && (
        <div>
          <span className="eyebrow">Choose the evidence for the next record</span>
          <div className="evidence-list" style={{ marginTop: 8 }}>
            {files.map((f) => (
              <button key={f.id} className={`ev-btn ${activeId === f.id ? "on" : ""}`}
                onClick={() => onPick(f.id)}>
                #{f.id} {f.filename} <span className="mono muted">{f.sha256.slice(0, 8)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
