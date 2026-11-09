import { findUserByEmail } from "../../services/users/users.service";
import { beforeEach, describe, expect, it } from "vitest";
import { store } from "../../lib/memoryStore";
import { notifyUser } from "../../services/notifications/notifications.service";
import { ADMIN_EMAIL, jsonRequest, loginAs, setupApp, USER_EMAIL } from "../../test/helpers";

type NotificationBody = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
};
type ListBody = {
  data: NotificationBody[];
  meta: { page: number; pageSize: number; total: number; unread: number };
};

let app: Awaited<ReturnType<typeof setupApp>>;
let user: string;
let userId: string;

beforeEach(async () => {
  app = await setupApp();
  user = await loginAs(app, USER_EMAIL);
  userId = findUserByEmail(USER_EMAIL)!.id;
});

const list = async (query = "", cookie = user) =>
  (await (
    await app.request(`/api/v1/notifications${query}`, { headers: { Cookie: cookie } })
  ).json()) as ListBody;

describe("GET /api/v1/notifications", () => {
  it("exige sessão", async () => {
    expect((await app.request("/api/v1/notifications")).status).toBe(401);
  });

  it("lista só as do usuário, mais recentes primeiro, com o total de não lidas", async () => {
    await notifyUser(userId, { title: "Primeira", body: "a" });
    await notifyUser(userId, { title: "Segunda", body: "b", url: "/profile" });
    await notifyUser(findUserByEmail(ADMIN_EMAIL)!.id, { title: "Do admin", body: "c" });

    const body = await list();
    expect(body.data.map((n) => n.title)).toEqual(["Segunda", "Primeira"]);
    expect(body.data[0]).toMatchObject({ url: "/profile", read: false });
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 2, unread: 2 });
  });

  it("busca sem acento, por campo:valor e filtra lidas", async () => {
    const lida = await notifyUser(userId, { title: "Relatório pronto", body: "Baixe o arquivo" });
    await notifyUser(userId, { title: "Cargo alterado", body: "Agora você é Administrador" });
    store.notifications.find((n) => n.id === lida.id)!.readAt = new Date();

    expect((await list("?search=relatorio")).data.map((n) => n.title)).toEqual([
      "Relatório pronto",
    ]);
    expect((await list("?search=texto:voce")).data.map((n) => n.title)).toEqual(["Cargo alterado"]);
    expect((await list("?read=false")).data.map((n) => n.title)).toEqual(["Cargo alterado"]);
    expect((await list("?read=true")).meta).toMatchObject({ total: 1, unread: 1 });
  });
});

describe("PATCH /api/v1/notifications/{id}", () => {
  it("marca como lida e de volta como não lida", async () => {
    const n = await notifyUser(userId, { title: "Aviso", body: "x" });
    const patch = (read: boolean) =>
      app.request(`/api/v1/notifications/${n.id}`, jsonRequest("PATCH", { read }, user));

    const read = await patch(true);
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ id: n.id, read: true });
    expect((await list()).meta.unread).toBe(0);

    await patch(false);
    expect((await list()).meta.unread).toBe(1);
  });

  it("notificação de outro usuário responde 404", async () => {
    const n = await notifyUser(findUserByEmail(ADMIN_EMAIL)!.id, { title: "Do admin", body: "x" });
    const res = await app.request(
      `/api/v1/notifications/${n.id}`,
      jsonRequest("PATCH", { read: true }, user),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "NOTIFICATION_NOT_FOUND" });
  });
});

describe("arquivar e silenciar", () => {
  it("arquivada sai da lista e do contador, e volta ao desarquivar", async () => {
    const n = notifyUser(userId, { title: "Antiga", body: "x" });
    notifyUser(userId, { title: "Nova", body: "y" });
    const patch = (body: object) =>
      app.request(`/api/v1/notifications/${n.id}`, jsonRequest("PATCH", body, user));
    expect(await (await patch({ archived: true })).json()).toMatchObject({ archived: true });

    expect((await list()).data.map((x) => x.title)).toEqual(["Nova"]);
    expect((await list()).meta.unread).toBe(1);
    expect((await list("?archived=true")).data.map((x) => x.title)).toEqual(["Antiga"]);

    await patch({ archived: false });
    expect((await list()).meta.unread).toBe(2);
  });

  it("PATCH sem campo responde 422", async () => {
    const n = notifyUser(userId, { title: "A", body: "x" });
    const res = await app.request(`/api/v1/notifications/${n.id}`, jsonRequest("PATCH", {}, user));
    expect(res.status).toBe(422);
  });

  it("silencia os avisos por 1 semana e volta", async () => {
    const put = async (mute: string | null) =>
      (await (
        await app.request("/api/v1/noticeMute", jsonRequest("PUT", { mute }, user))
      ).json()) as { muted: boolean; mutedUntil: string | null };
    const week = await put("1w");
    expect(week.muted).toBe(true);
    expect(new Date(week.mutedUntil!).getTime() - Date.now()).toBeGreaterThan(6.9 * 86_400_000);
    expect(await put("always")).toEqual({ muted: true, mutedUntil: null });
    expect(await put(null)).toEqual({ muted: false, mutedUntil: null });
    const current = await app.request("/api/v1/noticeMute", { headers: { Cookie: user } });
    expect(await current.json()).toEqual({ muted: false, mutedUntil: null });
  });
});

describe("PATCH /api/v1/notifications", () => {
  it("marca todas como lidas", async () => {
    await notifyUser(userId, { title: "A", body: "a" });
    await notifyUser(userId, { title: "B", body: "b" });
    const res = await app.request(
      "/api/v1/notifications",
      jsonRequest("PATCH", { read: true }, user),
    );
    expect(res.status).toBe(204);
    expect((await list()).meta.unread).toBe(0);
  });

  it("não aceita desmarcar todas", async () => {
    const res = await app.request(
      "/api/v1/notifications",
      jsonRequest("PATCH", { read: false }, user),
    );
    expect(res.status).toBe(422);
  });
});

describe("notificação de exemplo: mudança feita por um admin", () => {
  let admin: string;
  beforeEach(async () => {
    admin = await loginAs(app, ADMIN_EMAIL);
  });
  const patchUser = (id: string, body: object, cookie = admin) =>
    app.request(`/api/v1/users/${id}`, jsonRequest("PATCH", body, cookie));

  it("avisa quem teve o cargo mudado", async () => {
    await patchUser(userId, { role: "admin" });
    expect((await list()).data).toEqual([
      expect.objectContaining({
        title: "Seu cargo mudou",
        body: "Agora você é Administrador.",
        url: "/profile",
      }),
    ]);
  });

  it("avisa quem foi reativado, e não quem foi desativado", async () => {
    await patchUser(userId, { active: false });
    expect(store.notifications).toHaveLength(0);
    await patchUser(userId, { active: true });
    const fresh = await loginAs(app, USER_EMAIL);
    expect((await list("", fresh)).data.map((n) => n.title)).toEqual(["Sua conta foi reativada"]);
  });

  it("não avisa quem mudou o próprio nome", async () => {
    await app.request("/api/v1/me", jsonRequest("PATCH", { fullName: "Outro Nome" }, user));
    expect(store.notifications).toHaveLength(0);
  });
});
