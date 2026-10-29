import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";
import {
  ConversationIdParamSchema,
  ConversationListSchema,
  ConversationSchema,
  CreateConversationSchema,
  CreateMessageSchema,
  ListConversationsQuerySchema,
  ListMessagesQuerySchema,
  MessageIdParamSchema,
  MessageListSchema,
  MessageSchema,
  PutReactionSchema,
  UpdateConversationSchema,
} from "./conversations.schemas";

const json = <T>(schema: T) => ({ "application/json": { schema } });

export const listConversationsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Chat"],
  summary: "Conversas do usuário, da atividade mais recente para a mais antiga",
  middleware: [requireAuth()] as const,
  request: { query: ListConversationsQuerySchema },
  responses: {
    200: { description: "OK", content: json(ConversationListSchema) },
    ...problemResponses(401, 403, 422),
  },
});

export const createConversationRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Chat"],
  summary: "Abre uma conversa com uma pessoa (devolve a que existe) ou cria um grupo",
  middleware: [requireAuth()] as const,
  request: { body: { required: true, content: json(CreateConversationSchema) } },
  responses: {
    200: { description: "Conversa com essa pessoa já existia", content: json(ConversationSchema) },
    201: { description: "Criada", content: json(ConversationSchema) },
    ...problemResponses(400, 401, 403, 422),
  },
});

export const getConversationRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Chat"],
  summary: "Uma conversa, como o usuário vê",
  middleware: [requireAuth()] as const,
  request: { params: ConversationIdParamSchema },
  responses: {
    200: { description: "OK", content: json(ConversationSchema) },
    ...problemResponses(401, 403, 404),
  },
});

export const updateConversationRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Chat"],
  summary: "Lê, marca como não lida, silencia ou arquiva a conversa, só para o usuário",
  middleware: [requireAuth()] as const,
  request: {
    params: ConversationIdParamSchema,
    body: { required: true, content: json(UpdateConversationSchema) },
  },
  responses: {
    200: { description: "OK", content: json(ConversationSchema) },
    ...problemResponses(400, 401, 403, 404, 422),
  },
});

export const listMessagesRoute = createRoute({
  method: "get",
  path: "/{id}/messages",
  tags: ["Chat"],
  summary: "Mensagens da conversa, da mais antiga para a mais nova, em páginas para trás",
  middleware: [requireAuth()] as const,
  request: { params: ConversationIdParamSchema, query: ListMessagesQuerySchema },
  responses: {
    200: { description: "OK", content: json(MessageListSchema) },
    ...problemResponses(401, 403, 404, 422),
  },
});

export const createMessageRoute = createRoute({
  method: "post",
  path: "/{id}/messages",
  tags: ["Chat"],
  summary: "Manda uma mensagem, com citação e menções opcionais",
  middleware: [requireAuth()] as const,
  request: {
    params: ConversationIdParamSchema,
    body: { required: true, content: json(CreateMessageSchema) },
  },
  responses: {
    201: { description: "Enviada", content: json(MessageSchema) },
    ...problemResponses(400, 401, 403, 404, 422),
  },
});

export const putReactionRoute = createRoute({
  method: "put",
  path: "/{id}/messages/{messageId}/myReaction",
  tags: ["Chat"],
  summary: "Põe ou troca a reação do usuário na mensagem",
  middleware: [requireAuth()] as const,
  request: {
    params: MessageIdParamSchema,
    body: { required: true, content: json(PutReactionSchema) },
  },
  responses: {
    200: { description: "OK", content: json(MessageSchema) },
    ...problemResponses(400, 401, 403, 404, 422),
  },
});

export const deleteReactionRoute = createRoute({
  method: "delete",
  path: "/{id}/messages/{messageId}/myReaction",
  tags: ["Chat"],
  summary: "Tira a reação do usuário da mensagem",
  middleware: [requireAuth()] as const,
  request: { params: MessageIdParamSchema },
  responses: {
    204: { description: "Tirada" },
    ...problemResponses(401, 403, 404),
  },
});
