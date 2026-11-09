import { createRoute, z } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";

export const streamEventsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Notifications"],
  summary: "Stream (SSE) dos eventos de notificação do usuário, enquanto a aba está aberta",
  description:
    "Eventos `notification` (nova), `read` (lidas; `ids` null = todas) e `unread` (contador), cada um com JSON no `data`. Um evento `ping` a cada 20 s mantém a conexão.",
  middleware: [requireAuth()] as const,
  request: {
    query: z.object({
      pushEndpoint: z.url().optional().openapi({
        description:
          "Inscrição de Web Push deste navegador: com a aba aberta, ele é avisado por aqui e não por push.",
      }),
    }),
  },
  responses: {
    200: {
      description: "Stream de eventos",
      content: { "text/event-stream": { schema: z.string() } },
    },
    ...problemResponses(401, 403, 422),
  },
});
