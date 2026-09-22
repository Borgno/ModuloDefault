import { createRouter } from "../../lib/router";
import { listAuditEventsHandler } from "./auditEvents.handlers";
import { listAuditEventsRoute } from "./auditEvents.routes";

const auditEvents = createRouter();
auditEvents.openapi(listAuditEventsRoute, listAuditEventsHandler);

export default auditEvents;
