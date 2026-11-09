import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";
import {
  CreatePushSubscriptionSchema,
  PushSubscriptionIdParamSchema,
  PushSubscriptionSchema,
} from "./pushSubscriptions.schemas";

export const createPushSubscriptionRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Notifications"],
  summary: "Inscreve este navegador no Web Push, preso à sessão atual",
  description:
    "O mesmo endpoint inscrito de novo é atualizado, e passa a ser do usuário da sessão.",
  middleware: [requireAuth()] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreatePushSubscriptionSchema } },
    },
  },
  responses: {
    201: {
      description: "Inscrito",
      content: { "application/json": { schema: PushSubscriptionSchema } },
    },
    ...problemResponses(400, 401, 403, 422),
  },
});

export const deletePushSubscriptionRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Notifications"],
  summary: "Cancela a inscrição de Web Push deste navegador",
  middleware: [requireAuth()] as const,
  request: { params: PushSubscriptionIdParamSchema },
  responses: {
    204: { description: "Cancelada" },
    ...problemResponses(401, 403, 404, 422),
  },
});
