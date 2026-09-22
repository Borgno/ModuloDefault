import { useCallback } from "react";
import { useSearchParams } from "react-router";

// Estado de uma lista (busca, filtros, ordenação, página) na URL: sobrevive ao reload, dá para mandar
// o link, e o botão voltar desfaz o último filtro.
export function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const set = useCallback(
    (updates: Record<string, string | null | undefined>, { resetPage = true } = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === undefined || value === "") next.delete(key);
            else next.set(key, value);
          }
          // Mudar filtro ou ordenação volta para a primeira página.
          if (resetPage && !("page" in updates)) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { searchParams, set };
}
