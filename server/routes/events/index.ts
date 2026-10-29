import { createRouter } from "../../lib/router";
import { streamEventsHandler } from "./events.handlers";
import { streamEventsRoute } from "./events.routes";

const events = createRouter();
events.openapi(streamEventsRoute, streamEventsHandler);

export default events;
