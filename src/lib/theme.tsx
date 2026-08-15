import { useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";
const KEY = "studyflow.theme";

export function applyTheme(choice: ThemeChoice) {
  if (typeof document === "undefined") return;
  const dark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem(KEY, choice);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as ThemeChoice | null) ?? "system";
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = (choice: ThemeChoice) => {
    setThemeState(choice);
    applyTheme(choice);
  };

  return { theme, setTheme };
}
