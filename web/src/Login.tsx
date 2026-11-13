import { useState, type FormEvent } from "react";
import { api, setToken, UnauthorizedError } from "./api";

export function Login({ onLogin }: { onLogin: () => void }) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.checkPassphrase(passphrase);
      setToken(passphrase);
      onLogin();
    } catch (err) {
      setError(err instanceof UnauthorizedError ? "Incorrect passphrase" : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card login" onSubmit={submit}>
      <h1>AXP Tracker</h1>
      <label>
        Passphrase
        <input type="password" autoFocus value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy || !passphrase}>
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
