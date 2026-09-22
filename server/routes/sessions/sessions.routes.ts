import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { UserSchema } from "../users/users.schemas";
import { LoginSchema } from "./sessions.schemas";

export const createSessionRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Sessions"],
  summary: "Login: cria a sessão e devolve o usuário",
  request: { body: { required: true, content: { "application/json": { schema: LoginSchema } } } },
  responses: {
    201: {
      description: "Sessão criada. O cookie de sessão vem no Set-Cookie.",
      content: { "application/json": { schema: UserSchema } },
    },
    ...problemResponses(400, 401, 403, 422, 429),
  },
});

export const deleteCurrentSessionRoute = createRoute({
  method: "delete",
  path: "/current",
  tags: ["Sessions"],
  summary: "Logout: encerra a sessão atual",
  responses: {
    204: { description: "Sessão encerrada" },
  },
});
