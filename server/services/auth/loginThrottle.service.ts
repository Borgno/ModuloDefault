// Limite de tentativas de login com falha, em memória. Duas chaves: por e-mail (protege uma conta de
// adivinhação) e por IP (freia quem testa muitas contas). Sucesso zera a chave do e-mail.
const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = { email: 5, ip: 20 };

type Bucket = { failures: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function bucket(key: string, now: number) {
  const current = buckets.get(key);
  if (current && current.resetAt > now) return current;
  const fresh = { failures: 0, resetAt: now + WINDOW_MS };
  buckets.set(key, fresh);
  return fresh;
}

// Segundos até liberar, ou null se ainda pode tentar.
export function retryAfterSeconds(email: string, ip: string, now = Date.now()): number | null {
  const byEmail = bucket(`email:${email}`, now);
  const byIp = bucket(`ip:${ip}`, now);
  const blocked = [
    byEmail.failures >= LIMITS.email ? byEmail.resetAt : 0,
    byIp.failures >= LIMITS.ip ? byIp.resetAt : 0,
  ];
  const until = Math.max(...blocked);
  return until > now ? Math.ceil((until - now) / 1000) : null;
}

export function recordFailure(email: string, ip: string, now = Date.now()) {
  bucket(`email:${email}`, now).failures += 1;
  bucket(`ip:${ip}`, now).failures += 1;
}

export function recordSuccess(email: string) {
  buckets.delete(`email:${email}`);
}

export function resetLoginThrottle() {
  buckets.clear();
}
