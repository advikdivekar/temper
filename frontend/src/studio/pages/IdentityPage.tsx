// studio/pages/IdentityPage.tsx
// Your organization and its signing key. The public half of the key is
// how anyone checks that a statement was really signed by you. The
// private half stays in the key store and is never shown.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { OrgInfo } from "../../api/types";
import { CopyButton } from "../../ui/CopyButton";
import { useToast } from "../../ui/Toast";
import { Identicon } from "../parts/Identicon";

const POSTURE = ["Passwords are stored as salted scrypt hashes.", "Login tokens are stored only as hashes.", "Private signing keys live outside the database.",
  "Evidence is stored under its content hash.", "The audit log is hash chained.", "Data is shared only by explicit, revocable grant."];

export function IdentityPage() {
  const toast = useToast();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  useEffect(() => { api<OrgInfo>("/org").then(setOrg).catch((e) => toast.error("Could not load", (e as Error).message)); }, []);
  if (!org) return <div className="skeleton" style={{ height: 300 }} />;
  return (
    <div>
      <div className="head"><span className="kicker">Organization / {org.role}</span><h1 className="title">{org.name}</h1></div>
      <div className="org">
        <div>
          <span className="kicker">Signing key</span>
          {org.public_key ? (
            <>
              <div style={{ marginTop: 14 }}><Identicon hash={org.public_key} size={96} /></div>
              <p className="fprint">{org.key_fingerprint.replace(/:/g, " ")}</p>
              <p className="hash">{org.public_key}</p>
              <div className="actions" style={{ marginTop: 14 }}><CopyButton text={org.public_key} label="Copy public key" /><Link to="/verify" className="btn-text">Verify a pack</Link></div>
            </>
          ) : <p className="soft" style={{ marginTop: 10 }}>A key pair is created the first time your organization signs something.</p>}
        </div>
        <div>
          <span className="kicker">Members</span>
          {org.members.map((m) => <div key={m.id} className="member"><span>{m.email}</span><span className="soft">{org.role}</span></div>)}
          <span className="kicker" style={{ display: "block", marginTop: 30 }}>How it is protected</span>
          {POSTURE.map((p) => <div key={p} className="member"><span>{p}</span></div>)}
        </div>
      </div>
    </div>
  );
}
