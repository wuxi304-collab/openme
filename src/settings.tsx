import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// User-tunable settings, persisted to localStorage. Defaults are chosen
// to match the legacy hardcoded behaviour so users who never open the
// Settings dialog see no change.

export type ThemeChoice = "dark" | "light";
export type RecentLimit = 10 | 25 | 50;

export interface Settings {
  theme: ThemeChoice;
  confirmTabClose: boolean;
  recentLimit: RecentLimit;
}

const DEFAULTS: Settings = {
  theme: "dark",
  confirmTabClose: true,
  recentLimit: 50,
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