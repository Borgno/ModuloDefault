import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Outlet, redirect, useLocation, useNavigate } from "react-router";
import { MobileNav } from "~/components/layout/MobileNav";
import { Sidebar, SIDEBAR_MODES, type SidebarMode } from "~/components/layout/Sidebar";
import { TopProgress } from "~/components/layout/TopProgress";
import { isUnauthorized } from "~/lib/api";
import { loginPath, logout, markSignedOut, meQuery, requireSessionUser } from "~/lib/auth";
import type { Route } from "./+types/app-layout";

// Guard das rotas autenticadas: sem sessão vai para o login; com troca de senha pendente, para a troca.
export const clientMiddleware: Route.ClientMiddlewareFunction[] = [
  async ({ request }) => {
    const user = await requireSessionUser(request);
    if (user.mustChangePassword) throw redirect("/change-password");
  },
];

// Garante que o middleware rode em toda navegação para dentro do layout.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return requireSessionUser(request);
}

// Se a sessão cair no meio do uso (expirou, usuário desativado), qualquer query ou mutation que
// receber 401 manda para o login. Não limpa o cache aqui: isso faria as telas montadas buscarem de
// novo e receberem 401 de novo. A limpeza acontece no próximo login.
function useRedirectOnUnauthorized() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onError = (error: unknown) => {
      if (!isUnauthorized(error)) return;
      markSignedOut();
      navigate(loginPath(location), { replace: true });
    };
    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") onError(event.action.error);
    });
    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") onError(event.action.error);
    });
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [queryClient, navigate, location]);
}

const SIDEBAR_MODE_KEY = "sidebar-mode";

// Preferência de cada navegador. O layout só renderiza no navegador (tem clientLoader), então
// ler o localStorage no estado inicial é seguro.
function useSidebarMode() {
  const [mode, setMode] = useState<SidebarMode>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_MODE_KEY);
      return SIDEBAR_MODES.some((option) => option.value === saved)
        ? (saved as SidebarMode)
        : "expanded";
    } catch {
      return "expanded";
    }
  });

  function change(next: SidebarMode) {
    setMode(next);
    try {
      localStorage.setItem(SIDEBAR_MODE_KEY, next);
    } catch {
      // Sem localStorage: a preferência vale só até recarregar.
    }
  }

  return [mode, change] as const;
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  useRedirectOnUnauthorized();
  const { data: user } = useQuery({ ...meQuery, initialData: loaderData });
  const [sidebarMode, setSidebarMode] = useSidebarMode();
  const navigate = useNavigate();
  const location = useLocation();
  const loggingOut = useRef(false);

  // A revalidação em segundo plano do /me devolveu "sem sessão": sai para o login guardando a volta.
  // No logout explícito, quem navega é o handleLogout, sem a volta.
  useEffect(() => {
    if (user === null && !loggingOut.current) navigate(loginPath(location), { replace: true });
  }, [user, navigate, location]);

  async function handleLogout() {
    loggingOut.current = true;
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <TopProgress />
      <div className="flex h-screen w-screen overflow-hidden">
        {user && (
          <div className="hidden md:flex">
            <Sidebar
              user={user}
              mode={sidebarMode}
              onModeChange={setSidebarMode}
              onLogout={handleLogout}
            />
          </div>
        )}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {/* pb-24 no mobile: espaço para a barra de navegação inferior. */}
          <div className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-6">
            <Outlet />
          </div>
        </main>
        {user && <MobileNav user={user} onLogout={handleLogout} />}
      </div>
    </>
  );
}
