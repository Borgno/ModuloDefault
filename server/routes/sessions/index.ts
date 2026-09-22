import { createRouter } from "../../lib/router";
import { createSessionHandler, deleteCurrentSessionHandler } from "./sessions.handlers";
import { createSessionRoute, deleteCurrentSessionRoute } from "./sessions.routes";

const sessions = createRouter();
sessions.openapi(createSessionRoute, createSessionHandler);
sessions.openapi(deleteCurrentSessionRoute, deleteCurrentSessionHandler);

export default sessions;
