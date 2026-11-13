import { loadConfig } from "./config";
import type { Entry, EntryInput } from "./domain";

const TOKEN_KEY = "axp-passphrase";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode); user will just re-enter the passphrase
  }
}

export class UnauthorizedError extends Error {}

async function request<T>(method: string, path: string, body?: unknown, token = getToken()): Promise<T> {
  const { apiUrl } = await loadConfig();
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token ?? ""}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) throw new UnauthorizedError("Incorrect passphrase");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  checkPassphrase: (token: string) => request<{ ok: true }>("GET", "/auth", undefined, token),
  listEntries: (from: string, to: string) =>
    request<Entry[]>("GET", `/entries?from=${from}&to=${to}`),
  createEntry: (input: EntryInput) => request<Entry>("POST", "/entries", input),
  updateEntry: (id: string, input: EntryInput) => request<Entry>("PUT", `/entries/${encodeURIComponent(id)}`, input),
  deleteEntry: (id: string) => request<void>("DELETE", `/entries/${encodeURIComponent(id)}`),
};
