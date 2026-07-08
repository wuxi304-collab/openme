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

const STORAGE_KEY = "openme.settings.v1";

function readPersisted(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      confirmTabClose: typeof parsed.confirmTabClose === "boolean" ? parsed.confirmTabClose : DEFAULTS.confirmTabClose,
      recentLimit: parsed.recentLimit === 10 || parsed.recentLimit === 25 ? parsed.recentLimit : DEFAULTS.recentLimit,
      tabSize: parsed.tabSize === 2 || parsed.tabSize === 8 ? parsed.tabSize : DEFAULTS.tabSize,
      lineNumbers: parsed.lineNumbers === "off" ? "off" : "on",
      wordWrap: parsed.wordWrap === "on" ? "on" : "off",
    };
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
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  update: () => undefined,
  reset: () => undefined,
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

  return (
    <SettingsContext.Provider value={{ settings, update, reset }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() { return useContext(SettingsContext); }