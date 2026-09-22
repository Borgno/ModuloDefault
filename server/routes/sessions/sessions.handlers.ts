import { getConnInfo } from "@hono/node-server/conninfo";
import type { RouteHandler } from "@hono/zod-openapi";
import type { Context } from "hono";
import { login } from "../../services/auth/auth.service";
import { clearSessionCookie, setSessionCookie } from "../../lib/sessionCookie";
import type { HonoEnv } from "../../types";
import type { createSessionRoute, deleteCurrentSessionRoute } from "./sessions.routes";

// Atrás do proxy do Dokploy o IP real vem no X-Forwarded-For.
function clientIp(c: Context) {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

export const createSessionHandler: RouteHandler<typeof createSessionRoute, HonoEnv> = async (c) => {
  const { email, password } = c.req.valid("json");
  const { user, token } = await login({ email, password, ip: clientIp(c) });

  setSessionCookie(c, token);
  c.header("Location", "/api/v1/sessions/current");
  return c.json(user, 201);
};

export const deleteCurrentSessionHandler: RouteHandler<
  typeof deleteCurrentSessionRoute,
  HonoEnv
> = async (c) => {
  clearSessionCookie(c);
  return c.body(null, 204);
};
