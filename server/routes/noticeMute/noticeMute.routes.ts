import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";
import { NoticeMuteSchema, UpdateNoticeMuteSchema } from "../notifications/notifications.schemas";

export const getNoticeMuteRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Notifications"],
  summary: "Se os avisos do sistema do usuário estão silenciados, e até quando",
  middleware: [requireAuth()] as const,
  responses: {
    200: { description: "OK", content: { "application/json": { schema: NoticeMuteSchema } } },
    ...problemResponses(401, 403),
  },
});

export const putNoticeMuteRoute = createRoute({
  method: "put",
  path: "/",
  tags: ["Notifications"],
  summary: "Silencia os avisos do sistema por 8 horas, 1 semana ou sempre, ou volta a avisar",
  middleware: [requireAuth()] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: UpdateNoticeMuteSchema } },
    },
  },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: NoticeMuteSchema } } },
    ...problemResponses(400, 401, 403, 422),
  },
});
