export type Page<T> = { data: T[]; meta: { page: number; pageSize: number; total: number } };

export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { page, pageSize, total: items.length },
  };
}

// Ordena por um campo, com "-campo" para decrescente. Nulos vão para o fim nos dois sentidos.
export function sortBy<T>(
  items: T[],
  sort: string,
  pick: (item: T, field: string) => string | number | null,
) {
  const descending = sort.startsWith("-");
  const field = descending ? sort.slice(1) : sort;
  return [...items].sort((a, b) => {
    const left = pick(a, field);
    const right = pick(b, field);
    if (left === right) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    const order = left < right ? -1 : 1;
    return descending ? -order : order;
  });
}
