import { randomUUID } from "node:crypto";
import {
  store,
  type ConversationRecord,
  type MemberStateRecord,
  type MessageRecord,
} from "../../lib/memoryStore";
import { ApiProblem } from "../../lib/problem";
import { matchesTerm, parseSearch } from "../../lib/search";
import { isMuted, muteUntil, type MuteOption } from "../notifications/mute";
import {
  messageNotification,
  reactionNotification,
  SQUELCH_MS,
} from "../../../shared/notificationText";
import { pushToClosedBrowsers, squelched } from "../notifications/push.service";
import { sendToUser } from "../notifications/stream.service";
import { paginate } from "../pagination";

// Conversas entre os usuários do app: de duas pessoas ou em grupo. Não lidas, marcar como não lida,
// silenciar e arquivar são de cada pessoa (MemberStateRecord) e valem só para ela.

export type ChatMember = { id: string; fullName: string };

export type PublicMessage = {
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

// A conversa como uma pessoa vê: nome, não lidas e o que ela fez nela.
export type ConversationSummary = {
  id: string;
  kind: "direct" | "group";
  // Grupo: o nome dele. Duas pessoas: o nome da outra.
  name: string;
  members: ChatMember[];
  unreadCount: number;
  markedUnread: boolean;
  // Entre as não lidas há menção a ela (ou a todos) ou resposta a uma mensagem dela.
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
  // Reação de outra pessoa a uma mensagem dela, mais nova que a última mensagem: vira a prévia.
  lastReaction: { authorName: string; emoji: string; text: string; createdAt: string } | null;
  lastActivityAt: string;
};

const MAX_MESSAGES_PAGE = 100;

const userName = (id: string) => store.users.get(id)?.fullName ?? "Usuário removido";

const stateKey = (conversationId: string, userId: string) => `${conversationId}:${userId}`;

function memberState(conversationId: string, userId: string): MemberStateRecord {
  const key = stateKey(conversationId, userId);
  let state = store.memberStates.get(key);
  if (!state) {
    state = {
      conversationId,
      userId,
      lastReadSeq: 0,
      markedUnread: false,
      mutedUntil: null,
      mutedForever: false,
      archived: false,
      lastReaction: null,
    };
    store.memberStates.set(key, state);
  }
  return state;
}

const messagesOf = (conversationId: string) => store.messages.get(conversationId) ?? [];

const muteOf = (state: MemberStateRecord) =>
  state.mutedForever ? { until: null } : state.mutedUntil ? { until: state.mutedUntil } : null;

// Mensagem dirigida a esta pessoa: marcou ela (ou todos) ou respondeu uma mensagem dela.
function mentionsUser(message: MessageRecord, userId: string) {
  return message.mentionIds.includes(userId) || message.mentionsAll;
}

function repliesToUser(message: MessageRecord, userId: string) {
  if (!message.replyToId) return false;
  return (
    messagesOf(message.conversationId).find((m) => m.id === message.replyToId)?.authorId === userId
  );
}

function unreadMessages(conversationId: string, state: MemberStateRecord) {
  return messagesOf(conversationId).filter(
    (m) => m.seq > state.lastReadSeq && m.authorId !== state.userId,
  );
}

export function toPublicMessage(message: MessageRecord): PublicMessage {
  const replied = message.replyToId
    ? messagesOf(message.conversationId).find((m) => m.id === message.replyToId)
    : undefined;
  return {
    id: message.id,
    conversationId: message.conversationId,
    seq: message.seq,
    authorId: message.authorId,
    authorName: userName(message.authorId),
    text: message.text,
    replyTo: replied
      ? {
          id: replied.id,
          authorId: replied.authorId,
          authorName: userName(replied.authorId),
          text: replied.text,
        }
      : null,
    mentionIds: message.mentionIds,
    mentionsAll: message.mentionsAll,
    reactions: Object.entries(message.reactions).map(([userId, emoji]) => ({
      userId,
      userName: userName(userId),
      emoji,
    })),
    createdAt: message.createdAt.toISOString(),
  };
}

export function toSummary(conversation: ConversationRecord, userId: string): ConversationSummary {
  const state = memberState(conversation.id, userId);
  const unread = unreadMessages(conversation.id, state);
  const messages = messagesOf(conversation.id);
  const last = messages.at(-1);
  const mute = muteOf(state);
  const muted = isMuted(mute);
  const reaction = state.lastReaction;
  const reactedMessage = reaction ? messages.find((m) => m.id === reaction.messageId) : undefined;
  const reactionIsLatest =
    reaction && reactedMessage && (!last || reaction.createdAt >= last.createdAt);
  const others = conversation.memberIds.filter((id) => id !== userId);
  return {
    id: conversation.id,
    kind: conversation.kind,
    name:
      conversation.kind === "group"
        ? (conversation.name ?? "Grupo")
        : userName(others[0] ?? userId),
    members: conversation.memberIds.map((id) => ({ id, fullName: userName(id) })),
    unreadCount: unread.length,
    markedUnread: state.markedUnread,
    mentioned: unread.some((m) => mentionsUser(m, userId) || repliesToUser(m, userId)),
    muted,
    mutedUntil: muted ? (mute?.until?.toISOString() ?? null) : null,
    archived: state.archived,
    lastMessage: last
      ? {
          id: last.id,
          authorId: last.authorId,
          authorName: userName(last.authorId),
          text: last.text,
          createdAt: last.createdAt.toISOString(),
        }
      : null,
    lastReaction:
      reactionIsLatest && reaction && reactedMessage
        ? {
            authorName: userName(reaction.authorId),
            emoji: reaction.emoji,
            text: reactedMessage.text,
            createdAt: reaction.createdAt.toISOString(),
          }
        : null,
    lastActivityAt: (reactionIsLatest && reaction
      ? reaction.createdAt
      : conversation.lastMessageAt
    ).toISOString(),
  };
}

function getMemberConversation(userId: string, id: string) {
  const conversation = store.conversations.get(id);
  if (!conversation || !conversation.memberIds.includes(userId)) {
    throw new ApiProblem(404, "CONVERSATION_NOT_FOUND", "Conversa não encontrada.");
  }
  return conversation;
}

// Cada pessoa recebe a conversa como ela vê.
function broadcastConversation(conversation: ConversationRecord, userIds = conversation.memberIds) {
  for (const id of userIds) {
    sendToUser(id, { type: "conversation", data: { conversation: toSummary(conversation, id) } });
  }
}

// --- Lista e conversa -------------------------------------------------------------------------

// "all": as não arquivadas; "unread": não arquivadas com não lida ou marcadas; "archived".
export const CONVERSATION_FILTERS = ["all", "unread", "archived"] as const;
export type ConversationFilter = (typeof CONVERSATION_FILTERS)[number];

export type ListConversationsQuery = {
  search?: string;
  filter: ConversationFilter;
  page: number;
  pageSize: number;
};

// Conversas que contam no "(N)" da aba, como no WhatsApp Web: com mensagem não lida, fora as
// arquivadas e as silenciadas (silenciada com menção entra). Só "marcada como não lida" não conta.
export function isCountedUnread(summary: ConversationSummary) {
  return summary.unreadCount > 0 && !summary.archived && (!summary.muted || summary.mentioned);
}

export function listConversations(userId: string, query: ListConversationsQuery) {
  const { text } = parseSearch(query.search, []);
  const all = [...store.conversations.values()]
    .filter((c) => c.memberIds.includes(userId))
    .map((c) => toSummary(c, userId));
  const filtered = all
    .filter((c) => !text || matchesTerm(`${c.name} ${c.lastMessage?.text ?? ""}`, text))
    .filter((c) => {
      if (query.filter === "archived") return c.archived;
      if (c.archived) return false;
      return query.filter === "all" || c.unreadCount > 0 || c.markedUnread;
    })
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  const page = paginate(filtered, query.page, query.pageSize);
  return {
    data: page.data,
    meta: {
      ...page.meta,
      unreadConversations: all.filter(isCountedUnread).length,
      archivedUnread: all.filter((c) => c.archived && c.unreadCount > 0).length,
    },
  };
}

export function getConversation(userId: string, id: string) {
  return toSummary(getMemberConversation(userId, id), userId);
}

function activeUser(id: string) {
  const user = store.users.get(id);
  if (!user || !user.active) {
    throw new ApiProblem(422, "MEMBER_NOT_FOUND", "Pessoa não encontrada ou desativada.", {
      errors: [{ field: "memberIds", message: "Pessoa não encontrada ou desativada." }],
    });
  }
  return user;
}

export type CreateConversationInput =
  { kind: "direct"; memberId: string } | { kind: "group"; name: string; memberIds: string[] };

// Conversa de duas pessoas é uma só: pedir de novo devolve a que existe (`created` false).
export function createConversation(userId: string, input: CreateConversationInput) {
  if (input.kind === "direct") {
    if (input.memberId === userId) {
      throw new ApiProblem(422, "SELF_CONVERSATION", "Escolha outra pessoa.", {
        errors: [{ field: "memberId", message: "Escolha outra pessoa." }],
      });
    }
    activeUser(input.memberId);
    const existing = [...store.conversations.values()].find(
      (c) =>
        c.kind === "direct" && c.memberIds.includes(userId) && c.memberIds.includes(input.memberId),
    );
    if (existing) return { conversation: toSummary(existing, userId), created: false };
  }

  const memberIds =
    input.kind === "direct"
      ? [userId, input.memberId]
      : [userId, ...new Set(input.memberIds.filter((id) => id !== userId))];
  if (input.kind === "group") memberIds.slice(1).forEach(activeUser);
  if (memberIds.length < 2) {
    throw new ApiProblem(422, "GROUP_WITHOUT_MEMBERS", "Escolha ao menos uma pessoa.", {
      errors: [{ field: "memberIds", message: "Escolha ao menos uma pessoa." }],
    });
  }

  const now = new Date();
  const conversation: ConversationRecord = {
    id: randomUUID(),
    kind: input.kind,
    name: input.kind === "group" ? input.name.trim() : null,
    memberIds,
    createdById: userId,
    createdAt: now,
    lastMessageAt: now,
  };
  store.conversations.set(conversation.id, conversation);
  store.messages.set(conversation.id, []);
  broadcastConversation(conversation);
  return { conversation: toSummary(conversation, userId), created: true };
}

// Ler, marcar como não lida, silenciar e arquivar: só para quem fez. As outras abas e navegadores
// dela ficam sabendo (a notificação do sistema da conversa fecha ao ler).
export function updateConversation(
  userId: string,
  id: string,
  patch: { read?: boolean; readUntil?: number; mute?: MuteOption | null; archived?: boolean },
) {
  const conversation = getMemberConversation(userId, id);
  const state = memberState(id, userId);
  if (patch.read === true) {
    // Lê até a última mensagem que a pessoa viu, não até a que chegou depois. Só avança: uma aba
    // atrasada não devolve mensagens como não lidas.
    const lastSeq = messagesOf(id).at(-1)?.seq ?? 0;
    const until = Math.min(patch.readUntil ?? lastSeq, lastSeq);
    state.lastReadSeq = Math.max(state.lastReadSeq, until);
    state.markedUnread = false;
    state.lastReaction = null;
  }
  if (patch.read === false) state.markedUnread = true;
  if (patch.mute !== undefined) {
    const until = patch.mute ? muteUntil(patch.mute).until : null;
    state.mutedForever = patch.mute === "always";
    state.mutedUntil = patch.mute && until ? until : null;
  }
  if (patch.archived !== undefined) state.archived = patch.archived;
  broadcastConversation(conversation, [userId]);
  return toSummary(conversation, userId);
}

// --- Mensagens --------------------------------------------------------------------------------

// Da mais antiga para a mais nova. `before`: só as anteriores a esta seq (página mais antiga).
export function listMessages(
  userId: string,
  conversationId: string,
  query: { before?: number; limit: number },
) {
  getMemberConversation(userId, conversationId);
  const all = messagesOf(conversationId).filter(
    (m) => query.before === undefined || m.seq < query.before,
  );
  const limit = Math.min(query.limit, MAX_MESSAGES_PAGE);
  const page = all.slice(-limit);
  return { data: page.map(toPublicMessage), meta: { hasMore: all.length > page.length } };
}

export type SendMessageInput = {
  text: string;
  replyToId?: string | null;
  mentionIds?: string[];
  mentionsAll?: boolean;
};

export function sendMessage(userId: string, conversationId: string, input: SendMessageInput) {
  const conversation = getMemberConversation(userId, conversationId);
  const messages = messagesOf(conversationId);
  if (input.replyToId && !messages.some((m) => m.id === input.replyToId)) {
    throw new ApiProblem(422, "REPLY_NOT_FOUND", "A mensagem citada não existe nesta conversa.", {
      errors: [{ field: "replyToId", message: "A mensagem citada não existe nesta conversa." }],
    });
  }
  const message: MessageRecord = {
    id: randomUUID(),
    conversationId,
    seq: (messages.at(-1)?.seq ?? 0) + 1,
    authorId: userId,
    text: input.text.trim(),
    replyToId: input.replyToId ?? null,
    // Só quem está na conversa, e "@todos" só em grupo.
    mentionIds: [...new Set(input.mentionIds ?? [])].filter(
      (id) => id !== userId && conversation.memberIds.includes(id),
    ),
    mentionsAll: conversation.kind === "group" && !!input.mentionsAll,
    reactions: {},
    createdAt: new Date(),
  };
  messages.push(message);
  store.messages.set(conversationId, messages);
  conversation.lastMessageAt = message.createdAt;

  // Responder lê a conversa só para quem respondeu.
  const own = memberState(conversationId, userId);
  own.lastReadSeq = message.seq;
  own.markedUnread = false;
  own.lastReaction = null;

  const published = toPublicMessage(message);
  for (const memberId of conversation.memberIds) {
    sendToUser(memberId, {
      type: "message",
      data: { message: published, conversation: toSummary(conversation, memberId) },
    });
  }
  for (const memberId of conversation.memberIds) {
    if (memberId !== userId) alertMessage(conversation, message, memberId);
  }
  return published;
}

// Push da mensagem para os navegadores fechados da pessoa. Silenciada ou arquivada só avisa
// mensagem dirigida a ela; grupo agitado fica 15 s sem avisar.
function alertMessage(conversation: ConversationRecord, message: MessageRecord, memberId: string) {
  const summary = toSummary(conversation, memberId);
  const isGroup = conversation.kind === "group";
  const mentionsMe = mentionsUser(message, memberId);
  const repliesToMe = repliesToUser(message, memberId);
  if ((summary.muted || summary.archived) && !mentionsMe && !repliesToMe) return;
  if (isGroup && squelched(`${memberId}:${conversation.id}`, SQUELCH_MS)) return;
  void pushToClosedBrowsers(memberId, isGroup ? "groups" : "messages", (prefs) => ({
    ...messageNotification({
      conversationName: summary.name,
      isGroup,
      senderName: userName(message.authorId),
      text: message.text,
      previews: prefs.previews,
      unreadCount: summary.unreadCount,
      mentionsMe: isGroup && mentionsMe,
      repliesToMe: isGroup && repliesToMe,
    }),
    tag: conversation.id,
    kind: "conversation",
    url: `/chat?c=${conversation.id}`,
  })).catch((error: unknown) => console.error("[push] falha ao avisar a mensagem", error));
}

// Uma reação por pessoa: `emoji` null tira a dela.
export function setReaction(
  userId: string,
  conversationId: string,
  messageId: string,
  emoji: string | null,
) {
  const conversation = getMemberConversation(userId, conversationId);
  const message = messagesOf(conversationId).find((m) => m.id === messageId);
  if (!message) throw new ApiProblem(404, "MESSAGE_NOT_FOUND", "Mensagem não encontrada.");
  if (emoji) message.reactions[userId] = emoji;
  else delete message.reactions[userId];

  // Reação de outra pessoa a uma mensagem do autor: vira a prévia da conversa para ele e o avisa.
  const toAuthor = emoji && message.authorId !== userId;
  const authorState = memberState(conversationId, message.authorId);
  if (toAuthor) {
    authorState.lastReaction = { authorId: userId, emoji, messageId, createdAt: new Date() };
  } else if (
    authorState.lastReaction?.authorId === userId &&
    authorState.lastReaction.messageId === messageId
  ) {
    authorState.lastReaction = null;
  }

  const published = toPublicMessage(message);
  for (const memberId of conversation.memberIds) {
    const reaction =
      toAuthor && memberId === message.authorId
        ? { authorName: userName(userId), emoji, text: message.text }
        : null;
    sendToUser(memberId, {
      type: "reaction",
      data: { message: published, conversation: toSummary(conversation, memberId), reaction },
    });
  }
  if (toAuthor) alertReaction(conversation, message, userId, emoji);
  return published;
}

// Reação avisa como mensagem, mas não fura silêncio nem arquivo.
function alertReaction(
  conversation: ConversationRecord,
  message: MessageRecord,
  reactorId: string,
  emoji: string,
) {
  const authorId = message.authorId;
  const summary = toSummary(conversation, authorId);
  if (summary.muted || summary.archived) return;
  const isGroup = conversation.kind === "group";
  if (isGroup && squelched(`${authorId}:${conversation.id}`, SQUELCH_MS)) return;
  void pushToClosedBrowsers(authorId, isGroup ? "groups" : "messages", (prefs) => ({
    ...reactionNotification(
      {
        conversationName: summary.name,
        authorName: userName(reactorId),
        isGroup,
        emoji,
        text: message.text,
      },
      prefs.previews,
    ),
    tag: conversation.id,
    kind: "conversation",
    url: `/chat?c=${conversation.id}`,
  })).catch((error: unknown) => console.error("[push] falha ao avisar a reação", error));
}

// --- Pessoas para conversar -------------------------------------------------------------------

export function listContacts(
  userId: string,
  query: { search?: string; page: number; pageSize: number },
) {
  const { text } = parseSearch(query.search, []);
  const people = [...store.users.values()]
    .filter((u) => u.active && u.id !== userId)
    .filter((u) => !text || matchesTerm(`${u.fullName} ${u.email}`, text))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"))
    .map((u) => ({ id: u.id, fullName: u.fullName, email: u.email }));
  return paginate(people, query.page, query.pageSize);
}
