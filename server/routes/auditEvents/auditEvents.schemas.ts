import { z } from "@hono/zod-openapi";
import { listSchema, PageQuerySchema } from "../../schemas/common";

export const ListAuditEventsQuerySchema = PageQuerySchema.extend({
  targetType: z.enum(["user"]).optional(),
  targetId: z.uuid().optional(),
});

export const AuditEventSchema = z
  .object({
    id: z.uuid(),
    action: z.string().openapi({ example: "user.roleChanged" }),
    actor: z.object({ id: z.uuid(), fullName: z.string() }).nullable(),
    targetType: z.string(),
    targetId: z.string(),
    data: z.record(z.string(), z.unknown()),
    createdAt: z.iso.datetime(),
  })
  .openapi("AuditEvent");

export const AuditEventListSchema = listSchema(AuditEventSchema).openapi("AuditEventList");
