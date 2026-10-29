import { useSyncExternalStore } from "react";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
  type NotificationPreferences,
} from "~shared/notificationPreferences";

// Configurações de notificação de cada usuário neste navegador (computador dividido: cada um com as
// suas). Ficam no localStorage, não no servidor: em outro computador valem as padrão até a pessoa mudar.
// Também guarda a permissão do navegador, que muda pelo cadeado da barra de endereço.

// "unsupported": navegador sem notificação, ou site fora de HTTPS (exceto localhost).
export type PermissionState = NotificationPermission | "unsupported";

export function readPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window) || !window.isSecureContext) {
    return "unsupported";
  }
  return Notification.permission;
}

type NotifierState = {
  prefs: NotificationPreferences;
  // De quem são as preferências na tela (onde gravar). Null antes de carregar: valem as padrão.
  userId: string | null;
  permission: PermissionState;
};

const INITIAL: NotifierState = {
  prefs: DEFAULT_NOTIFICATION_PREFERENCES,
  userId: null,
  permission: "unsupported",
};

let state: NotifierState = { ...INITIAL, permission: readPermission() };
const listeners = new Set<() => void>();

function setState(patch: Partial<NotifierState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

const prefsKey = (userId: string) => `notificacoes:${userId}`;

const normalize = normalizeNotificationPreferences;

export function loadPreferences(userId: string) {
  let stored: unknown = null;
  try {
    stored = JSON.parse(localStorage.getItem(prefsKey(userId)) ?? "null");
  } catch {
    // Storage bloqueado ou valor estragado: valem as padrão.
  }
  setState({ prefs: normalize(stored), userId });
}

export function updatePreferences(prefs: NotificationPreferences) {
  setState({ prefs });
  if (!state.userId) return;
  try {
    localStorage.setItem(prefsKey(state.userId), JSON.stringify(prefs));
  } catch {
    // Storage bloqueado: valem só até recarregar.
  }
}

// Saiu da conta: as preferências não passam para o próximo usuário da mesma aba.
export function resetPreferences() {
  setState({ prefs: DEFAULT_NOTIFICATION_PREFERENCES, userId: null });
}

export function refreshPermission() {
  const permission = readPermission();
  if (permission !== state.permission) setState({ permission });
}

// Precisa vir de um clique: o navegador ignora o pedido feito sozinho.
export async function requestPermission() {
  if (readPermission() === "unsupported") return "unsupported";
  const permission = await Notification.requestPermission();
  setState({ permission });
  return permission;
}

export function getNotifierState() {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNotifierState() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
}
