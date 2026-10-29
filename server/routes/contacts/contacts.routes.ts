import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";
import { ContactListSchema, ListContactsQuerySchema } from "../conversations/conversations.schemas";

export const listContactsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Chat"],
  summary: "Pessoas ativas com quem o usuário pode conversar, por nome",
  middleware: [requireAuth()] as const,
  request: { query: ListContactsQuerySchema },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: ContactListSchema } } },
    ...problemResponses(401, 403, 422),
  },
});
