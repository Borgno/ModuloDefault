import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatNumber } from "~/lib/format";
import { cn } from "~/lib/utils";
import { EmptyState, ErrorState } from "./EmptyState";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  // Campo de ordenação na API. Sem ele, a coluna não ordena.
  sortField?: string;
  className?: string;
};

type DataTableProps<T> = {
  // Toda lista é pesquisável: a busca é obrigatória e vai para a API (?search=), não filtra no navegador.
  search: { value: string; onChange: (value: string) => void; placeholder: string };
  // Filtros da lista (selects), ao lado da busca, dentro do card.
  filters?: React.ReactNode;
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  isLoading: boolean;
  error?: unknown;
  onRetry?: () => void;
  // Ordenação no formato da API: "campo" ou "-campo".
  sort?: string;
  onSortChange?: (sort: string) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  empty: React.ComponentProps<typeof EmptyState>;
};

function SortButton({
  label,
  field,
  sort,
  onSortChange,
}: {
  label: string;
  field: string;
  sort?: string;
  onSortChange: (sort: string) => void;
}) {
  const active = sort === field || sort === `-${field}`;
  const descending = sort === `-${field}`;
  const Icon = !active ? ArrowUpDown : descending ? ArrowDown : ArrowUp;
  return (
    <button
      type="button"
      onClick={() => onSortChange(active && !descending ? `-${field}` : field)}
      className={cn(
        "inline-flex items-center gap-1 transition-colors hover:text-foreground",
        active && "text-foreground",
      )}
    >
      {label}
      <Icon size={12} />
    </button>
  );
}

// Padding das células: mais folga na primeira e na última coluna, alinhado com a barra de busca.
const cellPadding = "px-4 first:pl-6 last:pr-6";

export function DataTable<T>({
  search,
  filters,
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  onRetry,
  sort,
  onSortChange,
  pagination,
  onRowClick,
  rowLabel,
  empty,
}: DataTableProps<T>) {
  const showSkeleton = isLoading && !rows;
  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
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

      {error && !rows ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : !showSkeleton && rows?.length === 0 ? (
        <EmptyState {...empty} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => {
                const direction =
                  column.sortField && sort === column.sortField
                    ? "ascending"
                    : column.sortField && sort === `-${column.sortField}`
                      ? "descending"
                      : undefined;
                return (
                  <TableHead
                    key={column.key}
                    aria-sort={direction}
                    className={cn(
                      "h-11 text-[10px] font-bold tracking-widest text-muted-foreground uppercase",
                      cellPadding,
                      column.className,
                    )}
                  >
                    {column.sortField && onSortChange ? (
                      <SortButton
                        label={column.header}
                        field={column.sortField}
                        sort={sort}
                        onSortChange={onSortChange}
                      />
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {showSkeleton
              ? Array.from({ length: 5 }, (_, index) => (
                  <TableRow key={index}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={cellPadding}>
                        <Skeleton className="h-4 w-3/4" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows?.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                    className={cn(
                      onRowClick &&
                        "cursor-pointer focus-visible:bg-accent focus-visible:outline-none",
                    )}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn("py-3", cellPadding, column.className)}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      )}

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between border-t px-6 py-3 text-xs text-muted-foreground">
          <span>
            <span className="font-mono">{formatNumber(pagination.total)}</span>{" "}
            {pagination.total === 1 ? "registro" : "registros"}
          </span>
          <div className="flex items-center gap-2">
            <span>
              Página <span className="font-mono">{pagination.page}</span> de{" "}
              <span className="font-mono">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Página anterior"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Próxima página"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
