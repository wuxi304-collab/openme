import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./file-summary.css";

// Browser fallback shim for window.electronAPI so the app can render in a normal browser during dev.
// Provides no-op async functions to avoid runtime errors when Electron preload isn't present.
if (!(window as any).electronAPI) {
  const noopAsync = async (..._args: any[]) => null;
  (window as any).electronAPI = new Proxy({}, {
    get: () => noopAsync,
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
