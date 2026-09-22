import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

// Roda no <head>, antes do primeiro paint, para o tema escuro não piscar branco. Fica como string
// porque vai inline no HTML gerado no build.
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

// No build (fora do navegador) não há document: o primeiro render assume claro.
function getServerSnapshot(): Theme {
  return "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Sem localStorage (navegação privada restrita): o tema vale só nesta aba.
  }
  for (const listener of listeners) listener();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { theme, toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark") };
}
