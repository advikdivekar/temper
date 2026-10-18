// studio/parts/ReaderPanel.tsx
// Lets the AI reader fill in a record from an uploaded document. The
// reader only SUGGESTS: you see the page, the numbers it used and how
// sure it is, you can change anything, and nothing is stored until you
// confirm. If the reader says "check this", you must tick that you did.

import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { DocumentReading } from "../../api/types";
import { useToast } from "../../ui/Toast";
import type { VaultFile } from "./DropVault";

const TYPES = [
  { key: "electricity_bill", label: "Electricity bill" },
  { key: "fuel_invoice", label: "Fuel invoice" },
  { key: "production_log", label: "Production log" },
];
const SAMPLES = [
  { key: "electricity_bill", label: "Sample bill", file: "sample_bill.txt", text: "METER READING SHEET\nPeriod: June 2026\nPrevious reading: 2,58,540\nCurrent reading: 5,28,063\nMultiplier: 1 (readings in kWh)\n" },
  { key: "fuel_invoice", label: "Sample coal invoice", file: "sample_coal.txt", text: "TAX INVOICE\nSeller: Bharat Coal Traders\nItem: Thermal coal (non-coking)\nQuantity: 640 MT 250 KG\nRate: Rs 6,800 per MT\n" },
  { key: "production_log", label: "Sample production log", file: "sample_log.txt", text: "MONTH SUMMARY (bolts)\nWk1: 47 t; Wk2: 26 t; Wk3: 30 t; Wk4: 25 t;\nAdd the weeks for the month.\n" },
];
const UNITS = ["tonne", "gj", "kwh", "mwh", "kg", "kl"];
const NUMBER = /[0-9०-९][0-9०-९,]*(?:\.[0-9]+)?/g;

interface Props {
  fileId: number | null;
  plant: number | null;
  period: { from: string; to: string };
  onUploaded: (file: VaultFile) => void;
  onConfirmed: () => void;
}

// The page text with the numbers the reader used marked, so a person
// can see at a glance where each number came from.
function Page({ text, hows }: { text: string; hows: string[] }) {
  const used = new Set(hows.flatMap((h) => h.match(NUMBER) ?? []));
  const parts = text.split(/([0-9०-९][0-9०-९,]*(?:\.[0-9]+)?)/);
  return <pre className="page">{parts.map((p, i) => (used.has(p) ? <mark key={i}>{p}</mark> : p))}</pre>;
}

export function ReaderPanel({ fileId, plant, period, onUploaded, onConfirmed }: Props) {
  const toast = useToast();
  const [online, setOnline] = useState<boolean | null>(null);
  const [type, setType] = useState(TYPES[0].key);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState<DocumentReading | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("");
  const [checked, setChecked] = useState(false);

  useEffect(() => { api<{ available: boolean }>("/reader/status").then((s) => setOnline(s.available)).catch(() => setOnline(false)); }, []);

  async function read() {
    if (!fileId) return;
    setBusy(true); setReading(null); setChecked(false);
    try {
      const r = await api<DocumentReading>(`/evidence/${fileId}/read`, { body: { doc_type: type } });
      setReading(r);
      setName(String(r.suggested?.name ?? "")); setAmount(String(r.suggested?.amount ?? "")); setUnit(r.suggested?.unit ?? "");
    } catch (e) { toast.error("Could not read it", (e as Error).message); }
    finally { setBusy(false); }
  }

  async function sample(s: (typeof SAMPLES)[number]) {
    const form = new FormData();
    form.append("file", new File([s.text], s.file, { type: "text/plain" }));
    try { onUploaded(await api<VaultFile>("/evidence", { form })); setType(s.key); setReading(null); }
    catch (e) { toast.error("Could not add the sample", (e as Error).message); }
  }

  async function confirm() {
    if (!reading || !plant || !reading.suggested) return;
    try {
      await api(`/reads/${reading.id}/confirm`, { body: { installation_id: plant, kind: reading.suggested.kind, name, amount, unit, valid_from: period.from, valid_to: period.to, cn_code: reading.suggested.cn_code } });
      toast.success("Added to your records", `${name.replace("_", " ")} ${amount} ${unit}`);
      setReading(null); onConfirmed();
    } catch (e) { toast.error("Could not confirm", (e as Error).message); }
  }

  async function discard() {
    if (reading) await api(`/reads/${reading.id}/reject`, { method: "POST" }).catch(() => undefined);
    setReading(null);
  }

  const weak = reading?.fields.filter((f) => f.confidence < 0.85).map((f) => f.name) ?? [];
  const blocked = !reading?.suggested || !(Number(amount) > 0) || (reading.needs_review && !checked);

  return (
    <div className="reader">
      <div className="kicker">Let the reader fill it in</div>
      <div className="chips">{TYPES.map((t) => <button key={t.key} className={`chip ${type === t.key ? "on" : ""}`} onClick={() => setType(t.key)}>{t.label}</button>)}</div>
      <div className="row">
        <button className="btn-solid" disabled={!fileId || busy || online === false} onClick={read}>{busy ? "Reading..." : "Read this document"}</button>
        {SAMPLES.map((s) => <button key={s.key} className="btn-line" onClick={() => sample(s)}>{s.label}</button>)}
      </div>
      {online === false && <p className="soft">The reader is not running, so type the numbers below. To start it: ml/.venv/bin/python -m ml.serving.extract_service ml/models/run8_q4</p>}

      {reading && (
        <div className="review">
          <Page text={reading.text} hows={reading.fields.map((f) => f.how)} />
          <div className="verdict">
            {reading.fields.map((f) => (
              <div key={f.name} className="vrow">
                <span><i className={`dot ${f.confidence >= 0.85 ? "good" : "warn"}`} />{f.name.replace("_", " ")}</span>
                <span className="mono">{String(f.value)}</span>
                {f.how && <small className="soft">from {f.how}</small>}
              </div>
            ))}
            {reading.missing.length > 0 && <p className="soft">Could not find: {reading.missing.join(", ")}</p>}
            {reading.needs_review
              ? <p className="warn-note">Please check {weak.length ? weak.join(", ") : "this"} against the document. The reader was not sure.</p>
              : <p className="soft">The reader is confident, but you confirm it.</p>}
            {reading.suggested && (
              <div className="row">
                <label className="field">Amount<input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
                <label className="field" style={{ maxWidth: 120 }}>Unit<select className="select" value={unit} onChange={(e) => setUnit(e.target.value)}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
              </div>
            )}
            {unit === "kl" && <p className="warn-note">Diesel in kilolitres cannot be used yet. Convert it to GJ and change the unit.</p>}
            {reading.needs_review && <label className="check"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> I checked this against the document</label>}
            <div className="row">
              <button className="btn-solid ember" disabled={blocked || unit === "kl"} onClick={confirm}>Confirm and add</button>
              <button className="btn-line" onClick={discard}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
