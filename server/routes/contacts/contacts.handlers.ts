import type { RouteHandler } from "@hono/zod-openapi";
import { listContacts } from "../../services/chat/chat.service";
import type { HonoEnv } from "../../types";
import type { listContactsRoute } from "./contacts.routes";

export const listContactsHandler: RouteHandler<typeof listContactsRoute, HonoEnv> = (c) => {
  return c.json(listContacts(c.get("user").id, c.req.valid("query")), 200);
};
