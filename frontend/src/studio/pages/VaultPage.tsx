// studio/pages/VaultPage.tsx
// The evidence vault, as a wall of fingerprints. Every source document
// is stored under its SHA256 hash, and each tile is a picture made
// from that hash. Change one byte of the file and its picture would
// change completely. Hover a tile to re-verify the file: we re-read
// the stored bytes, hash them again and compare with the fingerprint
// recorded on day one.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { EvidenceRow } from "../../api/types";
import { bytes, dateTime } from "../../lib/format";
import { CopyButton } from "../../ui/CopyButton";
import { Icon } from "../../ui/Icons";
import { useToast } from "../../ui/Toast";
import { DropVault } from "../parts/DropVault";
import { Identicon } from "../parts/Identicon";

export function VaultPage() {
  const toast = useToast();
  const [rows, setRows] = useState<EvidenceRow[] | null>(null);
  const [results, setResults] = useState<Record<number, boolean | "busy">>({});
  const [selected, setSelected] = useState<EvidenceRow | null>(null);
  const [query, setQuery] = useState("");

  const load = () => api<EvidenceRow[]>("/evidence").then(setRows).catch((e) => toast.error("Could not load the vault", (e as Error).message));
  useEffect(() => { load(); }, []);

  async function verify(id: number) {
    setResults((r) => ({ ...r, [id]: "busy" }));
    try {
      const [out] = await Promise.all([api<{ intact: boolean }>(`/evidence/${id}/verify`, { method: "POST" }), new Promise((d) => setTimeout(d, 700))]);
      setResults((r) => ({ ...r, [id]: out.intact }));
    } catch (e) { toast.error("Verification failed", (e as Error).message); setResults((r) => { const { [id]: _x, ...rest } = r; return rest; }); }
  }
  async function verifyAll() { for (const r of rows ?? []) await verify(r.id); toast.success("Every file re-verified"); }

  const shown = (rows ?? []).filter((r) => r.filename.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div className="stage-head">
        <span className="kicker mono">EVIDENCE VAULT</span>
        <h1 className="stage-title">Proof that does not move.</h1>
        <div className="vault-bar">
          <input className="search-line" placeholder="Search documents" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="pill-btn ghost" onClick={verifyAll} disabled={!rows?.length}><Icon name="shield" size={15} />Verify all</button>
        </div>
      </div>

      <div className="wall">
        <div className="wall-add"><DropVault compact onUploaded={() => load()} /></div>
        {!rows && <div className="skeleton" style={{ height: 160 }} />}
        {shown.map((r, i) => {
          const res = results[r.id];
          return (
            <motion.button key={r.id} className={`wall-tile ${selected?.id === r.id ? "on" : ""} ${res === true ? "ok" : res === false ? "bad" : ""}`} onClick={() => setSelected(r)}
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i, 20) * 0.025 }}>
              <Identicon hash={r.sha256} size={112} />
              <span className="wall-name">{r.filename.replace(/\.[^.]+$/, "")}</span>
              <span className="wall-meta mono">{bytes(r.size_bytes)} · {r.used_by_records} rec</span>
              <AnimatePresence>
                {res === "busy" && <motion.i className="wall-scan" initial={{ top: 0 }} animate={{ top: "100%" }} transition={{ duration: 0.7 }} />}
                {res === true && <motion.span className="wall-badge ok" initial={{ scale: 0 }} animate={{ scale: 1 }}><Icon name="check" size={14} /></motion.span>}
                {res === false && <motion.span className="wall-badge bad" initial={{ scale: 0 }} animate={{ scale: 1 }}><Icon name="x" size={14} /></motion.span>}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div className="wall-detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            <Identicon hash={selected.sha256} size={64} />
            <div className="wd-body"><strong>{selected.filename}</strong>
              <code>{selected.sha256}</code>
              <span className="mono muted-light">{bytes(selected.size_bytes)} · uploaded {dateTime(selected.uploaded_at)} · used by {selected.used_by_records} records</span></div>
            <div className="wd-actions"><CopyButton text={selected.sha256} label="Copy hash" />
              <button className="pill-btn" onClick={() => verify(selected.id)}>Verify</button>
              <button className="sheet-x" onClick={() => setSelected(null)} aria-label="Close"><Icon name="x" size={14} /></button></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
