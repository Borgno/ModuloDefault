import { beforeEach, describe, expect, it } from "vitest";
import { store } from "../../lib/memoryStore";
import { findUserByEmail } from "../../services/users/users.service";
import {
  ADMIN_EMAIL,
  jsonRequest,
  loginAs,
  SEED_PASSWORD,
  setupApp,
  USER_EMAIL,
} from "../../test/helpers";

type UserBody = {
  id: string;
  email: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
};
type ListBody = { data: UserBody[]; meta: { page: number; pageSize: number; total: number } };

let app: Awaited<ReturnType<typeof setupApp>>;
let admin: string;

beforeEach(async () => {
  app = await setupApp();
  admin = await loginAs(app, ADMIN_EMAIL);
});

const get = (path: string, cookie = admin) => app.request(path, { headers: { Cookie: cookie } });
const newUser = { email: "ana@local.test", fullName: "Ana", role: "user", password: "inicial-123" };

async function createAna() {
  const res = await app.request("/api/v1/users", jsonRequest("POST", newUser, admin));
  return (await res.json()) as UserBody;
}

describe("autorização", () => {
  it("usuário comum recebe 403 em Problem Details", async () => {
    const user = await loginAs(app, USER_EMAIL);
    const res = await get("/api/v1/users", user);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "FORBIDDEN" });
  });

  it("sem sessão recebe 401", async () => {
    expect((await app.request("/api/v1/users")).status).toBe(401);
  });
});

describe("GET /api/v1/users", () => {
  it("lista com meta de paginação, ordenada por nome", async () => {
    const res = await get("/api/v1/users");
    expect(res.status).toBe(200);
    const body = (await res.json()) as ListBody;
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 2 });
    expect(body.data.map((u) => u.email)).toEqual([ADMIN_EMAIL, USER_EMAIL]);
  });

  it("filtra por busca, role e status na query", async () => {
    await createAna();
    const bySearch = (await (await get("/api/v1/users?search=ANA")).json()) as ListBody;
    expect(bySearch.data.map((u) => u.email)).toEqual(["ana@local.test"]);

    const byRole = (await (await get("/api/v1/users?role=admin")).json()) as ListBody;
    expect(byRole.data.map((u) => u.email)).toEqual([ADMIN_EMAIL]);

    findUserByEmail(USER_EMAIL)!.active = false;
    const inactive = (await (await get("/api/v1/users?active=false")).json()) as ListBody;
    expect(inactive.data.map((u) => u.email)).toEqual([USER_EMAIL]);
  });

  it("pagina e ordena de forma decrescente", async () => {
    await createAna();
    const body = (await (
      await get("/api/v1/users?sort=-fullName&page=2&pageSize=2")
    ).json()) as ListBody;
    // Decrescente por nome: Usuário Comum, Ana, Administrador. A página 2 (de 2) tem só o último.
    expect(body.meta).toEqual({ page: 2, pageSize: 2, total: 3 });
    expect(body.data.map((u) => u.email)).toEqual([ADMIN_EMAIL]);
  });

  it("responde 422 para query inválida", async () => {
    expect((await get("/api/v1/users?pageSize=500")).status).toBe(422);
    expect((await get("/api/v1/users?sort=senha")).status).toBe(422);
    expect((await get("/api/v1/users?active=talvez")).status).toBe(422);
  });
});

describe("POST /api/v1/users", () => {
  it("cria com 201, Location, troca de senha obrigatória e audit", async () => {
    const res = await app.request("/api/v1/users", jsonRequest("POST", newUser, admin));
    expect(res.status).toBe(201);
    const body = (await res.json()) as UserBody;
    expect(res.headers.get("Location")).toBe(`/api/v1/users/${body.id}`);
    expect(body).toMatchObject({
      email: "ana@local.test",
      role: "user",
      active: true,
      mustChangePassword: true,
    });
    expect(store.auditEvents.at(-1)).toMatchObject({ action: "user.created", targetId: body.id });
  });

  it("responde 409 EMAIL_TAKEN com o campo, mesmo com maiúsculas", async () => {
    const res = await app.request(
      "/api/v1/users",
      jsonRequest("POST", { ...newUser, email: "USER@local.test" }, admin),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "EMAIL_TAKEN", errors: [{ field: "email" }] });
  });

  it("responde 422 com os campos inválidos", async () => {
    const res = await app.request(
      "/api/v1/users",
      jsonRequest("POST", { email: "x", fullName: "", role: "root", password: "123" }, admin),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { errors: { field: string }[] };
    expect(body.errors.map((e) => e.field).sort()).toEqual([
      "email",
      "fullName",
      "password",
      "role",
    ]);
  });
});

