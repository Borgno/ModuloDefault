import type { RouteHandler } from "@hono/zod-openapi";
import { getNoticeMute, setNoticeMute } from "../../services/notifications/notifications.service";
import type { HonoEnv } from "../../types";
import type { getNoticeMuteRoute, putNoticeMuteRoute } from "./noticeMute.routes";

export const getNoticeMuteHandler: RouteHandler<typeof getNoticeMuteRoute, HonoEnv> = (c) => {
  return c.json(getNoticeMute(c.get("user").id), 200);
};

export const putNoticeMuteHandler: RouteHandler<typeof putNoticeMuteRoute, HonoEnv> = (c) => {
  return c.json(setNoticeMute(c.get("user").id, c.req.valid("json").mute), 200);
};
