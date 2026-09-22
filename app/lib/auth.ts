import { queryOptions } from "@tanstack/react-query";
import { redirect } from "react-router";
import type { Role, User } from "~/types/user";
import { api, isUnauthorized } from "./api";
import { queryClient } from "./queryClient";

// "Sem sessão" é dado (null), não erro. Se fosse erro, limpar o cache com uma tela montada faria o
// useQuery refazer o /me, receber 401 de novo e reagir de novo, num ciclo sem fim.
export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async ({ signal }): Promise<User | null> => {
    try {
      return await api.get<User>("/me", { signal });
    } catch (error) {
      if (isUnauthorized(error)) return null;
      throw error;
    }
  },
});

// Usuário da sessão, ou null. Responde na hora com o cache e busca o /me de novo em segundo plano
// (staleTime 0 só aqui). Assim, quem foi desativado cai para o login na navegação seguinte, mesmo numa
// tela que não faz nenhuma requisição. Custa um /me por navegação, sem segurar a tela.
export function getSessionUser() {
  return queryClient.ensureQueryData({ ...meQuery, staleTime: 0, revalidateIfStale: true });
}

// Para usar em clientMiddleware/clientLoader: sem sessão, manda para o login guardando a volta.
export async function requireSessionUser(request: Request): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw redirect(loginPath(new URL(request.url)));
  return user;
}

// Para clientMiddleware de rota restrita. Esconder o item da sidebar não basta: a URL pode ser digitada.
// O backend barra do mesmo jeito; aqui é só para não mostrar uma tela que vai falhar.
export async function requireRole(request: Request, role: Role) {
  const user = await requireSessionUser(request);
  if (user.role !== role) throw redirect("/");
  return user;
}

export function loginPath(from: { pathname: string; search: string }) {
  return `/login?redirectTo=${encodeURIComponent(from.pathname + from.search)}`;
}

// Só aceita caminho interno, para o redirectTo do login não virar open redirect.
export function safeRedirect(target: string | null) {
  return target && target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

// Marca a sessão como encerrada sem disparar refetch nas telas montadas.
export function markSignedOut() {
  queryClient.setQueryData(meQuery.queryKey, null);
}

// Apaga o que foi carregado por outra sessão. Chamar só sem telas autenticadas montadas (na tela de
// login), senão os useQuery montados buscam tudo de novo.
export function clearSessionData() {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== meQuery.queryKey[0] });
}

export async function logout() {
  await api.delete("/sessions/current");
  markSignedOut();
}
