import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { getToken, setToken, UnauthorizedError } from "./api";
import { Login } from "./Login";
import { LogWeek } from "./LogWeek";
import { Report } from "./Report";
import "./styles.css";

function App() {
  const [signedIn, setSignedIn] = useState(() => getToken() !== null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"log" | "report">("log");

  const signOut = useCallback(() => {
    setToken(null);
    setSignedIn(false);
  }, []);

  const onError = useCallback(
    (err: unknown) => {
      if (err instanceof UnauthorizedError) signOut();
      else setError((err as Error).message);
    },
    [signOut],
  );

  if (!signedIn) return <Login onLogin={() => setSignedIn(true)} />;

  return (
    <div className="app">
      <header>
        <h1>AXP Tracker</h1>
        <nav>
          <button className={`tab ${view === "log" ? "active" : ""}`} onClick={() => setView("log")}>
            Log week
          </button>
          <button className={`tab ${view === "report" ? "active" : ""}`} onClick={() => setView("report")}>
            Report
          </button>
          <button className="link" onClick={signOut}>
            Sign out
          </button>
        </nav>
      </header>
      {error && (
        <p className="error banner" onClick={() => setError(null)}>
          {error} (dismiss)
        </p>
      )}
      {view === "log" ? <LogWeek onError={onError} /> : <Report onError={onError} />}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
