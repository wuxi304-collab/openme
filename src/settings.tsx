import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// User-tunable settings, persisted to localStorage. Defaults are chosen
// to match the legacy hardcoded behaviour so users who never open the
// Settings dialog see no change.

export type ThemeChoice = "dark" | "light";
export type RecentLimit = 10 | 25 | 50;
export type TabSize = 2 | 4 | 8;
export type LineNumbersChoice = "on" | "off";
export type WordWrapChoice = "on" | "off";

export interface Settings {
  theme: ThemeChoice;
  confirmTabClose: boolean;
  recentLimit: RecentLimit;
  tabSize: TabSize;
  lineNumbers: LineNumbersChoice;
  wordWrap: WordWrapChoice;
}

const DEFAULTS: Settings = {
  theme: "dark",
  confirmTabClose: true,
  recentLimit: 50,
  tabSize: 4,
  lineNumbers: "on",
  wordWrap: "off",
};

export { DEFAULTS };

const STORAGE_KEY = "openme.settings.v1";

export const SETTINGS_FILE_VERSION = 1;
export const SETTINGS_FILE_TYPE = "openme-settings";

export interface SettingsFile {
  type: typeof SETTINGS_FILE_TYPE;
  version: typeof SETTINGS_FILE_VERSION;
  exportedAt: string;
  app: { name: string; version: string };
  settings: Settings;
}

export type SettingsImportResult =
  | { ok: true; settings: Settings }
  | { ok: false; reason: "invalid-json" }
  | { ok: false; reason: "wrong-shape" };

export function serializeSettings(settings: Settings, appMeta: { name: string; version: string }): SettingsFile {
  return {
    type: SETTINGS_FILE_TYPE,
    version: SETTINGS_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    app: appMeta,
    settings: { ...settings },
  };
}

export function parseSettingsFile(raw: unknown): SettingsImportResult {
  if (raw == null || typeof raw !== "object") return { ok: false, reason: "wrong-shape" };
  const obj = raw as Record<string, unknown>;
  if (obj.type !== SETTINGS_FILE_TYPE) return { ok: false, reason: "wrong-shape" };
  if (obj.version !== SETTINGS_FILE_VERSION) return { ok: false, reason: "wrong-shape" };
  const candidate = obj.settings as Partial<Settings> | undefined;
  if (!candidate || typeof candidate !== "object") return { ok: false, reason: "wrong-shape" };
  return { ok: true, settings: mergeWithDefaults(candidate) };
}

function mergeWithDefaults(candidate: Partial<Settings>): Settings {
  return {
    theme: candidate.theme === "light" ? "light" : "dark",
    confirmTabClose: typeof candidate.confirmTabClose === "boolean" ? candidate.confirmTabClose : DEFAULTS.confirmTabClose,
    recentLimit: candidate.recentLimit === 10 || candidate.recentLimit === 25 || candidate.recentLimit === 50
      ? candidate.recentLimit
      : DEFAULTS.recentLimit,
    tabSize: candidate.tabSize === 2 || candidate.tabSize === 4 || candidate.tabSize === 8
      ? candidate.tabSize
      : DEFAULTS.tabSize,
    lineNumbers: candidate.lineNumbers === "off" ? "off" : "on",
    wordWrap: candidate.wordWrap === "on" ? "on" : "off",
  };
}

function readPersisted(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return mergeWithDefaults(parsed);
  } catch {
    return DEFAULTS;
  }
}

function persist(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage may be unavailable (private mode, sandboxed iframe);
    // settings will simply reset on next boot — better than crashing.
  }
}

interface SettingsContextValue {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
  replaceAll: (next: Settings) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  update: () => undefined,
  reset: () => undefined,
  replaceAll: () => undefined,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => readPersisted());

  useEffect(() => { persist(settings); }, [settings]);

  // Apply theme to <html data-theme="..."> so theme tokens re-skin the app.
  useEffect(() => {
    try { document.documentElement.setAttribute("data-theme", settings.theme); } catch { /* noop */ }
  }, [settings.theme]);

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => { setSettings(DEFAULTS); }, []);

  const replaceAll = useCallback((next: Settings) => {
    setSettings(mergeWithDefaults(next));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, update, reset, replaceAll }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() { return useContext(SettingsContext); }