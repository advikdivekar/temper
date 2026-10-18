// api/client.ts
// One small wrapper around fetch. It adds the login token to every
// request and turns error replies into thrown errors with a message.

// Set VITE_API_URL to point at another server. Default: local backend.
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "temper_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(BASE + path, {
    method: options.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(problem.detail ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

// Fetch a file (a picture or PDF) with the login token and return a
// temporary local address the page can show. Plain <img src> cannot
// send the token, so we download it first.
export async function fetchFileUrl(path: string): Promise<string> {
  const token = getToken();
  const response = await fetch(BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`Could not load the file (${response.status})`);
  return URL.createObjectURL(await response.blob());
}
