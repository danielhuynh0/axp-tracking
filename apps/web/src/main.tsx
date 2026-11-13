import { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import type { User } from "oidc-client-ts";
import type { Preferences } from "@axp/contracts";
import { api, ApiError } from "./api";
import { auth, signOut } from "./auth";
import { config } from "./config";
import "./styles.css";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [name, setName] = useState("");
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);

  function report(error: unknown) {
    setError(error instanceof Error ? error.message : "Unable to complete the request.");
    if (error instanceof ApiError && error.status === 401) setUser(null);
  }

  async function loadPreferences() {
    setBusy(true); setError(""); setMessage("");
    try {
      const saved = await api.preferences();
      setPreferences(saved); setName(saved.displayName);
      if (saved.version > 0) setTimeZone(saved.timeZone);
      setConflict(false);
    } catch (error) { report(error); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    async function initialize() {
      try {
        if (!auth) return;
        let session: User | null;
        if (window.location.pathname === "/auth/callback") {
          try { session = await auth.signinRedirectCallback(); }
          finally { window.history.replaceState({}, "", "/"); }
        } else { session = await auth.getUser(); }
        if (session && !session.expired) { setUser(session); await loadPreferences(); }
        else { await auth.removeUser(); }
      } catch (error) { report(error); }
      finally { setReady(true); }
    }
    void initialize();
    const expired = () => { setUser(null); setPreferences(null); setError("Your session has expired. Sign in again to continue."); };
    auth?.events.addAccessTokenExpired(expired);
    return () => auth?.events.removeAccessTokenExpired(expired);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!preferences) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const saved = await api.savePreferences({ displayName: name, timeZone, expectedVersion: preferences.version });
      setPreferences(saved); setName(saved.displayName); setMessage("Your preferences are saved.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setConflict(true);
      report(error);
    } finally { setBusy(false); }
  }

  return <div className="shell">
    <header><a className="brand" href="/" aria-label="AXP Journal home"><span className="brand-mark">A</span>AXP <span>Journal</span></a>
      {user && <button className="text-button" onClick={() => void signOut().catch(report)}>Sign out</button>}
    </header>
    <main>
      <div className="eyebrow">YOUR PATH TO PRACTICE</div>
      <h1>A place for your<br /><em>experience to grow.</em></h1>
      <p className="intro">Keep your architectural journey together, one working week at a time.</p>
      {error && <div className="notice error" role="alert">{error}</div>}
      {!ready ? <section className="panel" aria-busy="true">Opening your workspace…</section> : !config ?
        <section className="panel"><span className="badge">COMING TOGETHER</span><h2>Your journal is taking shape.</h2>
          <p>This workspace is not connected yet. Once setup is complete, you’ll be able to sign in and make it yours.</p>
        </section> : !user ?
        <section className="panel"><span className="badge">YOUR PERSONAL WORKSPACE</span><h2>Welcome to your journal.</h2>
          <p>Sign in to open your private workspace.</p>
          <button disabled={busy} onClick={() => { setBusy(true); setError(""); void auth!.signinRedirect().catch((error) => { report(error); setBusy(false); }); }}>Sign in <span aria-hidden="true">↗</span></button>
        </section> :
        <section className="panel">
          <span className="badge">MAKE YOURSELF AT HOME</span><h2>{preferences?.displayName ? `Welcome, ${preferences.displayName}.` : "Your workspace"}</h2>
          <p>Set your name and time zone. Your preferences stay with your account.</p>
          {!preferences ? <button onClick={() => void loadPreferences()} disabled={busy}>{busy ? "Loading…" : "Try again"}</button> :
            <form onSubmit={(event) => void save(event)}>
              <label htmlFor="displayName">Your name</label>
              <input id="displayName" autoComplete="given-name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} placeholder="How should we greet you?" />
              <label htmlFor="timeZone">Time zone</label>
              <input id="timeZone" list="timezones" required maxLength={100} value={timeZone} onChange={(event) => setTimeZone(event.target.value)} disabled={busy} />
              <datalist id="timezones">{[...new Set([timeZone, "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "UTC"])].map((zone) => <option key={zone} value={zone} />)}</datalist>
              <div className="actions"><button disabled={busy || conflict} type="submit">{busy ? "Saving…" : "Save preferences"}</button>
                {conflict && <button className="text-button" type="button" onClick={() => void loadPreferences()} disabled={busy}>Reload saved preferences</button>}</div>
              {message && <p className="success" role="status">{message}</p>}
            </form>}
        </section>}
      <div className="footnote"><span className="line" /> A little structure for the work that matters.</div>
    </main>
    <footer><span>AXP Journal</span><span>Built for the long view.</span></footer>
  </div>;
}

createRoot(document.getElementById("root")!).render(<App />);
