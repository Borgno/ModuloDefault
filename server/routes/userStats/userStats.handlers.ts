import type { RouteHandler } from "@hono/zod-openapi";
import { getUserStats } from "../../services/users/users.service";
import type { HonoEnv } from "../../types";
import type { getUserStatsRoute } from "./userStats.routes";

export const getUserStatsHandler: RouteHandler<typeof getUserStatsRoute, HonoEnv> = (c) => {
  return c.json(getUserStats(), 200);
};
