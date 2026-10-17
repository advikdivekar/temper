// pages/SettingsPage.tsx
// Your organization: identity, signing key and members. The signing
// key matters most. Its public half is what anyone uses to check that
// a statement was really signed by you. The private half never leaves
// the key store and is not shown anywhere.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { OrgInfo } from "../api/types";
import { CopyButton } from "../ui/CopyButton";
import { Icon } from "../ui/Icons";
import { PageHead } from "../ui/PageHead";
import { Pill } from "../ui/Pill";
import { useToast } from "../ui/Toast";

const POSTURE = [
  ["Passwords", "Salted scrypt hashes. Plain passwords are never stored."],
  ["Login tokens", "Only a SHA256 hash of each token is stored."],
  ["Signing keys", "Ed25519 private keys live in a separate key store, never in the database."],
  ["Evidence", "Stored under content hash. Re-verifiable at any time."],
  ["Audit log", "Hash chained. Editing any entry breaks every later hash."],
  ["Data sharing", "Only by explicit, revocable grant. Recipients see results, not raw data."],
];

export function SettingsPage() {
  const toast = useToast();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  useEffect(() => { api<OrgInfo>("/org").then(setOrg).catch((e) => toast.error("Could not load", (e as Error).message)); }, []);
  if (!org) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div className="stack">
      <PageHead eyebrow="Organization" title={org.name} description="Identity, signing key and members." />
      <div className="grid-2">
        <div className="card stack">
          <div className="toolbar"><h3>Signing key</h3><Pill tone={org.public_key ? "good" : "neutral"} dot>{org.public_key ? "Active" : "Created on first signature"}</Pill></div>
          {org.public_key ? (
            <>
              <span className="eyebrow">Fingerprint</span>
              <div className="hashbox mono">{org.key_fingerprint}</div>
              <span className="eyebrow">Public key (Ed25519)</span>
              <div className="hashbox mono">{org.public_key}</div>
              <div className="row"><CopyButton text={org.public_key} label="Copy public key" />
                <Link className="btn quiet small" to="/verify"><Icon name="shield" size={14} />Verify a pack</Link></div>
            </>
          ) : <p className="muted">A key pair is generated the first time your organization signs something.</p>}
        </div>
        <div className="card stack">
          <h3>Members</h3>
          {org.members.map((m) => <div key={m.id} className="lot"><span>{m.email}</span><Pill>{org.role}</Pill></div>)}
        </div>
      </div>
      <div className="card stack">
        <h3>Security posture</h3>
        <div className="grid-3">
          {POSTURE.map(([title, text]) => <div key={title}><span className="eyebrow">{title}</span><p>{text}</p></div>)}
        </div>
      </div>
    </div>
  );
}
