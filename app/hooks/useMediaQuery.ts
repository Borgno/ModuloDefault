import { useSyncExternalStore } from "react";

// A media query casa agora, e acompanha a mudança (girar o celular, redimensionar a janela).
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
