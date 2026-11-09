import type { RouteHandler } from "@hono/zod-openapi";
import { setSessionCookie } from "../../lib/sessionCookie";
import { issueSessionToken } from "../../services/auth/auth.service";
import { renewSessionSubscriptions } from "../../services/notifications/push.service";
import { changeOwnPassword, updateOwnProfile } from "../../services/users/users.service";
import type { HonoEnv } from "../../types";
import type { changePasswordRoute, getMeRoute, updateMeRoute } from "./me.routes";

export const getMeHandler: RouteHandler<typeof getMeRoute, HonoEnv> = (c) => {
  return c.json(c.get("user"), 200);
};

export const updateMeHandler: RouteHandler<typeof updateMeRoute, HonoEnv> = async (c) => {
  const user = updateOwnProfile(c.get("user").id, c.req.valid("json"));
  return c.json(user, 200);
};

export const changePasswordHandler: RouteHandler<typeof changePasswordRoute, HonoEnv> = async (
  c,
) => {
  const userId = c.get("user").id;
  const session = c.get("session");
  const version = await changeOwnPassword(userId, c.req.valid("json"));
  // A troca derrubou todas as sessões do usuário, inclusive esta: reemite o cookie para quem trocou,
  // na mesma sessão, e o Web Push deste navegador continua valendo.
  setSessionCookie(c, issueSessionToken(userId, session.id));
  renewSessionSubscriptions(session.id, version);
  return c.body(null, 204);
};
