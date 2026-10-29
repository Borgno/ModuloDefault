import { createRouter } from "../../lib/router";
import {
  createConversationHandler,
  createMessageHandler,
  deleteReactionHandler,
  getConversationHandler,
  listConversationsHandler,
  listMessagesHandler,
  putReactionHandler,
  updateConversationHandler,
} from "./conversations.handlers";
import {
  createConversationRoute,
  createMessageRoute,
  deleteReactionRoute,
  getConversationRoute,
  listConversationsRoute,
  listMessagesRoute,
  putReactionRoute,
  updateConversationRoute,
} from "./conversations.routes";

const conversations = createRouter();
conversations.openapi(listConversationsRoute, listConversationsHandler);
conversations.openapi(createConversationRoute, createConversationHandler);
conversations.openapi(getConversationRoute, getConversationHandler);
conversations.openapi(updateConversationRoute, updateConversationHandler);
conversations.openapi(listMessagesRoute, listMessagesHandler);
conversations.openapi(createMessageRoute, createMessageHandler);
conversations.openapi(putReactionRoute, putReactionHandler);
conversations.openapi(deleteReactionRoute, deleteReactionHandler);

export default conversations;
