// pages/EvidencePage.tsx
// The evidence vault: every source document, its fingerprint, and
// where it is used. "Verify" re-reads the stored file, hashes it
// again, and compares with the fingerprint recorded on day one. If a
// single byte changed, it fails. This is what an auditor relies on.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { EvidenceRow } from "../api/types";
import { EvidenceDropzone } from "../features/plant/EvidenceDropzone";
import type { EvidenceFile } from "../features/plant/EvidenceDropzone";
import { bytes, dateTime, shortHash } from "../lib/format";
import { Button } from "../ui/Button";
import { CopyButton } from "../ui/CopyButton";
import { Icon } from "../ui/Icons";
import { PageHead } from "../ui/PageHead";
import { Pill } from "../ui/Pill";
import { useToast } from "../ui/Toast";

export function EvidencePage() {
  const toast = useToast();
  const [rows, setRows] = useState<EvidenceRow[] | null>(null);
  const [results, setResults] = useState<Record<number, boolean | "busy">>({});
  const [query, setQuery] = useState("");

  const load = () => api<EvidenceRow[]>("/evidence").then(setRows).catch((e) => toast.error("Could not load evidence", (e as Error).message));
  useEffect(() => { load(); }, []);

  async function verify(id: number) {
    setResults((r) => ({ ...r, [id]: "busy" }));
    try {
      const [out] = await Promise.all([
        api<{ intact: boolean }>(`/evidence/${id}/verify`, { method: "POST" }),
        new Promise((done) => setTimeout(done, 600)),
      ]);
      setResults((r) => ({ ...r, [id]: out.intact }));
    } catch (e) {
      toast.error("Verification failed", (e as Error).message);
      setResults((r) => { const { [id]: _drop, ...rest } = r; return rest; });
    }
  }

  async function verifyAll() {
    for (const r of rows ?? []) await verify(r.id);
    toast.success("All evidence re-verified");
  }

  const shown = (rows ?? []).filter((r) => r.filename.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="stack">
      <PageHead eyebrow="Evidence vault" title="Proof that does not move."
        description="Files are stored under their SHA256 fingerprint. Verify re-hashes the stored copy to prove nothing changed."
        actions={<Button variant="ghost" onClick={verifyAll} disabledReason={rows?.length ? undefined : "No evidence yet."}><Icon name="shield" size={16} />Verify all</Button>} />

      <div className="card"><EvidenceDropzone files={[]} activeId={null} onPick={() => undefined}
        onUploaded={(f: EvidenceFile) => { toast.success("Added to the vault", f.filename); load(); }} /></div>

      <div className="card">
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <h3>{rows?.length ?? 0} files</h3>
          <input className="input" style={{ maxWidth: 260 }} placeholder="Search files" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {!rows ? <div className="skeleton" style={{ height: 200 }} /> : (
          <table className="table">
            <thead><tr><th>File</th><th>Fingerprint</th><th>Size</th><th>Uploaded</th><th className="num">Used by</th><th>Integrity</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.filename}</strong></td>
                  <td className="mono">{shortHash(r.sha256, 14)} <CopyButton text={r.sha256} label="" /></td>
                  <td className="mono">{bytes(r.size_bytes)}</td>
                  <td className="mono">{dateTime(r.uploaded_at)}</td>
                  <td className="num">{r.used_by_records} records</td>
                  <td>
                    <AnimatePresence mode="wait">
                      {results[r.id] === undefined && <motion.span key="b" exit={{ opacity: 0 }}><Button variant="ghost" size="small" onClick={() => verify(r.id)}>Verify</Button></motion.span>}
                      {results[r.id] === "busy" && <motion.span key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Pill>Re-hashing...</Pill></motion.span>}
                      {results[r.id] === true && <motion.span key="ok" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><Pill tone="good" dot>Intact</Pill></motion.span>}
                      {results[r.id] === false && <motion.span key="bad" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><Pill tone="bad" dot>Tampered</Pill></motion.span>}
                    </AnimatePresence>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
