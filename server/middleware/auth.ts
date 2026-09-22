import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { ApiProblem } from "../lib/problem";
import { resolveSession } from "../services/auth/auth.service";
import { SESSION_COOKIE } from "../lib/sessionCookie";
import type { RoleCode } from "../services/users/users.service";
import type { HonoEnv } from "../types";

type RequireAuthOptions = {
  // Rotas que o usuário com troca de senha pendente ainda pode usar (ver a si mesmo, trocar a senha).
  allowPendingPasswordChange?: boolean;
};

export function requireAuth(options: RequireAuthOptions = {}) {
  return createMiddleware<HonoEnv>(async (c, next) => {
    const user = resolveSession(getCookie(c, SESSION_COOKIE));
    if (!user) throw new ApiProblem(401, "UNAUTHENTICATED", "Sessão ausente ou expirada.");

    if (user.mustChangePassword && !options.allowPendingPasswordChange) {
      throw new ApiProblem(403, "PASSWORD_CHANGE_REQUIRED", "Troque a senha antes de continuar.");
    }

    c.set("user", user);
    await next();
  });
}

// Usar depois do requireAuth: middleware: [requireAuth(), requireRole("admin")].
export function requireRole(role: RoleCode) {
  return createMiddleware<HonoEnv>(async (c, next) => {
    if (c.get("user").role !== role) {
      throw new ApiProblem(403, "FORBIDDEN", "Você não tem permissão para esta ação.");
    }
    await next();
  });
}
