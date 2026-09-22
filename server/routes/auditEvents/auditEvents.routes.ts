import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AuditEventListSchema, ListAuditEventsQuerySchema } from "./auditEvents.schemas";

export const listAuditEventsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Audit"],
  summary: "Histórico de ações, mais recentes primeiro, filtrado por alvo na query",
  middleware: [requireAuth(), requireRole("admin")] as const,
  request: { query: ListAuditEventsQuerySchema },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: AuditEventListSchema } } },
    ...problemResponses(401, 403, 422),
  },
});
