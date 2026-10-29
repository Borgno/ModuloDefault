// Service worker do app: só a notificação com o app fechado (Web Push). Não intercepta requisições
// nem guarda nada em cache.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Nova notificação", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      // Uma por aviso ou por conversa: a página fecha quando é lida.
      tag: data.tag,
      renotify: !!data.tag,
      silent: !!data.silent,
      data: { id: data.tag || null, url: data.url || null, kind: data.kind || "notice" },
    }),
  );
});

// Clique: usa a aba do app que já estiver aberta e manda abrir a notificação nela; sem nenhuma, abre
// uma nova já no caminho, com o id (o aviso é marcado como lido; a conversa abre com o cursor no
// campo).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { id, url, kind } = event.notification.data || {};
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const client = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        await client.focus();
        if (id) client.postMessage({ type: "abrir-notificacao", id, url, kind });
        return;
      }
      const target = new URL(url || "/notifications", self.location.origin);
      if (id) target.searchParams.set("notificacao", id);
      await self.clients.openWindow(target.pathname + target.search);
    })(),
  );
});
