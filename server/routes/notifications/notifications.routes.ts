import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";
import {
  ListNotificationsQuerySchema,
  NotificationIdParamSchema,
  NotificationListSchema,
  NotificationSchema,
  UpdateNotificationSchema,
  UpdateNotificationsSchema,
} from "./notifications.schemas";

export const listNotificationsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Notifications"],
  summary: "Notificações do usuário da sessão, mais recentes primeiro",
  middleware: [requireAuth()] as const,
  request: { query: ListNotificationsQuerySchema },
  responses: {
    200: {
      description: "OK",
      content: { "application/json": { schema: NotificationListSchema } },
    },
    ...problemResponses(401, 403, 422),
  },
});

export const updateNotificationsRoute = createRoute({
  method: "patch",
  path: "/",
  tags: ["Notifications"],
  summary: "Marca todas as notificações do usuário como lidas",
  middleware: [requireAuth()] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: UpdateNotificationsSchema } },
    },
  },
  responses: {
    204: { description: "Todas lidas" },
    ...problemResponses(400, 401, 403, 422),
  },
});

export const updateNotificationRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Notifications"],
  summary: "Marca uma notificação como lida ou não lida, ou arquiva e desarquiva",
  middleware: [requireAuth()] as const,
  request: {
    params: NotificationIdParamSchema,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateNotificationSchema } },
    },
  },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: NotificationSchema } } },
    ...problemResponses(400, 401, 403, 404, 422),
  },
});
