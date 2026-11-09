import type { RouteHandler } from "@hono/zod-openapi";
import { getVapidKeys } from "../../services/notifications/push.service";
import type { HonoEnv } from "../../types";
import type { getPushKeyRoute } from "./pushKey.routes";

export const getPushKeyHandler: RouteHandler<typeof getPushKeyRoute, HonoEnv> = async (c) => {
  const { publicKey } = await getVapidKeys();
  return c.json({ publicKey }, 200);
};