describe("GET /api/v1/users/{id}", () => {
  it("responde 404 para id inexistente e 422 para id malformado", async () => {
    expect((await get("/api/v1/users/00000000-0000-4000-8000-000000000000")).status).toBe(404);
    expect((await get("/api/v1/users/abc")).status).toBe(422);
  });

  it("responde 405 com Allow para DELETE, que não existe de propósito", async () => {
    const ana = await createAna();
    const res = await app.request(`/api/v1/users/${ana.id}`, {
      method: "DELETE",
      headers: { Cookie: admin },
    });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, PATCH");
  });
});

describe("PATCH /api/v1/users/{id}", () => {
  it("troca a role e registra de/para no audit", async () => {
    const ana = await createAna();
    const res = await app.request(
      `/api/v1/users/${ana.id}`,
      jsonRequest("PATCH", { role: "admin" }, admin),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ role: "admin" });
    expect(store.auditEvents.at(-1)).toMatchObject({
      action: "user.roleChanged",
      data: { from: "user", to: "admin" },
    });
  });

  it("desativar derruba a sessão do usuário na hora", async () => {
    const user = await loginAs(app, USER_EMAIL);
    const target = findUserByEmail(USER_EMAIL)!;
    await app.request(`/api/v1/users/${target.id}`, jsonRequest("PATCH", { active: false }, admin));
    expect((await get("/api/v1/me", user)).status).toBe(401);
    expect(store.auditEvents.at(-1)).toMatchObject({ action: "user.deactivated" });
  });

  it("o admin não desativa nem rebaixa a si mesmo", async () => {
    const me = findUserByEmail(ADMIN_EMAIL)!;
    for (const patch of [{ active: false }, { role: "user" }]) {
      const res = await app.request(`/api/v1/users/${me.id}`, jsonRequest("PATCH", patch, admin));
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ code: "SELF_LOCKOUT" });
    }
  });

  it("responde 422 para corpo vazio", async () => {
    const ana = await createAna();
    const res = await app.request(`/api/v1/users/${ana.id}`, jsonRequest("PATCH", {}, admin));
    expect(res.status).toBe(422);
  });
});

describe("POST /api/v1/users/{id}/passwordResets", () => {
  it("gera senha temporária, derruba a sessão do usuário e obriga a troca", async () => {
    const userSession = await loginAs(app, USER_EMAIL);
    const target = findUserByEmail(USER_EMAIL)!;

    const res = await app.request(
      `/api/v1/users/${target.id}/passwordResets`,
      jsonRequest("POST", undefined, admin),
    );
    expect(res.status).toBe(201);
    const { temporaryPassword } = (await res.json()) as { temporaryPassword: string };
    expect(temporaryPassword).toHaveLength(12);

    expect((await get("/api/v1/me", userSession)).status).toBe(401);
    await expect(loginAs(app, USER_EMAIL, SEED_PASSWORD)).rejects.toThrow();

    const fresh = await loginAs(app, USER_EMAIL, temporaryPassword);
    expect(await (await get("/api/v1/me", fresh)).json()).toMatchObject({
      mustChangePassword: true,
    });
    expect(store.auditEvents.some((e) => e.action === "user.passwordReset")).toBe(true);
  });
});

describe("GET /api/v1/auditEvents", () => {
  it("lista o histórico do alvo, mais recente primeiro, com o nome de quem fez", async () => {
    const ana = await createAna();
    await app.request(`/api/v1/users/${ana.id}`, jsonRequest("PATCH", { role: "admin" }, admin));

    const res = await get(`/api/v1/auditEvents?targetType=user&targetId=${ana.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { action: string; actor: { fullName: string } }[] };
    expect(body.data.map((e) => e.action)).toEqual(["user.roleChanged", "user.created"]);
    expect(body.data[0].actor.fullName).toBe("Administrador");
  });

  it("usuário comum recebe 403", async () => {
    const user = await loginAs(app, USER_EMAIL);
    expect((await get("/api/v1/auditEvents", user)).status).toBe(403);
  });
});
