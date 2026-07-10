/* Splash preload — exposes only the IPC channels the splash needs.
 *
 * This preload is *only* loaded by the splash BrowserWindow. It does not
 * touch the main app preload surface so a splash-side exploit (if any)
 * cannot reach window APIs.
 */
const { contextBridge, ipcRenderer } = require("electron");

const PROGRESS_CHANNEL = "splash:progress";
const INIT_CHANNEL = "splash:init";
const LANG_CHANNEL = "splash:lang";
const FADE_CHANNEL = "splash:fade";
const READY_CHANNEL = "splash:ready";

contextBridge.exposeInMainWorld("openmeSplash", {
  onInit(handler) {
    if (typeof handler !== "function") return () => undefined;
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on(INIT_CHANNEL, listener);
    return () => ipcRenderer.removeListener(INIT_CHANNEL, listener);
  },
  onProgress(handler) {
    if (typeof handler !== "function") return () => undefined;
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on(PROGRESS_CHANNEL, listener);
    return () => ipcRenderer.removeListener(PROGRESS_CHANNEL, listener);
  },
  onLangChange(handler) {
    if (typeof handler !== "function") return () => undefined;
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on(LANG_CHANNEL, listener);
    return () => ipcRenderer.removeListener(LANG_CHANNEL, listener);
  },
  onFade(handler) {
    if (typeof handler !== "function") return () => undefined;
    const listener = () => handler();
    ipcRenderer.on(FADE_CHANNEL, listener);
    return () => ipcRenderer.removeListener(FADE_CHANNEL, listener);
  },
  notifyReady() {
    ipcRenderer.send(READY_CHANNEL);
  },
});