import { useEffect, useState } from "react";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { useListParams } from "~/hooks/useListParams";
import { MIN_SEARCH_LENGTH } from "~/lib/search";

// Termo da caixa de busca de uma lista. O digitado vai para a URL (?search=) depois de uma pausa e
// só a partir do mínimo, que o servidor recusa abaixo dele. Apagar tudo limpa a busca na hora.
export function useListSearch(current: string | undefined) {
  const { set } = useListParams();
  const [value, setValue] = useState(current ?? "");
  const debounced = useDebouncedValue(value.trim());

  const next = debounced.length >= MIN_SEARCH_LENGTH ? debounced : "";
  useEffect(() => {
    if (next !== (current ?? "")) set({ search: next });
  }, [next, current, set]);

  // O aviso olha o digitado, e não o debounced: aparece enquanto a pessoa digita.
  const typed = value.trim();
  const tooShort = typed.length > 0 && typed.length < MIN_SEARCH_LENGTH;

  return { value, onChange: setValue, tooShort };
}
