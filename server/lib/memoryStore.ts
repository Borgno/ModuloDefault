// Dados em memória. Ocupa o lugar do client do banco nesta etapa: só server/services/ importa este
// arquivo (regra do ESLint). Restart zera tudo e volta ao seed.

export const ROLES = [
  { code: "admin", name: "Administrador" },
  { code: "user", name: "Usuário" },
] as const;

export type RoleCode = (typeof ROLES)[number]["code"];

export type UserRecord = {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: RoleCode;
  active: boolean;
  mustChangePassword: boolean;
  // Vai dentro do token de sessão. Incrementar derruba todas as sessões abertas do usuário.
  sessionVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditEventRecord = {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  data: Record<string, unknown>;
  createdAt: Date;
};

export type NotificationRecord = {
  id: string;
  userId: string;
  title: string;
  body: string;
  // Caminho do app aberto no clique ("/profile"). Nulo: só marca como lida.
  url: string | null;
  // Quem causou o aviso (o admin que mudou o cargo). Com a prévia desligada, a notificação diz só isso.
  senderName: string | null;
  // Avisa mesmo com os avisos silenciados.
  important: boolean;
  readAt: Date | null;
  // Arquivada sai da lista principal e do contador, e só volta ao desarquivar.
  archivedAt: Date | null;
  createdAt: Date;
};

// Silêncio dos avisos de um usuário. `until` null: para sempre.
export type MuteRecord = { until: Date | null };

export type ConversationRecord = {
  id: string;
  // "direct": duas pessoas; "group": nome e várias pessoas.
  kind: "direct" | "group";
  name: string | null;
  memberIds: string[];
  createdById: string;
  createdAt: Date;
  lastMessageAt: Date;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  // Ordem dentro da conversa, de 1 em diante. A leitura guarda até qual foi lida.
  seq: number;
  authorId: string;
  text: string;
  // Mensagem citada (resposta).
  replyToId: string | null;
  // Pessoas marcadas com "@" e "@todos".
  mentionIds: string[];
  mentionsAll: boolean;
  // Uma reação por pessoa: userId -> emoji.
  reactions: Record<string, string>;
  createdAt: Date;
};

// O que cada pessoa fez na conversa: só vale para ela.
export type MemberStateRecord = {
  conversationId: string;
  userId: string;
  // Até qual mensagem (seq) foi lida.
  lastReadSeq: number;
  // "Marcar como não lida": só a bolinha, sem número.
  markedUnread: boolean;
  // Silenciada até esta data; `mutedForever` para "Sempre".
  mutedUntil: Date | null;
  mutedForever: boolean;
  archived: boolean;
  // Última reação de outra pessoa a uma mensagem dela, para a prévia da lista. Some quando ela lê.
  lastReaction: { authorId: string; emoji: string; messageId: string; createdAt: Date } | null;
};

// Inscrição de Web Push de um navegador, presa à sessão de login (o `sid` do token). Logout apaga;
// sessão vencida, reset de senha ou conta desativada (sessionVersion diferente ou active false) apagam
// no próximo envio.
export type PushSubscriptionRecord = {
  id: string;
  userId: string;
  sessionId: string;
  sessionVersion: number;
  sessionExpiresAt: Date;
  endpoint: string;
  p256dh: string;
  auth: string;
  // Configurações de notificação do navegador desta inscrição (elas ficam no navegador, não no
  // usuário): o push segue as mesmas regras da página.
  preferences: unknown;
  createdAt: Date;
};

export const store = {
  users: new Map<string, UserRecord>(),
  auditEvents: [] as AuditEventRecord[],
  notifications: [] as NotificationRecord[],
  // Por endpoint: o mesmo navegador inscrevendo de novo substitui a inscrição anterior.
  pushSubscriptions: new Map<string, PushSubscriptionRecord>(),
  // Par VAPID gerado em dev e teste quando o .env não tem um. Restart gera outro, e os navegadores se
  // inscrevem de novo ao abrir o app.
  vapidKeys: null as { publicKey: string; privateKey: string } | null,
  // Avisos silenciados, por usuário.
  noticeMutes: new Map<string, MuteRecord>(),
  conversations: new Map<string, ConversationRecord>(),
  // Mensagens de cada conversa, em ordem de seq.
  messages: new Map<string, MessageRecord[]>(),
  // Por `${conversationId}:${userId}`.
  memberStates: new Map<string, MemberStateRecord>(),
};

export function resetStore() {
  store.users.clear();
  store.auditEvents.length = 0;
  store.notifications.length = 0;
  store.pushSubscriptions.clear();
  store.vapidKeys = null;
  store.noticeMutes.clear();
  store.conversations.clear();
  store.messages.clear();
  store.memberStates.clear();
}
