import type { RouteHandler } from "@hono/zod-openapi";
import {
  listNotifications,
  markAllNotificationsRead,
  updateNotification,
} from "../../services/notifications/notifications.service";
import type { HonoEnv } from "../../types";
import type {
  listNotificationsRoute,
  updateNotificationRoute,
  updateNotificationsRoute,
} from "./notifications.routes";

export const listNotificationsHandler: RouteHandler<
  typeof listNotificationsRoute,
  HonoEnv
> = async (c) => {
  return c.json(await listNotifications(c.get("user").id, c.req.valid("query")), 200);
};

export const updateNotificationsHandler: RouteHandler<
  typeof updateNotificationsRoute,
  HonoEnv
> = async (c) => {
  await markAllNotificationsRead(c.get("user").id);
  return c.body(null, 204);
};

export const updateNotificationHandler: RouteHandler<
  typeof updateNotificationRoute,
  HonoEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  return c.json(updateNotification(c.get("user").id, id, c.req.valid("json")), 200);
};
