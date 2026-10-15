import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";

// Toda lista é pesquisável: a busca é obrigatória e vai para a API (?search=), não filtra no navegador.
export type ListSearch = { value: string; onChange: (value: string) => void; placeholder: string };

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
    <div className="flex flex-wrap items-center gap-2 border-b px-6 py-4">
      <div className="relative min-w-60 flex-1">
        <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-dim" />
        <Input
          type="search"
          aria-label={search.placeholder}
          placeholder={search.placeholder}
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
          className="pl-9"
        />
      </div>
      {filters}
    </div>
  );
}
