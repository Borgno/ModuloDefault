import { beforeEach, describe, expect, it } from "vitest";
import { store } from "../../lib/memoryStore";
import { findUserByEmail } from "../../services/users/users.service";
import { jsonRequest, loginAs, SEED_PASSWORD, setupApp, USER_EMAIL } from "../../test/helpers";

let app: Awaited<ReturnType<typeof setupApp>>;
let cookie: string;

beforeEach(async () => {
  app = await setupApp();
  cookie = await loginAs(app, USER_EMAIL);
});

describe("/api/v1/me", () => {
  it("responde 401 sem sessão", async () => {
    const res = await app.request("/api/v1/me");
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("responde 401 com cookie adulterado", async () => {
    const res = await app.request("/api/v1/me", { headers: { Cookie: "session=abc.def" } });
    expect(res.status).toBe(401);
  });

  it("devolve o usuário da sessão", async () => {
    const res = await app.request("/api/v1/me", { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ email: USER_EMAIL, role: "user" });
  });

  it("derruba a sessão na hora quando o usuário é desativado", async () => {
    findUserByEmail(USER_EMAIL)!.active = false;
    const res = await app.request("/api/v1/me", { headers: { Cookie: cookie } });
    expect(res.status).toBe(401);
  });

  it("edita o próprio nome e registra audit", async () => {
    const res = await app.request(
      "/api/v1/me",
      jsonRequest("PATCH", { fullName: "  Ana  " }, cookie),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ fullName: "Ana" });
    expect(store.auditEvents.at(-1)).toMatchObject({ action: "user.updated" });
  });

  it("responde 405 com Allow para método não suportado", async () => {
    const res = await app.request("/api/v1/me", { method: "DELETE" });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, PATCH");
  });
});

describe("troca de senha", () => {
  it("recusa senha atual errada com o campo em errors", async () => {
    const res = await app.request(
      "/api/v1/me/password",
      jsonRequest("PUT", { currentPassword: "errada", newPassword: "nova-senha-123" }, cookie),
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({
      code: "INVALID_CURRENT_PASSWORD",
      errors: [{ field: "currentPassword" }],
    });
  });

  it("troca a senha e derruba as outras sessões, mas mantém quem trocou", async () => {
    const otherDevice = await loginAs(app, USER_EMAIL);
    const res = await app.request(
      "/api/v1/me/password",
      jsonRequest("PUT", { currentPassword: SEED_PASSWORD, newPassword: "nova-senha-123" }, cookie),
    );
    const renewed = (res.headers.get("Set-Cookie") ?? "").split(";")[0];

    expect((await app.request("/api/v1/me", { headers: { Cookie: otherDevice } })).status).toBe(
      401,
    );
    expect((await app.request("/api/v1/me", { headers: { Cookie: cookie } })).status).toBe(401);
    expect((await app.request("/api/v1/me", { headers: { Cookie: renewed } })).status).toBe(200);
  });

  it("troca a senha: 204, a antiga deixa de valer e a nova passa a valer", async () => {
    const res = await app.request(
      "/api/v1/me/password",
      jsonRequest("PUT", { currentPassword: SEED_PASSWORD, newPassword: "nova-senha-123" }, cookie),
    );
    expect(res.status).toBe(204);
    await expect(loginAs(app, USER_EMAIL)).rejects.toThrow();
    await expect(loginAs(app, USER_EMAIL, "nova-senha-123")).resolves.toMatch(/^session=/);
  });

  it("com troca pendente, só libera ver a si mesmo e trocar a senha", async () => {
    findUserByEmail(USER_EMAIL)!.mustChangePassword = true;

    const me = await app.request("/api/v1/me", { headers: { Cookie: cookie } });
    expect(me.status).toBe(200);

    const blocked = await app.request(
      "/api/v1/me",
      jsonRequest("PATCH", { fullName: "X" }, cookie),
    );
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toMatchObject({ code: "PASSWORD_CHANGE_REQUIRED" });

    const change = await app.request(
      "/api/v1/me/password",
      jsonRequest("PUT", { currentPassword: SEED_PASSWORD, newPassword: "nova-senha-123" }, cookie),
    );
    expect(change.status).toBe(204);
    expect(findUserByEmail(USER_EMAIL)!.mustChangePassword).toBe(false);

    // A troca reemite o cookie de quem trocou; é com ele que a sessão segue.
    const renewed = (change.headers.get("Set-Cookie") ?? "").split(";")[0];
    const unblocked = await app.request(
      "/api/v1/me",
      jsonRequest("PATCH", { fullName: "X" }, renewed),
    );
    expect(unblocked.status).toBe(200);
  });
});
