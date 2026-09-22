import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth, requireRole } from "../../middleware/auth";
import { UserStatsSchema } from "./userStats.schemas";

export const getUserStatsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Users"],
  summary: "Números de usuários para o dashboard",
  middleware: [requireAuth(), requireRole("admin")] as const,
  responses: {
    200: { description: "OK", content: { "application/json": { schema: UserStatsSchema } } },
    ...problemResponses(401, 403),
  },
});
