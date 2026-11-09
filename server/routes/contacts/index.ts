import { createRouter } from "../../lib/router";
import { listContactsHandler } from "./contacts.handlers";
import { listContactsRoute } from "./contacts.routes";

const contacts = createRouter();
contacts.openapi(listContactsRoute, listContactsHandler);

export default contacts;
