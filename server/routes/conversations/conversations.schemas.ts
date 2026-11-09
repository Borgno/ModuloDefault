import { z } from "@hono/zod-openapi";
import { PageMetaSchema, PageQuerySchema, searchSchema } from "../../schemas/common";
import { CONVERSATION_FILTERS } from "../../services/chat/chat.service";
import { MUTE_OPTIONS } from "../../services/notifications/mute";

const ChatMemberSchema = z.object({ id: z.uuid(), fullName: z.string() }).openapi("ChatMember");

export const ConversationSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(["direct", "group"]),
    name: z.string().openapi({ description: "Grupo: o nome dele. Duas pessoas: o nome da outra." }),
    members: z.array(ChatMemberSchema),
    unreadCount: z.number().int(),
    markedUnread: z.boolean().openapi({ description: "Marcada como não lida: só a bolinha." }),
    mentioned: z
      .boolean()
      .openapi({ description: "Entre as não lidas há menção a você, a todos ou resposta a você." }),
    muted: z.boolean(),
    mutedUntil: z.iso
      .datetime()
      .nullable()
      .openapi({ description: "Até quando está silenciada. null com muted: para sempre." }),
    archived: z.boolean(),
    lastMessage: z
      .object({
        id: z.uuid(),
        authorId: z.uuid(),
        authorName: z.string(),
        text: z.string(),
        createdAt: z.iso.datetime(),
      })
      .nullable(),
    lastReaction: z
      .object({
        authorName: z.string(),
        emoji: z.string(),
        text: z.string(),
        createdAt: z.iso.datetime(),
      })
      .nullable()
      .openapi({
        description: "Reação de outra pessoa a uma mensagem sua, mais nova que a última.",
      }),
    lastActivityAt: z.iso.datetime(),
  })
  .openapi("Conversation");

export const ConversationIdParamSchema = z.object({
  id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

export const MessageIdParamSchema = ConversationIdParamSchema.extend({
  messageId: z.uuid().openapi({ param: { name: "messageId", in: "path" } }),
});

export const ListConversationsQuerySchema = PageQuerySchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(50).openapi({ example: 50 }),
  search: searchSchema([]),
  filter: z.enum(CONVERSATION_FILTERS).default("all").openapi({
    description: "all: as não arquivadas; unread: não lidas ou marcadas; archived: as arquivadas.",
  }),
});

export const ConversationListSchema = z
  .object({
    data: z.array(ConversationSchema),
    meta: PageMetaSchema.extend({
      unreadConversations: z
        .number()
        .int()
        .openapi({ description: "Conversas que contam no (N) da aba." }),
      archivedUnread: z.number().int(),
    }),
  })
  .openapi("ConversationList");

export const CreateConversationSchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("direct"), memberId: z.uuid() }),
    z.object({
      kind: z.literal("group"),
      name: z.string().trim().min(1, "Dê um nome ao grupo.").max(80),
      memberIds: z.array(z.uuid()).min(1, "Escolha ao menos uma pessoa.").max(100),
    }),
  ])
  .openapi("CreateConversation");

export const UpdateConversationSchema = z
  .object({
    read: z.boolean().openapi({ description: "true lê; false marca como não lida." }),
    readUntil: z.number().int().min(0).openapi({
      description:
        "Com read true: lê até esta seq (a última mensagem que estava na tela). Só avança. Sem ele, lê tudo.",
    }),
    mute: z
      .enum(MUTE_OPTIONS)
      .nullable()
      .openapi({ description: "8h, 1w (uma semana) ou always. null volta a avisar." }),
    archived: z.boolean(),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Informe read, mute ou archived.")
  .openapi("UpdateConversation");

export const MessageSchema = z
  .object({
    id: z.uuid(),
    conversationId: z.uuid(),
    seq: z.number().int().openapi({ description: "Ordem dentro da conversa." }),
    authorId: z.uuid(),
    authorName: z.string(),
    text: z.string(),
    replyTo: z
      .object({ id: z.uuid(), authorId: z.uuid(), authorName: z.string(), text: z.string() })
      .nullable(),
    mentionIds: z.array(z.uuid()),
    mentionsAll: z.boolean(),
    reactions: z.array(z.object({ userId: z.uuid(), userName: z.string(), emoji: z.string() })),
    createdAt: z.iso.datetime(),
  })
  .openapi("Message");

export const ListMessagesQuerySchema = z.object({
  before: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .openapi({ description: "Só as mensagens anteriores a esta seq (página mais antiga)." }),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const MessageListSchema = z
  .object({
    data: z.array(MessageSchema),
    meta: z.object({ hasMore: z.boolean() }),
  })
  .openapi("MessageList");

export const CreateMessageSchema = z
  .object({
    text: z.string().trim().min(1, "Escreva a mensagem.").max(4000),
    replyToId: z.uuid().nullable().optional(),
    mentionIds: z.array(z.uuid()).max(100).optional(),
    mentionsAll: z.boolean().optional().openapi({ description: "@todos, só em grupo." }),
  })
  .openapi("CreateMessage");

export const PutReactionSchema = z
  .object({ emoji: z.string().min(1).max(16) })
  .openapi("PutReaction");

export const ContactListSchema = z
  .object({
    data: z.array(z.object({ id: z.uuid(), fullName: z.string(), email: z.string() })),
    meta: PageMetaSchema,
  })
  .openapi("ContactList");

export const ListContactsQuerySchema = PageQuerySchema.extend({ search: searchSchema([]) });
