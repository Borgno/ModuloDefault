import { createRouter } from "../../lib/router";
import {
  createPushSubscriptionHandler,
  deletePushSubscriptionHandler,
} from "./pushSubscriptions.handlers";
import {
  createPushSubscriptionRoute,
  deletePushSubscriptionRoute,
} from "./pushSubscriptions.routes";

const pushSubscriptions = createRouter();
pushSubscriptions.openapi(createPushSubscriptionRoute, createPushSubscriptionHandler);
pushSubscriptions.openapi(deletePushSubscriptionRoute, deletePushSubscriptionHandler);

export default pushSubscriptions;
