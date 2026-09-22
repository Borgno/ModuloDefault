import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api";
import { meQuery } from "~/lib/auth";
import type { AuditEvent, Page } from "~/types/api";
import type { Role, User } from "~/types/user";

export const PAGE_SIZE = 20;

// Parâmetros da lista, lidos da URL. Loader e tela usam a mesma função, então a chave do cache bate.
export type UsersParams = {
  search?: string;
  role?: Role;
  active?: "true" | "false";
  sort: string;
  page: number;
};

export function usersParamsFrom(searchParams: URLSearchParams): UsersParams {
  const role = searchParams.get("role");
  const active = searchParams.get("active");
  return {
    search: searchParams.get("search") || undefined,
    role: role === "admin" || role === "user" ? role : undefined,
    active: active === "true" || active === "false" ? active : undefined,
    sort: searchParams.get("sort") || "fullName",
    page: Math.max(1, Number(searchParams.get("page")) || 1),
  };
}

function toQueryString(params: UsersParams) {
  const query = new URLSearchParams({
    sort: params.sort,
    page: String(params.page),
    pageSize: String(PAGE_SIZE),
  });
  if (params.search) query.set("search", params.search);
  if (params.role) query.set("role", params.role);
  if (params.active) query.set("active", params.active);
  return query.toString();
}

export const usersQuery = (params: UsersParams) =>
  queryOptions({
    queryKey: ["users", "list", params],
    queryFn: ({ signal }) => api.get<Page<User>>(`/users?${toQueryString(params)}`, { signal }),
    // Ao trocar de página ou filtro, mantém a lista anterior na tela até a nova chegar.
    placeholderData: keepPreviousData,
  });

export const userQuery = (id: string) =>
  queryOptions({
    queryKey: ["users", "detail", id],
    queryFn: ({ signal }) => api.get<User>(`/users/${id}`, { signal }),
  });

export const userHistoryQuery = (id: string) =>
  queryOptions({
    queryKey: ["auditEvents", "user", id],
    queryFn: ({ signal }) =>
      api.get<Page<AuditEvent>>(`/auditEvents?targetType=user&targetId=${id}&pageSize=50`, {
        signal,
      }),
  });

export type CreateUserInput = { email: string; fullName: string; role: Role; password: string };
export type UpdateUserInput = Partial<{ fullName: string; role: Role; active: boolean }>;

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<User>("/users", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["userStats"] });
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => api.patch<User>(`/users/${id}`, input),
    onSuccess: (user) => {
      queryClient.setQueryData(userQuery(id).queryKey, user);
      void queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      void queryClient.invalidateQueries({ queryKey: userHistoryQuery(id).queryKey });
      void queryClient.invalidateQueries({ queryKey: ["userStats"] });
      // Editar a si mesmo muda o nome na sidebar.
      void queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
    },
  });
}

export function useResetPassword(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ temporaryPassword: string }>(`/users/${id}/passwordResets`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: userHistoryQuery(id).queryKey });
    },
  });
}
