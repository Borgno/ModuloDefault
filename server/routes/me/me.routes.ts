import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";
import { UserSchema } from "../users/users.schemas";
import { ChangePasswordSchema, UpdateMeSchema } from "./me.schemas";

export const getMeRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Me"],
  summary: "Usuário da sessão",
  middleware: [requireAuth({ allowPendingPasswordChange: true })] as const,
  responses: {
    200: { description: "OK", content: { "application/json": { schema: UserSchema } } },
    ...problemResponses(401),
  },
});

export const updateMeRoute = createRoute({
  method: "patch",
  path: "/",
  tags: ["Me"],
  summary: "Edita o próprio nome",
  middleware: [requireAuth()] as const,
  request: {
    body: { required: true, content: { "application/json": { schema: UpdateMeSchema } } },
  },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: UserSchema } } },
    ...problemResponses(400, 401, 403, 422),
  },
});

export const changePasswordRoute = createRoute({
  method: "put",
  path: "/password",
  tags: ["Me"],
  summary: "Troca a própria senha",
  middleware: [requireAuth({ allowPendingPasswordChange: true })] as const,
  request: {
    body: { required: true, content: { "application/json": { schema: ChangePasswordSchema } } },
  },
  responses: {
    204: { description: "Senha trocada" },
    ...problemResponses(400, 401, 422),
  },
});
