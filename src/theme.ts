import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
const STORAGE_KEY = "openme.theme";

const ThemeContext = createContext({ theme: "dark" as Theme, setTheme: (t: Theme) => {}, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s === "light") return "light" as Theme; } catch { }
    return "dark" as Theme;
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { }
    try { document.documentElement.setAttribute("data-theme", theme); } catch { }
  }, [theme]);
  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((prev) => prev === "dark" ? "light" : "dark");
  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
