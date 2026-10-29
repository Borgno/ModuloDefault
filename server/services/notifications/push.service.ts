import { randomUUID } from "node:crypto";
import webpush from "web-push";
import { env } from "../../env";
import { store, type PushSubscriptionRecord } from "../../lib/memoryStore";
import { ApiProblem } from "../../lib/problem";
import type { Session } from "../auth/session.service";
import {
  normalizeNotificationPreferences,
  type NotificationKind,
  type NotificationPreferences,
} from "../../../shared/notificationPreferences";
import { openPushEndpoints } from "./stream.service";

// Web Push: avisa os navegadores do usuário que estão sem o app aberto. O service worker
// (public/sw.js) mostra a notificação; a página aberta avisa sozinha (pelo stream SSE).

// O que o service worker mostra.
export type PushPayload = {
  title: string;
  body: string;
  // Uma notificação por tag: a nova substitui a anterior. O id da notificação, ou o da conversa.
  tag: string;
  // O que o clique abre: a notificação (marca como lida) ou a conversa.
  kind: "notice" | "conversation";
  // Caminho aberto no clique.
  url: string | null;
  silent: boolean;
};

// O pacote do push tem no máximo 4 KB já cifrado: texto longo vai cortado.
const MAX_BODY_LENGTH = 500;
// Serviço de push que não responde não segura o aviso das outras inscrições.
const SEND_TIMEOUT_MS = 10_000;
// Aviso que não chegou em 1 h já não serve.
const TTL_SECONDS = 60 * 60;

// Par VAPID do .env. Sem ele (dev e teste), um par gerado na primeira leitura, que some no restart.
export function getVapidKeys() {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  }
  store.vapidKeys ??= webpush.generateVAPIDKeys();
  return store.vapidKeys;
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  preferences?: unknown;
};

// O mesmo navegador inscrevendo de novo (outro usuário entrou nele) passa a ser do usuário atual,
// preso à sessão de login dele.
export function saveSubscription(userId: string, session: Session, input: PushSubscriptionInput) {
  const previous = store.pushSubscriptions.get(input.endpoint);
  const subscription: PushSubscriptionRecord = {
    id: previous?.id ?? randomUUID(),
    userId,
    sessionId: session.id,
    sessionVersion: session.version,
    sessionExpiresAt: session.expiresAt,
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    preferences: normalizeNotificationPreferences(input.preferences),
    createdAt: previous?.createdAt ?? new Date(),
  };
  store.pushSubscriptions.set(input.endpoint, subscription);
  return { id: subscription.id };
}

function deleteSubscriptions(match: (subscription: PushSubscriptionRecord) => boolean) {
  let count = 0;
  for (const [endpoint, subscription] of store.pushSubscriptions) {
    if (!match(subscription)) continue;
    store.pushSubscriptions.delete(endpoint);
    count += 1;
  }
  return count;
}

export function removeSubscription(userId: string, id: string) {
  if (deleteSubscriptions((s) => s.id === id && s.userId === userId) === 0) {
    throw new ApiProblem(404, "PUSH_SUBSCRIPTION_NOT_FOUND", "Inscrição não encontrada.");
  }
}

// Logout: o navegador desta sessão para de receber.
export function dropSessionSubscriptions(sessionId: string) {
  deleteSubscriptions((s) => s.sessionId === sessionId);
}

// Troca da própria senha: a sessão continua (cookie reemitido), com o sessionVersion novo.
export function renewSessionSubscriptions(sessionId: string, sessionVersion: number) {
  for (const subscription of store.pushSubscriptions.values()) {
    if (subscription.sessionId === sessionId) subscription.sessionVersion = sessionVersion;
  }
}

function statusCodeOf(error: unknown) {
  return typeof error === "object" && error !== null && "statusCode" in error
    ? Number(error.statusCode)
    : undefined;
}

async function send(
  subscription: Pick<PushSubscriptionRecord, "endpoint" | "p256dh" | "auth">,
  payload: PushPayload,
) {
  const { publicKey, privateKey } = getVapidKeys();
  const body =
    payload.body.length > MAX_BODY_LENGTH
      ? `${payload.body.slice(0, MAX_BODY_LENGTH - 1)}…`
      : payload.body;
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({ ...payload, body }),
      {
        vapidDetails: { subject: env.VAPID_SUBJECT, publicKey, privateKey },
        timeout: SEND_TIMEOUT_MS,
        TTL: TTL_SECONDS,
        urgency: "high",
        // O serviço de push troca o aviso ainda não entregue da mesma conversa (ou aviso) pelo novo.
        topic: payload.tag.replace(/-/g, "").slice(0, 32),
      },
    );
  } catch (error) {
    // O navegador desinstalou ou limpou a permissão (404/410), ou a inscrição é de outra chave VAPID
    // (403): não volta a valer.
    const status = statusCodeOf(error);
    if (status === 403 || status === 404 || status === 410) {
      store.pushSubscriptions.delete(subscription.endpoint);
      return;
    }
    console.warn(
      `[push] falha ao enviar (status ${status ?? "-"}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Inscrições do usuário que ainda valem: conta ativa, mesma versão de sessão e sessão não vencida. As
// que não valem mais são apagadas aqui.
function liveSubscriptions(userId: string) {
  const user = store.users.get(userId);
  const now = new Date();
  const alive = (s: PushSubscriptionRecord) =>
    !!user?.active && s.sessionVersion === user.sessionVersion && s.sessionExpiresAt > now;
  deleteSubscriptions((s) => s.userId === userId && !alive(s));
  return [...store.pushSubscriptions.values()].filter((s) => s.userId === userId);
}

// Pausa de um aviso (grupo agitado, avisos em sequência) por usuário: true = ainda dentro dela.
const lastAlert = new Map<string, number>();
export function squelched(key: string, ms: number, now = Date.now()) {
  if (now - (lastAlert.get(key) ?? 0) < ms) return true;
  lastAlert.set(key, now);
  return false;
}

export function forgetSquelches() {
  lastAlert.clear();
}

// Aviso para os navegadores do usuário sem o app aberto. Cada navegador com as próprias configurações:
// `build` monta o aviso com elas, ou devolve null para não avisar aquele navegador.
export async function pushToClosedBrowsers(
  userId: string,
  kind: NotificationKind,
  build: (prefs: NotificationPreferences) => Omit<PushPayload, "silent"> | null,
) {
  const open = openPushEndpoints(userId);
  const subscriptions = liveSubscriptions(userId).filter((s) => !open.has(s.endpoint));

  await Promise.all(
    subscriptions.map((subscription) => {
      const prefs = normalizeNotificationPreferences(subscription.preferences);
      if (!prefs[kind].show) return;
      const payload = build(prefs);
      if (!payload) return;
      return send(subscription, { ...payload, silent: !prefs[kind].sound });
    }),
  );
}
