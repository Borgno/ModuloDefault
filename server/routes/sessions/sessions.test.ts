import { beforeEach, describe, expect, it } from "vitest";
import { store } from "../../lib/memoryStore";
import { findUserByEmail } from "../../services/users/users.service";
import { ADMIN_EMAIL, jsonRequest, SEED_PASSWORD, setupApp } from "../../test/helpers";

let app: Awaited<ReturnType<typeof setupApp>>;
beforeEach(async () => {
  app = await setupApp();
});

const login = (email: string, password: string) =>
  app.request("/api/v1/sessions", jsonRequest("POST", { email, password }));

describe("POST /api/v1/sessions", () => {
  it("cria a sessão: 201, cookie HttpOnly, Location e usuário sem hash", async () => {
    const res = await login(ADMIN_EMAIL, SEED_PASSWORD);
    expect(res.status).toBe(201);
    expect(res.headers.get("Location")).toBe("/api/v1/sessions/current");

    const cookie = res.headers.get("Set-Cookie") ?? "";
    expect(cookie).toMatch(/^session=/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ email: ADMIN_EMAIL, role: "admin" });
    expect(body).not.toHaveProperty("passwordHash");
    expect(findUserByEmail(ADMIN_EMAIL)?.lastLoginAt).toBeInstanceOf(Date);
  });

  it("aceita e-mail com maiúsculas e espaços", async () => {
    const res = await login("  Admin@Local.Test ", SEED_PASSWORD);
    expect(res.status).toBe(201);
  });

  it("responde igual para senha errada e para e-mail inexistente", async () => {
    const wrongPassword = await login(ADMIN_EMAIL, "senha-errada");
    const unknownEmail = await login("ninguem@local.test", "senha-errada");
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
  });

  it("responde 403 para usuário desativado que acerta a senha", async () => {
    findUserByEmail(ADMIN_EMAIL)!.active = false;
    const res = await login(ADMIN_EMAIL, SEED_PASSWORD);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "USER_INACTIVE" });
  });

  it("bloqueia com 429 e Retry-After depois de 5 falhas no mesmo e-mail", async () => {
    for (let i = 0; i < 5; i++) await login(ADMIN_EMAIL, "senha-errada");
    const res = await login(ADMIN_EMAIL, SEED_PASSWORD);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(await res.json()).toMatchObject({ code: "TOO_MANY_ATTEMPTS" });
  });

  it("responde 422 com os campos quando o corpo é inválido", async () => {
    const res = await login("nao-e-email", "");
    expect(res.status).toBe(422);
    const body = (await res.json()) as { errors: { field: string }[] };
    expect(body.errors.map((e) => e.field).sort()).toEqual(["email", "password"]);
  });

  it("não guarda senha em texto no store", async () => {
    for (const user of store.users.values()) {
      expect(user.passwordHash).not.toContain(SEED_PASSWORD);
      expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    }
  });
});

describe("DELETE /api/v1/sessions/current", () => {
  it("encerra a sessão com 204 e expira o cookie", async () => {
    const res = await app.request("/api/v1/sessions/current", { method: "DELETE" });
    expect(res.status).toBe(204);
    expect(res.headers.get("Set-Cookie")).toMatch(/session=;.*Max-Age=0/);
  });
});
