// studio/pages/IdentityPage.tsx
// Your organization's identity. The centre of it is your signing key.
// Its public half is how anyone checks that a statement was really
// signed by you. It is shown as a picture and a fingerprint. The
// private half never leaves the key store and is not shown anywhere.

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { OrgInfo } from "../../api/types";
import { CopyButton } from "../../ui/CopyButton";
import { Icon } from "../../ui/Icons";
import { useToast } from "../../ui/Toast";
import { Identicon } from "../parts/Identicon";

const POSTURE = [
  "Passwords are stored as salted scrypt hashes.",
  "Login tokens are stored only as hashes.",
  "Private signing keys live outside the database.",
  "Evidence is stored under its content hash.",
  "The audit log is hash chained.",
  "Data is shared only by explicit, revocable grant.",
];

export function IdentityPage() {
  const toast = useToast();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  useEffect(() => { api<OrgInfo>("/org").then(setOrg).catch((e) => toast.error("Could not load", (e as Error).message)); }, []);
  if (!org) return <div className="skeleton" style={{ height: 320 }} />;

  return (
    <div>
      <div className="stage-head">
        <span className="kicker mono">ORGANIZATION / {org.role.toUpperCase()}</span>
        <h1 className="stage-title">{org.name}</h1>
      </div>
      <div className="id-grid">
        <div className="id-key">
          {org.public_key ? (
            <>
              <Identicon hash={org.public_key} size={180} />
              <div className="id-print">
                {org.key_fingerprint.split(":").map((g, i) => <motion.span key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }} className="mono">{g}</motion.span>)}
              </div>
              <span className="kicker mono">SIGNING KEY FINGERPRINT / ED25519</span>
              <code className="id-code">{org.public_key}</code>
              <div className="row-chips"><CopyButton text={org.public_key} label="Copy public key" /><Link className="link-btn" to="/verify">Verify a pack</Link></div>
            </>
          ) : <p className="muted-light">A key pair is created the first time your organization signs something.</p>}
        </div>
        <div className="id-side">
          <span className="kicker mono">MEMBERS</span>
          {org.members.map((m) => <div key={m.id} className="id-member"><span>{m.email}</span><span className="chip">{org.role}</span></div>)}
          <span className="kicker mono" style={{ marginTop: 28 }}>HOW IT IS PROTECTED</span>
          {POSTURE.map((p) => <p key={p} className="id-line"><Icon name="check" size={14} />{p}</p>)}
        </div>
      </div>
    </div>
  );
}
