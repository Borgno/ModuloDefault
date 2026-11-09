import { createRouter } from "../../lib/router";
import {
  listNotificationsHandler,
  updateNotificationHandler,
  updateNotificationsHandler,
} from "./notifications.handlers";
import {
  listNotificationsRoute,
  updateNotificationRoute,
  updateNotificationsRoute,
} from "./notifications.routes";

const notifications = createRouter();
notifications.openapi(listNotificationsRoute, listNotificationsHandler);
notifications.openapi(updateNotificationsRoute, updateNotificationsHandler);
notifications.openapi(updateNotificationRoute, updateNotificationHandler);

export default notifications;
