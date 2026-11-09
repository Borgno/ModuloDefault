import { randomUUID } from "node:crypto";
import { store, type NotificationRecord } from "../../lib/memoryStore";
import { ApiProblem } from "../../lib/problem";
import { inPeriod, matchesTerm, parseSearch, type SearchFilter } from "../../lib/search";
import { paginate } from "../pagination";
import { isMuted, muteUntil, type MuteOption } from "./mute";
import { noticeNotification, SQUELCH_MS } from "../../../shared/notificationText";
import { pushToClosedBrowsers, squelched } from "./push.service";
import { sendToUser } from "./stream.service";

// Notificações de cada usuário: a lista da tela de Notificações, o "(N)" da aba e a notificação do
// sistema. Outros módulos avisam alguém com `notifyUser`.

export type PublicNotification = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  senderName: string | null;
  important: boolean;
  read: boolean;
  archived: boolean;
  createdAt: string;
};

function toPublicNotification(notification: NotificationRecord): PublicNotification {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    url: notification.url,
    senderName: notification.senderName,
    important: notification.important,
    read: notification.readAt !== null,
    archived: notification.archivedAt !== null,
    createdAt: notification.createdAt.toISOString(),
  };
}

// Não lidas fora das arquivadas: o número da sidebar e do "(N)" da aba.
export function countUnread(userId: string) {
  return store.notifications.filter(
    (n) => n.userId === userId && n.readAt === null && n.archivedAt === null,
  ).length;
}

// Avisos silenciados: `muted` agora, e até quando (null com `muted`: para sempre).
export type NoticeMute = { muted: boolean; mutedUntil: string | null };

export function getNoticeMute(userId: string): NoticeMute {
  const mute = store.noticeMutes.get(userId);
  if (!isMuted(mute)) return { muted: false, mutedUntil: null };
  return { muted: true, mutedUntil: mute?.until?.toISOString() ?? null };
}

// Silencia os avisos do sistema (null: volta a avisar). As outras abas e navegadores ficam sabendo.
export function setNoticeMute(userId: string, option: MuteOption | null) {
  if (option) store.noticeMutes.set(userId, muteUntil(option));
  else store.noticeMutes.delete(userId);
  const mute = getNoticeMute(userId);
  sendToUser(userId, { type: "noticeMute", data: mute });
  return mute;
}

export type NotifyInput = {
  title: string;
  body: string;
  // Caminho do app aberto no clique ("/profile"). Sem ele, o clique só abre o app.
  url?: string;
  // Quem causou o aviso. Com a prévia desligada, a notificação diz "Notificação de Fulano".
  senderName?: string;
  // Avisa mesmo com os avisos silenciados (como a menção numa conversa silenciada).
  important?: boolean;
};

// Grava a notificação e avisa: as abas abertas pelo stream (a página decide se mostra), os outros
// navegadores pelo Web Push. Falha no push não desfaz a notificação: ela continua na lista.
export function notifyUser(userId: string, input: NotifyInput) {
  const notification: NotificationRecord = {
    id: randomUUID(),
    userId,
    title: input.title,
    body: input.body,
    url: input.url ?? null,
    senderName: input.senderName ?? null,
    important: input.important ?? false,
    readAt: null,
    archivedAt: null,
    createdAt: new Date(),
  };
  store.notifications.push(notification);
  const unread = countUnread(userId);
  const published = toPublicNotification(notification);
  sendToUser(userId, { type: "notification", data: { notification: published, unread } });
  // Silenciados não avisam, a não ser o importante. Vários seguidos: um aviso a cada 15 s.
  const alert =
    (notification.important || !isMuted(store.noticeMutes.get(userId))) &&
    !squelched(`${userId}:notices`, SQUELCH_MS);
  if (alert) {
    void pushToClosedBrowsers(userId, "notices", (prefs) => ({
      ...noticeNotification(notification, prefs.previews, unread),
      tag: notification.id,
      kind: "notice",
      url: notification.url,
    })).catch((error: unknown) =>
      console.error("[push] falha ao avisar os navegadores fechados", error),
    );
  }
  return published;
}

export type ListNotificationsQuery = {
  search?: string;
  read?: boolean;
  // Sem o filtro, só as não arquivadas.
  archived?: boolean;
  page: number;
  pageSize: number;
};

// Chaves de `campo:valor` da busca de notificações.
export const NOTIFICATION_SEARCH_KEYS = ["titulo", "texto"] as const;

function matchesFilter(notification: NotificationRecord, { key, value }: SearchFilter) {
  return matchesTerm(key === "titulo" ? notification.title : notification.body, value);
}

// Mais recentes primeiro. `meta.unread` acompanha a lista para o contador não precisar de outra ida.
export function listNotifications(userId: string, query: ListNotificationsQuery) {
  const { text, filters, period } = parseSearch(query.search, NOTIFICATION_SEARCH_KEYS);
  const filtered = store.notifications
    .filter((n) => n.userId === userId)
    .filter((n) => !text || matchesTerm(`${n.title} ${n.body}`, text))
    .filter((n) => filters.every((filter) => matchesFilter(n, filter)))
    .filter((n) => inPeriod(n.createdAt, period))
    .filter((n) => query.read === undefined || (n.readAt !== null) === query.read)
    .filter((n) => (n.archivedAt !== null) === (query.archived ?? false))
    .reverse();
  const page = paginate(filtered, query.page, query.pageSize);
  return {
    data: page.data.map(toPublicNotification),
    meta: { ...page.meta, unread: countUnread(userId) },
  };
}

// Marca uma como lida ou não lida, ou arquiva e desarquiva. As outras abas e navegadores do usuário
// ficam sabendo (a notificação do sistema dela fecha ao ser lida ou arquivada).
export function updateNotification(
  userId: string,
  id: string,
  patch: { read?: boolean; archived?: boolean },
) {
  const notification = store.notifications.find((n) => n.id === id && n.userId === userId);
  if (!notification) {
    throw new ApiProblem(404, "NOTIFICATION_NOT_FOUND", "Notificação não encontrada.");
  }
  const now = new Date();
  if (patch.read !== undefined && patch.read !== (notification.readAt !== null)) {
    notification.readAt = patch.read ? now : null;
  }
  if (patch.archived !== undefined && patch.archived !== (notification.archivedAt !== null)) {
    notification.archivedAt = patch.archived ? now : null;
  }
  const unread = countUnread(userId);
  const gone = notification.readAt !== null || notification.archivedAt !== null;
  if (gone) sendToUser(userId, { type: "read", data: { ids: [id], unread } });
  else sendToUser(userId, { type: "unread", data: { unread } });
  return toPublicNotification(notification);
}

// Todas lidas de uma vez.
export function markAllNotificationsRead(userId: string) {
  const now = new Date();
  for (const n of store.notifications) if (n.userId === userId && n.readAt === null) n.readAt = now;
  sendToUser(userId, { type: "read", data: { ids: null, unread: 0 } });
}
