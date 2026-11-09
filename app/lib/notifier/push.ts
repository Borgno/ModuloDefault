import type { NotificationPreferences } from "~/types/notification";
import { api } from "../api";

// Web Push: com o app fechado, o servidor avisa o navegador pela chave VAPID dele, e o service worker
// (public/sw.js) mostra a notificação. A inscrição fica presa à sessão de login no servidor.

export const pushSupported = () =>
  typeof window !== "undefined" &&
  window.isSecureContext &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

function base64UrlToBytes(base64Url: string) {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array) {
  if (!a) return false;
  const bytes = new Uint8Array(a);
  return bytes.length === b.length && bytes.every((value, i) => value === b[i]);
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return Promise.resolve(null);
  return navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
    console.error("Erro ao registrar o service worker", error);
    return null;
  });
}

// Liga (permissão concedida) ou desliga o push deste navegador. As configurações vão junto: o
// servidor segue as mesmas regras da página. Devolve o endpoint que ficou (null: sem push aqui), que
// o stream de eventos manda ao servidor para ele não avisar por push quem está com o app aberto.
export async function syncPushSubscription(
  enabled: boolean,
  preferences: NotificationPreferences,
): Promise<string | null> {
  const registration = await registerServiceWorker();
  if (!registration) return null;
  try {
    const current = await registration.pushManager.getSubscription();
    if (!enabled || Notification.permission !== "granted") {
      // Sem a permissão, o navegador já não entrega; o servidor apaga a inscrição no próximo envio.
      await current?.unsubscribe();
      return null;
    }
    const { publicKey } = await api.get<{ publicKey: string }>("/pushKey");
    const key = base64UrlToBytes(publicKey);
    let subscription = current;
    // A chave do servidor trocou (restart): a inscrição antiga não serve.
    if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });
    await api.post("/pushSubscriptions", { ...subscription.toJSON(), preferences });
    return subscription.endpoint;
  } catch (error) {
    console.error("Erro ao configurar o aviso com o app fechado", error);
    return null;
  }
}

// Logout: o servidor já apagou a inscrição desta sessão. Cancelar aqui também evita que o próximo
// usuário deste navegador herde o mesmo endpoint antes de se inscrever.
export function dropLocalPushSubscription() {
  if (!pushSupported()) return;
  navigator.serviceWorker
    .getRegistration()
    .then((registration) => registration?.pushManager.getSubscription())
    .then((subscription) => subscription?.unsubscribe())
    .catch(() => {});
}
