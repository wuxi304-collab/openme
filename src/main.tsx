import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./file-summary.css";

// Browser fallback shim for window.electronAPI so the app can render in a normal browser during dev.
// Provides no-op async functions to avoid runtime errors when Electron preload isn't present.
// We keep this as a one-off typed cast: preload.js installs the real bridge
// in production, but during vite dev / unit tests the value is missing and we
// want a one-line placeholder without re-declaring the global Window shape.
type AnyElectronShim = Record<string, (...args: unknown[]) => Promise<unknown>>;
const win = window as unknown as { electronAPI?: AnyElectronShim };
if (!win.electronAPI) {
  const noopAsync = async (..._args: unknown[]) => null;
  win.electronAPI = new Proxy({}, { get: () => noopAsync });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
