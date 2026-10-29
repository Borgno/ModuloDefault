import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "~/lib/api";
import {
  applyConversation,
  applyMessage,
  unreadConversationIds,
  unreadConversationsQuery,
} from "~/lib/chat/chat.queries";
import { requestComposerFocus } from "~/lib/chat/composerFocus";
import { renderDocumentBadge } from "~/lib/notifier/documentBadge";
import { forgetSquelches, squelched } from "~/lib/notifier/squelch";
import {
  isMutedNow,
  noticeMuteQuery,
  unreadNotificationIds,
  unreadNotificationsQuery,
} from "~/lib/notifier/notifications.queries";
import {
  getNotifierState,
  loadPreferences,
  refreshPermission,
  resetPreferences,
  useNotifierState,
} from "~/lib/notifier/preferences";
import {
  dropLocalPushSubscription,
  registerServiceWorker,
  syncPushSubscription,
} from "~/lib/notifier/push";
import { connectRealtime, type RealtimeEvent } from "~/lib/notifier/realtime";
import { canPlaySound, installAudioUnlock, playIncoming } from "~/lib/notifier/sounds";
import {
  closePageNotifications,
  closeSystemNotifications,
  closeSystemNotificationsExcept,
  showSystemNotification,
} from "~/lib/notifier/systemNotifications";
import type { Conversation, Message } from "~/types/chat";
import type { AppNotification, NotificationKind } from "~/types/notification";
import type { User } from "~/types/user";
import {
  messageNotification,
  noticeNotification,
  reactionNotification,
} from "~shared/notificationText";

// Parâmetro com que o service worker abre o app pelo clique numa notificação de push.
const OPENED_PARAM = "notificacao";

// O usuário está usando o app: janela em foco e aba visível. Aí não há notificação nem som, como no
// WhatsApp Web; o contador da aba e da sidebar continua.
const inUse = () => document.hasFocus() && document.visibilityState === "visible";

const isUnread = (conversation: Conversation) =>
  conversation.unreadCount > 0 || conversation.markedUnread;

// Notificação e som de um aviso, conforme as configurações do tipo dele. O som é o do app; depois de
// um F5 sem clique o navegador não deixa a página tocar, e aí vai o som do sistema.
function alert(
  kind: NotificationKind,
  title: string,
  options: { body: string; tag: string; url: string | null; onClick: () => void },
) {
  const { prefs, permission } = getNotifierState();
  const ownSound = prefs[kind].sound && canPlaySound();
  if (prefs[kind].show && permission === "granted") {
    showSystemNotification(title, { ...options, systemSound: prefs[kind].sound && !ownSound });
  }
  if (ownSound) playIncoming();
}

