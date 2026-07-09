import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./file-summary.css";

// Browser fallback shim for window.electronAPI so the app can render in a normal browser during dev.
// Provides no-op async functions to avoid runtime errors when Electron preload isn't present.
// The shim assignment widens `window.electronAPI` to a Proxy, but the global
// Window augmentation in `src/types/electron-api.d.ts` declares the
// production shape. This is the one place a cast is unavoidable: the shim
// runs before any code that depends on `electronAPI`, and we can't ask TS
// to forget the augmentation just for the install check. We escape the
// global Window type via `unknown` and stash the optionality only locally
// so the rest of the codebase still sees the typed `ElectronAPI` shape.
type ElectronShim = Record<string, (...args: unknown[]) => Promise<unknown>>;
const win = window as unknown as { electronAPI?: ElectronShim | undefined };
if (!win.electronAPI) {
  const noopAsync = async (..._args: unknown[]) => null;
  win.electronAPI = new Proxy({}, { get: () => noopAsync });
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found");
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
