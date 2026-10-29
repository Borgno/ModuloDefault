import { SQUELCH_MS } from "~shared/notificationText";

// Pausa de um aviso (grupo agitado, avisos em sequência): true = ainda dentro dela, sem notificação
// nem som. O servidor faz o mesmo para o push.
const lastAlert = new Map<string, number>();

export function squelched(key: string, now = Date.now()) {
  if (now - (lastAlert.get(key) ?? 0) < SQUELCH_MS) return true;
  lastAlert.set(key, now);
  return false;
}

export function forgetSquelches() {
  lastAlert.clear();
}
