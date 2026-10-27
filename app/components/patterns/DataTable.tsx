import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Fragment, useId } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
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
import { ListToolbar, type ListSearch } from "./ListToolbar";
import { SearchableSelect } from "./SearchableSelect";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  // Campo de ordenação na API. Sem ele, a coluna não ordena.
  sortField?: string;
  className?: string;
  // No celular a tabela vira lista de cards: a primeira coluna é o título do card e as outras viram
  // pares rótulo e valor. Coluna secundária pode sair do card.
  hideOnMobile?: boolean;
};

type DataTableProps<T> = {
  search: ListSearch;
  // Filtros da lista: um FilterButton, ao lado da busca, dentro do card.
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

// Ordenação no celular, onde não há cabeçalho de coluna para clicar: cada coluna ordenável vira duas
// opções, crescente e decrescente.
function MobileSort<T>({
  columns,
  sort,
  onSortChange,
}: {
  columns: Column<T>[];
  sort?: string;
  onSortChange: (sort: string) => void;
}) {
  const id = useId();
  const options = columns.flatMap((column) =>
    column.sortField
      ? [
          { value: column.sortField, label: `${column.header} (crescente)` },
          { value: `-${column.sortField}`, label: `${column.header} (decrescente)` },
        ]
      : [],
  );
  if (options.length === 0) return null;
  return (
    <div className="flex items-center gap-3 border-b px-6 py-3 md:hidden">
      <Label htmlFor={id} className="shrink-0 text-xs text-muted-foreground">
        Ordenar por
      </Label>
      <SearchableSelect
        id={id}
        value={sort ?? ""}
        onChange={onSortChange}
        options={options}
        searchPlaceholder="Buscar ordenação..."
        className="flex-1"
      />
    </div>
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
  const [titleColumn, ...detailColumns] = columns;
  const mobileColumns = detailColumns.filter((column) => !column.hideOnMobile);

  // Linha e card abrem o item do mesmo jeito: clique, Enter ou espaço.
  const rowProps = (row: T) =>
    onRowClick
      ? {
          onClick: () => onRowClick(row),
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onRowClick(row);
            }
          },
          tabIndex: 0,
          "aria-label": rowLabel?.(row),
        }
      : {};
  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <ListToolbar search={search} filters={filters} />

      {error && !rows ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : !showSkeleton && rows?.length === 0 ? (
        <EmptyState {...empty} />
      ) : (
        <>
          {sort !== undefined && onSortChange && (
            <MobileSort columns={columns} sort={sort} onSortChange={onSortChange} />
          )}
          <ul aria-label="Registros" className="divide-y md:hidden">
            {showSkeleton
              ? Array.from({ length: 3 }, (_, index) => (
                  <li key={index} className="space-y-2 px-6 py-4">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </li>
                ))
              : rows?.map((row) => (
                  <li key={rowKey(row)}>
                    <div
                      {...rowProps(row)}
                      role={onRowClick ? "button" : undefined}
                      className={cn(
                        "space-y-3 px-6 py-4",
                        onRowClick &&
                          "cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-accent focus-visible:outline-none",
                      )}
                    >
                      <div className="min-w-0">{titleColumn.cell(row)}</div>
                      {mobileColumns.length > 0 && (
                        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
                          {mobileColumns.map((column) => (
                            <Fragment key={column.key}>
                              <dt className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                                {column.header}
                              </dt>
                              <dd className="min-w-0">{column.cell(row)}</dd>
                            </Fragment>
                          ))}
                        </dl>
                      )}
                    </div>
                  </li>
                ))}
          </ul>
          <div className="hidden md:block">
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
                        {...rowProps(row)}
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
          </div>
        </>
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
