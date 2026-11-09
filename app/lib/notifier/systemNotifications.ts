// Notificações do sistema operacional. Uma por notificação do app (tag = id), fechadas quando ela é
// lida aqui, em outra aba ou em outro computador.

type ShowOptions = {
  body: string;
  tag: string;
  url: string | null;
  // Toca o som do sistema (quando o app não pode tocar o seu).
  systemSound: boolean;
  onClick: () => void;
};

const ICON = "/icons/icon-192.png";
const pageNotifications = new Map<string, Notification>();

export function showSystemNotification(title: string, options: ShowOptions) {
  const { body, tag, url, systemSound, onClick } = options;
  const init: NotificationOptions & { renotify?: boolean } = {
    body,
    tag,
    icon: ICON,
    renotify: true,
    silent: !systemSound,
    data: { url },
  };
  try {
    const notification = new Notification(title, init);
    notification.onclick = () => {
      notification.close();
      onClick();
    };
    notification.onclose = () => {
      if (pageNotifications.get(tag) === notification) pageNotifications.delete(tag);
    };
    pageNotifications.set(tag, notification);
  } catch {
    // Celular (Chrome Android): só pelo service worker. O clique volta pelo sw.js.
    navigator.serviceWorker?.ready
      .then((registration) => registration.showNotification(title, init))
      .catch(() => {});
  }
}

// `tags` null fecha todas: as da página e as que vieram por push ou pelo service worker.
export function closeSystemNotifications(tags: string[] | null) {
  for (const [tag, notification] of pageNotifications) {
    if (tags && !tags.includes(tag)) continue;
    notification.close();
    pageNotifications.delete(tag);
  }
  navigator.serviceWorker
    ?.getRegistration()
    .then((registration) => registration?.getNotifications())
    .then((list) => list?.forEach((n) => (!tags || tags.includes(n.tag)) && n.close()))
    .catch(() => {});
}

// Abertura do app e reconexão: somem as notificações do push que já não estão entre as não lidas
// (lidas em outro computador, ou antes de esta aba abrir).
export function closeSystemNotificationsExcept(unreadIds: string[]) {
  navigator.serviceWorker
    ?.getRegistration()
    .then((registration) => registration?.getNotifications())
    .then((list) => list?.forEach((n) => !unreadIds.includes(n.tag) && n.close()))
    .catch(() => {});
}

// Saindo da página: as notificações dela não ficam para trás.
export function closePageNotifications() {
  for (const notification of pageNotifications.values()) notification.close();
  pageNotifications.clear();
}
