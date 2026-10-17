// studio/parts/DropVault.tsx
// A plain drop area for source documents. The file is fingerprinted
// (SHA256) in your browser and again by the server; when both match,
// we say so. That is the proof the file arrived unchanged.

import { useRef, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/Toast";
import { Identicon } from "./Identicon";

export interface VaultFile { id: number; filename: string; sha256: string; size_bytes: number }

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function DropVault({ onUploaded }: { onUploaded: (file: VaultFile) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ name: string; hash: string; match: boolean } | null>(null);

  async function handle(file: File) {
    setBusy(true);
    try {
      const local = await sha256Hex(file);
      const form = new FormData();
      form.append("file", file);
      const saved = await api<VaultFile>("/evidence", { form });
      setLast({ name: file.name, hash: local, match: saved.sha256 === local });
      onUploaded(saved);
    } catch (e) { toast.error("Upload failed", (e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className={`drop ${over ? "over" : ""}`} role="button" tabIndex={0} onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") input.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); }}>
        <strong>{busy ? "Fingerprinting..." : "Drop a bill, invoice or log here"}</strong>
        <small>or click to choose a file. It is stored by its fingerprint and never edited.</small>
        <input ref={input} type="file" hidden onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
      </div>
      {last && (
        <div className="fp"><Identicon hash={last.hash} size={36} />
          <div><strong>{last.name}</strong> <span className={last.match ? "soft" : ""}>{last.match ? "fingerprints match" : "fingerprint mismatch"}</span>
            <div className="mono">{last.hash}</div></div></div>
      )}
    </div>
  );
}
