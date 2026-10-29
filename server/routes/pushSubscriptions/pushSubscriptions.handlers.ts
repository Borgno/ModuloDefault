import type { RouteHandler } from "@hono/zod-openapi";
import { removeSubscription, saveSubscription } from "../../services/notifications/push.service";
import type { HonoEnv } from "../../types";
import type {
  createPushSubscriptionRoute,
  deletePushSubscriptionRoute,
} from "./pushSubscriptions.routes";

export const createPushSubscriptionHandler: RouteHandler<
  typeof createPushSubscriptionRoute,
  HonoEnv
> = async (c) => {
  const saved = await saveSubscription(c.get("user").id, c.get("session"), c.req.valid("json"));
  c.header("Location", `/api/v1/pushSubscriptions/${saved.id}`);
  return c.json(saved, 201);
};

export const deletePushSubscriptionHandler: RouteHandler<
  typeof deletePushSubscriptionRoute,
  HonoEnv
> = async (c) => {
  await removeSubscription(c.get("user").id, c.req.valid("param").id);
  return c.body(null, 204);
};
