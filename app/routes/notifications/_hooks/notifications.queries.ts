import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "~/lib/api";
import type { NotificationPage } from "~/types/notification";

export const PAGE_SIZE = 20;

// Parâmetros da lista, lidos da URL. Loader e tela usam a mesma função, então a chave do cache bate.
export type NotificationsParams = {
  search?: string;
  read?: "true" | "false";
  // Só as arquivadas; sem ele, as recebidas.
  archived?: "true";
  page: number;
};

export function notificationsParamsFrom(searchParams: URLSearchParams): NotificationsParams {
  const read = searchParams.get("read");
  return {
    search: searchParams.get("search") || undefined,
    read: read === "true" || read === "false" ? read : undefined,
    archived: searchParams.get("archived") === "true" ? "true" : undefined,
    page: Math.max(1, Number(searchParams.get("page")) || 1),
  };
}

function toQueryString(params: NotificationsParams) {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(PAGE_SIZE) });
  if (params.search) query.set("search", params.search);
  if (params.read) query.set("read", params.read);
  if (params.archived) query.set("archived", params.archived);
  return query.toString();
}

// Chave sob ["notifications", "list"]: o stream de notificações invalida a lista quando algo muda.
export const notificationsQuery = (params: NotificationsParams) =>
  queryOptions({
    queryKey: ["notifications", "list", params],
    queryFn: ({ signal }) =>
      api.get<NotificationPage>(`/notifications?${toQueryString(params)}`, { signal }),
    placeholderData: keepPreviousData,
  });
