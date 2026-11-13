import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadConfig } from "./config";

function App() {
  const [status, setStatus] = useState("checking…");

  useEffect(() => {
    loadConfig()
      .then(({ apiUrl }) => fetch(`${apiUrl}/health`))
      .then((r) => r.json())
      .then((body) => setStatus(body.ok ? "API is healthy" : "API returned an unexpected response"))
      .catch((err) => setStatus(`API unreachable: ${err.message}`));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1>AXP Tracker</h1>
      <p>{status}</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
