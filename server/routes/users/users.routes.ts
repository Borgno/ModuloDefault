import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  CreateUserSchema,
  ListUsersQuerySchema,
  PasswordResetSchema,
  UpdateUserSchema,
  UserIdParamSchema,
  UserListSchema,
  UserSchema,
} from "./users.schemas";

const adminOnly = [requireAuth(), requireRole("admin")];

export const listUsersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Users"],
  summary: "Lista usuários, com busca, filtros, ordenação e paginação na query",
  middleware: adminOnly,
  request: { query: ListUsersQuerySchema },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: UserListSchema } } },
    ...problemResponses(401, 403, 422),
  },
});

export const createUserRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Users"],
  summary: "Cria um usuário",
  middleware: adminOnly,
  request: {
    body: { required: true, content: { "application/json": { schema: CreateUserSchema } } },
  },
  responses: {
    201: { description: "Criado", content: { "application/json": { schema: UserSchema } } },
    ...problemResponses(400, 401, 403, 409, 422),
  },
});

export const getUserRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Users"],
  summary: "Detalhe de um usuário",
  middleware: adminOnly,
  request: { params: UserIdParamSchema },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: UserSchema } } },
    ...problemResponses(401, 403, 404, 422),
  },
});

export const updateUserRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Users"],
  summary: "Edita nome e role, e desativa ou reativa ({ active: false })",
  middleware: adminOnly,
  request: {
    params: UserIdParamSchema,
    body: { required: true, content: { "application/json": { schema: UpdateUserSchema } } },
  },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: UserSchema } } },
    ...problemResponses(400, 401, 403, 404, 409, 422),
  },
});

export const createPasswordResetRoute = createRoute({
  method: "post",
  path: "/{id}/passwordResets",
  tags: ["Users"],
  summary: "Gera uma senha temporária e obriga a troca no próximo login",
  middleware: adminOnly,
  request: { params: UserIdParamSchema },
  responses: {
    201: {
      description: "Senha temporária gerada",
      content: { "application/json": { schema: PasswordResetSchema } },
    },
    ...problemResponses(401, 403, 404, 422),
  },
});
