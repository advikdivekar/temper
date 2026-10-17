// lib/pack.ts
// Downloads a statement's verification pack as a JSON file. The pack
// can be dropped into the public verifier by anyone, with no account.

import { getToken } from "../api/client";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function downloadPack(statementId: number): Promise<void> {
  const response = await fetch(`${BASE}/statements/${statementId}/pack`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error((await response.json()).detail ?? "Download failed");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `temper-pack-statement-${statementId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
