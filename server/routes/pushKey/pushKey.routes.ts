import { createRoute, z } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";

export const PushKeySchema = z
  .object({
    publicKey: z.string().openapi({ description: "Chave pública VAPID, em base64url." }),
  })
  .openapi("PushKey");

export const getPushKeyRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Notifications"],
  summary: "Chave pública com que o navegador se inscreve no Web Push",
  middleware: [requireAuth()] as const,
  responses: {
    200: { description: "OK", content: { "application/json": { schema: PushKeySchema } } },
    ...problemResponses(401, 403),
  },
});
