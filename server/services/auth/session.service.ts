import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../env";
import { SESSION_MAX_AGE_SECONDS } from "../../lib/sessionCookie";

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "../../lib/sessionCookie";

// Sessão sem estado no servidor: o cookie carrega { sub, ver, exp } assinado por HMAC. Role e status
// são lidos do usuário a cada request, então mudar a role ou desativar vale na hora. "ver" é o
// sessionVersion do usuário: um reset de senha incrementa e derruba as sessões antigas.

type SessionPayload = { sub: string; ver: number; exp: number };
export type Session = { userId: string; version: number };

function sign(value: string) {
  return createHmac("sha256", env.SESSION_SECRET).update(value).digest("base64url");
}

export function createSessionToken(userId: string, version: number, now = Date.now()) {
  const payload: SessionPayload = {
    sub: userId,
    ver: version,
    exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

// Devolve a sessão, ou null para token ausente, adulterado ou vencido.
export function readSessionToken(token: string | undefined, now = Date.now()): Session | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = Buffer.from(sign(encoded));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.ver !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp < Math.floor(now / 1000)) return null;
    return { userId: payload.sub, version: payload.ver };
  } catch {
    return null;
  }
}
