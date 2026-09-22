import { formatNumber } from "~/lib/format";

export type BarItem = {
  label: string;
  value: number;
  // Token de cor (var(--chart-2), por exemplo). Sem ele, a barra usa o primary.
  color?: string;
};

type BarListProps = {
  items: BarItem[];
  // Base do percentual. Sem ela, usa a soma dos itens.
  total?: number;
  emptyMessage?: string;
};

// Lista de barras horizontais com valor e percentual. A largura é relativa ao maior item; o
// percentual é sobre o total.
export function BarList({ items, total, emptyMessage = "Sem dados." }: BarListProps) {
  const sum = total ?? items.reduce((acc, item) => acc + item.value, 0);
  const max = Math.max(...items.map((item) => item.value), 1);

  if (items.length === 0 || sum === 0) {
    return (
      <p className="py-6 text-center text-xs font-medium text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((item) => {
        const percent = (item.value / sum) * 100;
        return (
          <li key={item.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-xs font-bold" title={item.label}>
                {item.label}
              </span>
              <span className="shrink-0 font-mono text-xs font-bold">
                {formatNumber(item.value)}
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="meter"
              aria-label={item.label}
              aria-valuenow={item.value}
              aria-valuemin={0}
              aria-valuemax={sum}
            >
              <div
                className="h-full rounded-full transition-all duration-500 ease-ui"
                style={{
                  width: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%`,
                  backgroundColor: item.color ?? "var(--primary)",
                }}
              />
            </div>
            <span className="text-right font-mono text-[10px] font-bold tracking-widest text-dim">
              {percent.toFixed(1)}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}
