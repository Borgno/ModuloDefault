import { z } from "@hono/zod-openapi";
import { RoleSchema } from "../users/users.schemas";

export const UserStatsSchema = z
  .object({
    total: z.number().int(),
    active: z.number().int(),
    inactive: z.number().int(),
    pendingPasswordChange: z.number().int(),
    byRole: z.array(z.object({ role: RoleSchema, count: z.number().int() })),
    recentLogins: z.array(
      z.object({
        id: z.uuid(),
        fullName: z.string(),
        email: z.email(),
        lastLoginAt: z.iso.datetime(),
      }),
    ),
  })
  .openapi("UserStats");
