import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "./password.service";

describe("password.service", () => {
  it("aceita a senha certa e recusa a errada", async () => {
    const hash = await hashPassword("correta-123");
    expect(await verifyPassword("correta-123", hash)).toBe(true);
    expect(await verifyPassword("errada-123", hash)).toBe(false);
  });

  it("gera hash diferente para a mesma senha (salt por hash)", async () => {
    expect(await hashPassword("mesma-senha")).not.toBe(await hashPassword("mesma-senha"));
  });

  it("recusa hash em formato desconhecido", async () => {
    expect(await verifyPassword("qualquer", "md5$abc")).toBe(false);
  });

  it("gera senha temporária de 12 caracteres sem caracteres ambíguos", () => {
    const password = generateTemporaryPassword();
    expect(password).toHaveLength(12);
    expect(password).not.toMatch(/[0O1lI]/);
  });
});
