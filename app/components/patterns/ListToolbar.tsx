import { CalendarDays, ListFilter, Search, X } from "lucide-react";
import { useId, useMemo, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
  MAX_SEARCH_LENGTH,
  MIN_SEARCH_LENGTH,
  periodFromTerm,
  shortValueKeys,
  withPeriod,
  type SearchKey,
} from "~/lib/search";

// Toda lista é pesquisável: a busca é obrigatória e vai para a API (?search=), não filtra no navegador.
// A caixa aceita texto livre e `campo:valor` (server/lib/search.ts). `keys` são as chaves da lista e
// `periodLabel` liga o período (`de:` e `ate:`); sem eles, a caixa é só texto livre.
export type ListSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  // Tem texto e não alcança o mínimo. Vem do useListSearch.
  tooShort?: boolean;
  keys?: readonly SearchKey[];
  periodLabel?: string;
};

// Barra de uma lista: busca e, ao lado, o FilterButton. O DataTable já a inclui; uma lista que não é
// tabela (kanban, cards) usa esta barra direto, no topo do próprio card.
export function ListToolbar({
  search,
  filters,
}: {
  search: ListSearch;
  filters?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-2 border-b px-6 py-4">
      <SearchBox search={search} />
      {filters}
    </div>
  );
}

function SearchBox({ search }: { search: ListSearch }) {
  const { value, onChange, placeholder, tooShort = false, keys = [], periodLabel } = search;
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const fromId = useId();
  const toId = useId();

  const shortKeys = useMemo(() => shortValueKeys(value, keys), [value, keys]);
  const period = useMemo(() => periodFromTerm(value), [value]);
  const hasPanel = keys.length > 0 || Boolean(periodLabel);

  // O que o servidor descartaria em silêncio, dito antes.
  const hint = tooShort
    ? `Digite ao menos ${MIN_SEARCH_LENGTH} caracteres para buscar.`
    : shortKeys.length > 0
      ? `O valor de ${shortKeys.map((k) => `${k}:`).join(", ")} é curto demais: esse filtro foi ignorado.`
      : null;

  // Põe `chave:` no fim do que já está digitado e devolve o cursor para a caixa.
  function insertKey(key: string) {
    const base = value.trimEnd();
    onChange(base ? `${base} ${key}:` : `${key}:`);
    inputRef.current?.focus();
  }

  return (
    <div className="min-w-60 flex-1">
      <div className="relative">
        <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-dim" />
        <Input
          ref={inputRef}
          type="search"
          aria-label={placeholder}
          aria-describedby={hint ? hintId : undefined}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          // Impede a digitação em vez de o servidor recusar depois.
          maxLength={MAX_SEARCH_LENGTH}
          className="pr-16 pl-9 [&::-webkit-search-cancel-button]:hidden"
        />

        <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center">
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Limpar busca"
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
            >
              <X />
            </Button>
          )}

          {hasPanel && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Campos e período da busca"
                >
                  <ListFilter />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                collisionPadding={16}
                aria-label="Campos e período da busca"
                className="w-80 gap-0 p-0"
              >
                {keys.length > 0 && (
                  <div className="border-b p-4">
                    <p className="text-sm font-bold">Filtrar por campo</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Digitar o valor direto já encontra. Use o campo quando o termo for ambíguo.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {keys.map(({ key, label }) => (
                        <Button
                          key={key}
                          type="button"
                          variant="outline"
                          size="xs"
                          className="font-mono"
                          title={label}
                          onClick={() => insertKey(key)}
                        >
                          {key}:
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {periodLabel && (
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-sm font-bold">
                        <CalendarDays size={14} />
                        {periodLabel}
                      </p>
                      <Button
                        type="button"
                        variant="link"
                        size="xs"
                        disabled={!period.from && !period.to}
                        onClick={() => onChange(withPeriod(value, { from: "", to: "" }))}
                      >
                        Limpar
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={fromId} className="text-xs text-muted-foreground">
                          De
                        </Label>
                        <Input
                          id={fromId}
                          type="date"
                          value={period.from}
                          max={period.to || undefined}
                          onChange={(event) =>
                            onChange(withPeriod(value, { ...period, from: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={toId} className="text-xs text-muted-foreground">
                          Até
                        </Label>
                        <Input
                          id={toId}
                          type="date"
                          value={period.to}
                          min={period.from || undefined}
                          onChange={(event) =>
                            onChange(withPeriod(value, { ...period, to: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {hint && (
        <p id={hintId} role="status" className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
