import { SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { useListParams } from "~/hooks/useListParams";

type FilterButtonProps = {
  // Chaves da URL que são filtro desta lista. O valor padrão de um filtro fica fora da URL (o
  // onChange grava null ao voltar ao padrão), então filtro ativo é chave presente. Daqui saem o
  // contador e o "Limpar filtros".
  keys: readonly string[];
  children: React.ReactNode;
};

// Os filtros de uma lista num painel próprio, para a barra ficar só com a busca e este botão. Os
// filtros entram como children, cada um num FilterField.
export function FilterButton({ keys, children }: FilterButtonProps) {
  const { searchParams, set } = useListParams();
  // Aparece no botão, para quem olha a lista saber que ela está recortada sem abrir o painel.
  const active = keys.filter((key) => searchParams.has(key)).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          Filtros
          {active > 0 && (
            <span className="rounded-full bg-primary px-1.5 font-mono text-[10px] leading-4 text-primary-foreground">
              {active}
            </span>
          )}
          <SlidersHorizontal />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        aria-label="Filtros de pesquisa"
        className="w-80 gap-4 p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Filtros de pesquisa</p>
          <Button
            size="sm"
            variant="ghost"
            disabled={active === 0}
            onClick={() => set(Object.fromEntries(keys.map((key) => [key, null])))}
          >
            Limpar filtros
          </Button>
        </div>
        {children}
      </PopoverContent>
    </Popover>
  );
}

// Um filtro dentro do painel, com o rótulo visível em cima. O htmlFor aponta para o id do
// SearchableSelect, que dispensa o aria-label.
export function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
