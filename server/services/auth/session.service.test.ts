import { describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken, SESSION_MAX_AGE_SECONDS } from "./session.service";

describe("session.service", () => {
  it("lê o id do usuário de um token válido", () => {
    expect(readSessionToken(createSessionToken("user-1", 3))).toEqual({
      userId: "user-1",
      version: 3,
    });
  });

  it("recusa token com payload adulterado", () => {
    const [, signature] = createSessionToken("user-1", 1).split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin", ver: 1, exp: 9999999999 })).toString(
      "base64url",
    );
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
