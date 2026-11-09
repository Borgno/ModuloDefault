// Espelha server/routes/conversations/conversations.schemas.ts.
export type ChatMember = { id: string; fullName: string };

export type Conversation = {
  id: string;
  kind: "direct" | "group";
  // Grupo: o nome dele. Duas pessoas: o nome da outra.
  name: string;
  members: ChatMember[];
  unreadCount: number;
  // Marcada como não lida: só a bolinha.
  markedUnread: boolean;
  // Entre as não lidas há menção a você, a todos ou resposta a você.
  mentioned: boolean;
  muted: boolean;
  // Null com `muted`: para sempre.
  mutedUntil: string | null;
  archived: boolean;
  lastMessage: {
    id: string;
    authorId: string;
    authorName: string;
    text: string;
    createdAt: string;
  } | null;
  // Reação de outra pessoa a uma mensagem sua, mais nova que a última mensagem.
  lastReaction: { authorName: string; emoji: string; text: string; createdAt: string } | null;
  lastActivityAt: string;
};

export type ConversationFilter = "all" | "unread" | "archived";

export type ConversationPage = {
  data: Conversation[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    // Conversas que contam no "(N)" da aba.
    unreadConversations: number;
    archivedUnread: number;
  };
};

export type Message = {
  id: string;
  conversationId: string;
  seq: number;
  authorId: string;
  authorName: string;
  text: string;
  replyTo: { id: string; authorId: string; authorName: string; text: string } | null;
  mentionIds: string[];
  mentionsAll: boolean;
  reactions: { userId: string; userName: string; emoji: string }[];
  createdAt: string;
};

export type MessagePage = { data: Message[]; meta: { hasMore: boolean } };

export type Contact = { id: string; fullName: string; email: string };
