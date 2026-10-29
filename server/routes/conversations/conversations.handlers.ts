import type { RouteHandler } from "@hono/zod-openapi";
import {
  createConversation,
  getConversation,
  listConversations,
  listMessages,
  sendMessage,
  setReaction,
  updateConversation,
} from "../../services/chat/chat.service";
import type { HonoEnv } from "../../types";
import type {
  createConversationRoute,
  createMessageRoute,
  deleteReactionRoute,
  getConversationRoute,
  listConversationsRoute,
  listMessagesRoute,
  putReactionRoute,
  updateConversationRoute,
} from "./conversations.routes";

export const listConversationsHandler: RouteHandler<typeof listConversationsRoute, HonoEnv> = (
  c,
) => {
  return c.json(listConversations(c.get("user").id, c.req.valid("query")), 200);
};

export const createConversationHandler: RouteHandler<typeof createConversationRoute, HonoEnv> = (
  c,
) => {
  const { conversation, created } = createConversation(c.get("user").id, c.req.valid("json"));
  if (!created) return c.json(conversation, 200);
  c.header("Location", `/api/v1/conversations/${conversation.id}`);
  return c.json(conversation, 201);
};

export const getConversationHandler: RouteHandler<typeof getConversationRoute, HonoEnv> = (c) => {
  return c.json(getConversation(c.get("user").id, c.req.valid("param").id), 200);
};

export const updateConversationHandler: RouteHandler<typeof updateConversationRoute, HonoEnv> = (
  c,
) => {
  const { id } = c.req.valid("param");
  return c.json(updateConversation(c.get("user").id, id, c.req.valid("json")), 200);
};

export const listMessagesHandler: RouteHandler<typeof listMessagesRoute, HonoEnv> = (c) => {
  const { id } = c.req.valid("param");
  return c.json(listMessages(c.get("user").id, id, c.req.valid("query")), 200);
};

export const createMessageHandler: RouteHandler<typeof createMessageRoute, HonoEnv> = (c) => {
  const { id } = c.req.valid("param");
  return c.json(sendMessage(c.get("user").id, id, c.req.valid("json")), 201);
};

export const putReactionHandler: RouteHandler<typeof putReactionRoute, HonoEnv> = (c) => {
  const { id, messageId } = c.req.valid("param");
  return c.json(setReaction(c.get("user").id, id, messageId, c.req.valid("json").emoji), 200);
};

export const deleteReactionHandler: RouteHandler<typeof deleteReactionRoute, HonoEnv> = (c) => {
  const { id, messageId } = c.req.valid("param");
  setReaction(c.get("user").id, id, messageId, null);
  return c.body(null, 204);
};
