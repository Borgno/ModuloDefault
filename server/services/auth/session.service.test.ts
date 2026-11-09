import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { env } from "../../env";
import { createSessionToken, readSessionToken, SESSION_MAX_AGE_SECONDS } from "./session.service";

describe("session.service", () => {
  it("lê o usuário, a sessão e o vencimento de um token válido", () => {
    const now = Date.UTC(2026, 9, 28, 12);
    expect(readSessionToken(createSessionToken("user-1", 3, now, "sessao-1"), now)).toEqual({
      id: "sessao-1",
      userId: "user-1",
      version: 3,
      expiresAt: new Date(now + SESSION_MAX_AGE_SECONDS * 1000),
    });
  });

  it("cada login ganha um id de sessão próprio", () => {
    const a = readSessionToken(createSessionToken("user-1", 1));
    const b = readSessionToken(createSessionToken("user-1", 1));
    expect(a?.id).not.toBe(b?.id);
  });

  it("aceita o token de antes do sid, com um id de sessão fixo para ele", () => {
    const now = Date.UTC(2026, 9, 28, 12);
    const encoded = Buffer.from(
      JSON.stringify({ sub: "user-1", ver: 2, exp: Math.floor(now / 1000) + 60 }),
    ).toString("base64url");
    const token = `${encoded}.${createHmac("sha256", env.SESSION_SECRET).update(encoded).digest("base64url")}`;

    const session = readSessionToken(token, now);
    expect(session).toMatchObject({ userId: "user-1", version: 2 });
    expect(session?.id).toMatch(/^legacy-/);
    expect(readSessionToken(token, now)?.id).toBe(session?.id);

    // Reemitido (troca da própria senha), o token novo leva o mesmo id.
    const renewed = createSessionToken("user-1", 3, now, session?.id);
    expect(readSessionToken(renewed, now)?.id).toBe(session?.id);
  });

  it("recusa token com payload adulterado", () => {
    const [, signature] = createSessionToken("user-1", 1).split(".");
    const forged = Buffer.from(
      JSON.stringify({ sub: "admin", sid: "x", ver: 1, exp: 9999999999 }),
    ).toString("base64url");
    expect(readSessionToken(`${forged}.${signature}`)).toBeNull();
  });

  it("recusa token vencido", () => {
    const now = Date.now();
    const token = createSessionToken("user-1", 1, now);
    const afterExpiry = now + (SESSION_MAX_AGE_SECONDS + 1) * 1000;
    expect(readSessionToken(token, afterExpiry)).toBeNull();
  });

  it("recusa token ausente ou malformado", () => {
    expect(readSessionToken(undefined)).toBeNull();
    expect(readSessionToken("sem-ponto")).toBeNull();
  });
});
