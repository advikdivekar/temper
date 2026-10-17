// pages/VerifyPage.tsx
// A PUBLIC page: anyone can check a Temper verification pack without
// an account. Drop in the JSON file, and the server recomputes the
// content hash and checks every signature against the registered keys.
//
// Teaching feature: "Tamper with it" changes one figure inside the
// pack and re-checks, so you can watch the hash check fail. That is
// the whole point of signing, shown live.

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { PackResult } from "../api/types";
import { Wordmark } from "../brand/Brand";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icons";
import { useToast } from "../ui/Toast";

export function VerifyPage() {
  const toast = useToast();
  const [text, setText] = useState("");
  const [result, setResult] = useState<PackResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(source = text) {
    let pack: unknown;
    try { pack = JSON.parse(source); } catch { toast.error("That is not valid JSON", "Paste the pack file contents."); return; }
    setBusy(true); setResult(null);
    try {
      const [out] = await Promise.all([api<PackResult>("/verify-pack", { body: pack }), new Promise((d) => setTimeout(d, 700))]);
      setResult(out);
    } catch (e) { toast.error("Could not check the pack", (e as Error).message); }
    finally { setBusy(false); }
  }

  async function sample() {
    try { setText(JSON.stringify(await api("/demo/sample-pack"), null, 2)); setResult(null); }
    catch (e) { toast.error("No sample available", (e as Error).message); }
  }

  function tamper() {
    try {
      const pack = JSON.parse(text);
      if (!pack.content) throw new Error("Only a full pack can be tampered with");
      pack.content.total_tco2 = "1.000000";
      const next = JSON.stringify(pack, null, 2);
      setText(next); run(next);
    } catch (e) { toast.error("Load a full sample pack first", (e as Error).message); }
  }

  function onFile(file: File) { file.text().then((t) => { setText(t); setResult(null); }); }

  return (
    <div className="lp verify-page">
      <header className="verify-top"><Link to="/"><Wordmark height={16} tone="light" /></Link>
        <Link to="/" className="text-link">Back to Temper</Link></header>
      <main className="verify-main">
        <div className="verify-copy">
          <span className="mono kicker">INDEPENDENT VERIFICATION</span>
          <h1 className="serif h2">Do not trust us. Check.</h1>
          <p className="muted-light">Drop a Temper verification pack here. We recompute its content hash and check every signature against the keys registered for each organization. No account needed.</p>
          <div className="verify-actions">
            <Button variant="ember" onClick={() => run()} loading={busy} disabledReason={text ? undefined : "Paste or load a pack first."}>Verify pack</Button>
            <button className="text-link" onClick={sample}>Load a sample pack</button>
            <button className="text-link" onClick={tamper}>Tamper with it</button>
          </div>
        </div>
        <div className="verify-work">
          <label className="drop-json" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}>
            <Icon name="upload" size={18} /> Drop a pack file here, or paste its contents below
            <input type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <textarea className="pack-input mono" rows={9} value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder='{ "format": "temper.pack.v1", ... }' spellCheck={false} />
          <AnimatePresence>
            {result && (
              <motion.div className="verify-result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="verdict">
                  <motion.span className={`stamp ${result.valid ? "" : "bad"}`} initial={{ scale: 2, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: -3 }} transition={{ type: "spring", stiffness: 240, damping: 14 }}>
                    {result.valid ? "Valid" : "Invalid"}</motion.span>
                </div>
                {result.checks.map((c, i) => (
                  <motion.div key={c.id} className={`vcheck ${c.ok ? "ok" : "fail"}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.12 }}>
                    <span className="vmark"><Icon name={c.ok ? "check" : "x"} size={14} /></span>
                    <div><strong>{c.label}</strong>{c.detail && <div className="mono muted-light">{c.detail}</div>}</div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
