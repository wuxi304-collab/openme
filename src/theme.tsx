import React, { createContext, useContext } from "react";
import { useSettings } from "./settings";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => undefined,
  toggle: () => undefined,
});

// Thin wrapper that exposes the theme via a dedicated hook. All theme
// state lives in SettingsProvider (so the Settings dialog and the
// titlebar toggle stay in sync). This module exists for backwards
// compatibility with callers that already import useTheme().
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, update } = useSettings();
  const theme: Theme = settings.theme;
  const setTheme = (next: Theme) => update("theme", next);
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