// Stream de eventos, notificações do sistema, som, Web Push e o "(N)" da aba, enquanto há sessão e
// em qualquer tela. Montado uma vez pelo layout autenticado.
export function NotificationConnection({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const { prefs, permission, userId: prefsUserId } = useNotifierState();
  const [pushEndpoint, setPushEndpoint] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const notices = useQuery(unreadNotificationsQuery);
  const conversations = useQuery(unreadConversationsQuery);
  const noticeMute = useQuery(noticeMuteQuery);
  const noticeMuteRef = useRef(noticeMute.data);
  useEffect(() => {
    noticeMuteRef.current = noticeMute.data;
  }, [noticeMute.data]);

  // Abre o caminho da notificação e marca como lida. Do clique na notificação do sistema (página ou
  // push) para qualquer tela.
  const openNoticeRef = useRef((id: string, url: string | null) => {
    window.focus();
    navigateRef.current(url ?? "/notifications");
    void api.patch(`/notifications/${id}`, { read: true }).catch(() => {});
  });
  // Abre a conversa com o cursor no campo, de qualquer tela.
  const openConversationRef = useRef((id: string) => {
    window.focus();
    requestComposerFocus(id);
    navigateRef.current(`/chat?c=${id}`);
  });

  // Configurações de quem entrou, guardadas neste navegador.
  useEffect(() => {
    loadPreferences(user.id);
  }, [user.id]);

  // Aviso com o app fechado: vale sempre que o navegador tiver a permissão. As configurações vão
  // junto, porque é o servidor que manda o push.
  useEffect(() => {
    if (prefsUserId !== user.id) return;
    let current = true;
    void syncPushSubscription(permission === "granted", prefs).then((endpoint) => {
      if (current) setPushEndpoint(endpoint);
    });
    return () => {
      current = false;
    };
  }, [prefsUserId, user.id, permission, prefs]);

  // Stream de eventos. Reabre quando a inscrição de push muda, para o servidor saber que este
  // navegador está com o app aberto.
  useEffect(() => {
    // Silenciados não avisam, a não ser o importante. Vários seguidos: um aviso a cada 15 s.
    const onNotice = (notification: AppNotification, count: number) => {
      if (inUse()) return;
      if (!notification.important && isMutedNow(noticeMuteRef.current)) return;
      if (squelched("notices")) return;
      const text = noticeNotification(notification, getNotifierState().prefs.previews, count);
      alert("notices", text.title, {
        body: text.body,
        tag: notification.id,
        url: notification.url,
        onClick: () => openNoticeRef.current(notification.id, notification.url),
      });
    };

    // Mensagem de outra pessoa. Silenciada ou arquivada só avisa a dirigida a você; grupo agitado
    // fica 15 s sem avisar.
    const onMessage = (message: Message, conversation: Conversation) => {
      if (message.authorId === user.id || inUse()) return;
      const isGroup = conversation.kind === "group";
      const mentionsMe = message.mentionsAll || message.mentionIds.includes(user.id);
      const repliesToMe = message.replyTo?.authorId === user.id;
      if ((conversation.muted || conversation.archived) && !mentionsMe && !repliesToMe) return;
      if (isGroup && squelched(conversation.id)) return;
      const { prefs: current } = getNotifierState();
      const text = messageNotification({
        conversationName: conversation.name,
        isGroup,
        senderName: message.authorName,
        text: message.text,
        previews: current.previews,
        unreadCount: conversation.unreadCount,
        mentionsMe: isGroup && mentionsMe,
        repliesToMe: isGroup && repliesToMe,
      });
      alert(isGroup ? "groups" : "messages", text.title, {
        body: text.body,
        tag: conversation.id,
        url: `/chat?c=${conversation.id}`,
        onClick: () => openConversationRef.current(conversation.id),
      });
    };

    // Reação de outra pessoa a uma mensagem sua: avisa como mensagem, mas não fura silêncio nem
    // arquivo.
    const onReaction = (
      conversation: Conversation,
      reaction: { authorName: string; emoji: string; text: string },
    ) => {
      if (inUse() || conversation.muted || conversation.archived) return;
      const isGroup = conversation.kind === "group";
      if (isGroup && squelched(conversation.id)) return;
      const text = reactionNotification(
        { conversationName: conversation.name, isGroup, ...reaction },
        getNotifierState().prefs.previews,
      );
      alert(isGroup ? "groups" : "messages", text.title, {
        body: text.body,
        tag: conversation.id,
        url: `/chat?c=${conversation.id}`,
        onClick: () => openConversationRef.current(conversation.id),
      });
    };

    const onEvent = (event: RealtimeEvent) => {
      switch (event.type) {
        case "notification":
        case "read":
        case "unread":
          queryClient.setQueryData(unreadNotificationsQuery.queryKey, event.unread);
          void queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
          if (event.type === "notification") onNotice(event.notification, event.unread);
          if (event.type === "read") closeSystemNotifications(event.ids);
          break;
        case "noticeMute":
          queryClient.setQueryData(noticeMuteQuery.queryKey, {
            muted: event.muted,
            mutedUntil: event.mutedUntil,
          });
          break;
        case "conversation":
          applyConversation(queryClient, event.conversation);
          // Lida aqui, em outra aba ou em outro computador: a notificação dela some.
          if (!isUnread(event.conversation)) closeSystemNotifications([event.conversation.id]);
          break;
        case "message":
          applyMessage(queryClient, event.message);
          applyConversation(queryClient, event.conversation);
          if (event.message.authorId === user.id) {
            closeSystemNotifications([event.conversation.id]);
          } else {
            onMessage(event.message, event.conversation);
          }
          break;
        case "reaction":
          applyMessage(queryClient, event.message);
          applyConversation(queryClient, event.conversation);
          if (event.reaction) onReaction(event.conversation, event.reaction);
          break;
      }
    };

    return connectRealtime({
      pushEndpoint,
      onEvent,
      onOpen: () => {
        setOffline(false);
        // O que chegou com a conexão caída.
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        void queryClient.invalidateQueries({ queryKey: ["chat"] });
        void Promise.all([unreadNotificationIds(), unreadConversationIds()])
          .then(([noticeIds, conversationIds]) =>
            closeSystemNotificationsExcept([...noticeIds, ...conversationIds]),
          )
          .catch(() => {});
      },
      onOffline: () => setOffline(true),
    });
  }, [pushEndpoint, queryClient, user.id]);

  // Contador da aba: avisos (fora os silenciados) e conversas com mensagem não lida.
  const noticesCount = isMutedNow(noticeMute.data) ? 0 : (notices.data ?? 0);
  const unread = noticesCount + (conversations.data ?? 0);

  // A troca de tela troca o título (meta da rota): o "(N)" volta na frente dele.
  useEffect(() => {
    renderDocumentBadge(unread, offline);
    const observer = new MutationObserver(() => renderDocumentBadge(unread, offline));
    const title = document.querySelector("title");
    if (title) observer.observe(title, { childList: true });
    return () => observer.disconnect();
  }, [unread, offline]);

  useEffect(() => () => renderDocumentBadge(0, false), []);

  // Permissão trocada pelo cadeado do navegador, áudio liberado no primeiro clique, notificações da
  // página fechadas ao sair dela, clique no push com a aba aberta (pelo service worker).
  useEffect(() => {
    void registerServiceWorker();
    const removeAudioUnlock = installAudioUnlock();
    let permissionStatus: PermissionStatus | null = null;
    let detached = false;
    navigator.permissions
      ?.query({ name: "notifications" as PermissionName })
      .then((status) => {
        if (detached) return;
        permissionStatus = status;
        status.addEventListener("change", refreshPermission);
      })
      .catch(() => {});
    window.addEventListener("focus", refreshPermission);
    window.addEventListener("pagehide", closePageNotifications);

    const onWorkerMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        id?: string;
        url?: string | null;
        kind?: string;
      } | null;
      if (data?.type !== "abrir-notificacao" || typeof data.id !== "string") return;
      if (data.kind === "conversation") openConversationRef.current(data.id);
      else openNoticeRef.current(data.id, data.url ?? null);
    };
    navigator.serviceWorker?.addEventListener("message", onWorkerMessage);

    // Aberto pelo clique num push com o app fechado: o service worker abriu a URL com o id. Na
    // conversa, o cursor vai para o campo; no aviso, ele é marcado como lido.
    const params = new URLSearchParams(window.location.search);
    const openedId = params.get(OPENED_PARAM);
    if (openedId) {
      params.delete(OPENED_PARAM);
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`,
      );
      if (window.location.pathname.startsWith("/chat")) requestComposerFocus(openedId);
      else void api.patch(`/notifications/${openedId}`, { read: true }).catch(() => {});
    }

    return () => {
      detached = true;
      permissionStatus?.removeEventListener("change", refreshPermission);
      window.removeEventListener("focus", refreshPermission);
      window.removeEventListener("pagehide", closePageNotifications);
      navigator.serviceWorker?.removeEventListener("message", onWorkerMessage);
      removeAudioUnlock();
      closePageNotifications();
      forgetSquelches();
    };
  }, []);

  return null;
}

// Logout: as configurações e a inscrição deste navegador não passam para o próximo usuário. Chamado
// pelo layout no "Sair", e não no unmount: em dev o StrictMode desmonta e monta de novo, e o cancelamento
// atrasado derrubaria a inscrição recém-criada.
export function leaveNotifications() {
  resetPreferences();
  dropLocalPushSubscription();
}
