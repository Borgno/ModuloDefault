import { beforeEach, describe, expect, it, vi } from "vitest";
import { store } from "../../lib/memoryStore";
import { forgetSquelches } from "../../services/notifications/push.service";
import { findUserByEmail } from "../../services/users/users.service";
import {
  ADMIN_EMAIL,
  jsonRequest,
  loginAs,
  SEED_PASSWORD,
  setupApp,
  USER_EMAIL,
} from "../../test/helpers";

// O push só é registrado: o envio de verdade vai ao serviço de push do navegador.
const sent = vi.hoisted(() => ({ calls: [] as { endpoint: string; payload: unknown }[] }));
vi.mock("web-push", async (importOriginal) => {
  const real = (await importOriginal<{ default: typeof import("web-push") }>()).default;
  return {
    default: {
      ...real,
      sendNotification: vi.fn(async (sub: { endpoint: string }, payload: string) => {
        sent.calls.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
      }),
    },
  };
});

type Conversation = {
  id: string;
  kind: "direct" | "group";
  name: string;
  unreadCount: number;
  markedUnread: boolean;
  mentioned: boolean;
  muted: boolean;
  mutedUntil: string | null;
  archived: boolean;
  lastMessage: { text: string } | null;
  lastReaction: { authorName: string; emoji: string; text: string } | null;
};
type Message = { id: string; seq: number; text: string; replyTo: { id: string } | null };

let app: Awaited<ReturnType<typeof setupApp>>;
let admin: string;
let user: string;
let adminId: string;
let userId: string;
let thirdId: string;
let third: string;

beforeEach(async () => {
  app = await setupApp();
  sent.calls = [];
  admin = await loginAs(app, ADMIN_EMAIL);
  user = await loginAs(app, USER_EMAIL);
  adminId = findUserByEmail(ADMIN_EMAIL)!.id;
  userId = findUserByEmail(USER_EMAIL)!.id;
  // Terceira pessoa, para os grupos.
  const res = await app.request(
    "/api/v1/users",
    jsonRequest(
      "POST",
      { email: "carla@local.test", fullName: "Carla", role: "user", password: SEED_PASSWORD },
      admin,
    ),
  );
  thirdId = ((await res.json()) as { id: string }).id;
  store.users.get(thirdId)!.mustChangePassword = false;
  third = await loginAs(app, "carla@local.test");
});

const api = async <T>(cookie: string, method: string, path: string, body?: unknown) => {
  const res = await app.request(`/api/v1${path}`, jsonRequest(method, body, cookie));
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
};

const direct = async (from = admin, to = userId) =>
  (await api<Conversation>(from, "POST", "/conversations", { kind: "direct", memberId: to })).body;
const group = async () =>
  (
    await api<Conversation>(admin, "POST", "/conversations", {
      kind: "group",
      name: "Equipe",
      memberIds: [userId, thirdId],
    })
  ).body;
const send = async (cookie: string, conversationId: string, body: object) => {
  forgetSquelches();
  return (await api<Message>(cookie, "POST", `/conversations/${conversationId}/messages`, body))
    .body;
};
const summary = async (cookie: string, id: string) =>
  (await api<Conversation>(cookie, "GET", `/conversations/${id}`)).body;
const list = async (cookie: string, filter = "all") =>
  (
    await api<{ data: Conversation[]; meta: { unreadConversations: number } }>(
      cookie,
      "GET",
      `/conversations?filter=${filter}`,
    )
  ).body;
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
const subscribe = (cookie: string, endpoint: string, preferences: object = {}) =>
  api(cookie, "POST", "/pushSubscriptions", {
    endpoint,
    keys: { p256dh: "p", auth: "a" },
    preferences,
  });
const pushed = () => sent.calls.map((call) => call.payload as { title: string; body: string });

describe("conversas", () => {
  it("conversa de duas pessoas é uma só, e o nome é o da outra pessoa", async () => {
    const first = await api<Conversation>(admin, "POST", "/conversations", {
      kind: "direct",
      memberId: userId,
    });
    expect(first.status).toBe(201);
    expect(first.body.name).toBe("Usuário Comum");
    const again = await api<Conversation>(user, "POST", "/conversations", {
      kind: "direct",
      memberId: adminId,
    });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ id: first.body.id, name: "Administrador" });
  });

  it("quem não está na conversa não a vê", async () => {
    const conversation = await direct();
    expect((await api(third, "GET", `/conversations/${conversation.id}`)).status).toBe(404);
    expect(
      (await api(third, "POST", `/conversations/${conversation.id}/messages`, { text: "oi" }))
        .status,
    ).toBe(404);
  });

  it("não lidas são de cada pessoa; responder lê só para quem respondeu", async () => {
    const conversation = await group();
    await send(admin, conversation.id, { text: "um" });
    await send(admin, conversation.id, { text: "dois" });
    expect((await summary(user, conversation.id)).unreadCount).toBe(2);
    expect((await summary(admin, conversation.id)).unreadCount).toBe(0);

    await send(user, conversation.id, { text: "resposta" });
    expect((await summary(user, conversation.id)).unreadCount).toBe(0);
    expect((await summary(third, conversation.id)).unreadCount).toBe(3);
    expect((await summary(admin, conversation.id)).unreadCount).toBe(1);
  });

  it("marcar como não lida põe só a bolinha; ler tira", async () => {
    const conversation = await direct();
    await send(admin, conversation.id, { text: "oi" });
    await api(user, "PATCH", `/conversations/${conversation.id}`, { read: true });
    const marked = (
      await api<Conversation>(user, "PATCH", `/conversations/${conversation.id}`, { read: false })
    ).body;
    expect(marked).toMatchObject({ unreadCount: 0, markedUnread: true });
    expect((await list(user, "unread")).data.map((c) => c.id)).toEqual([conversation.id]);
    // Só marcada não conta no (N) da aba.
    expect((await list(user)).meta.unreadConversations).toBe(0);
    await api(user, "PATCH", `/conversations/${conversation.id}`, { read: true });
    expect((await summary(user, conversation.id)).markedUnread).toBe(false);
  });

  it("ler vai só até a mensagem vista, e nunca volta atrás", async () => {
    const conversation = await direct();
    const first = await send(admin, conversation.id, { text: "um" });
    await send(admin, conversation.id, { text: "dois" });
    const read = (body: object) =>
      api<Conversation>(user, "PATCH", `/conversations/${conversation.id}`, {
        read: true,
        ...body,
      });
    expect((await read({ readUntil: first.seq })).body.unreadCount).toBe(1);
    expect((await read({ readUntil: 0 })).body.unreadCount).toBe(1);
    expect((await read({})).body.unreadCount).toBe(0);
  });

  it("arquivada sai da lista e só volta ao desarquivar, mesmo com mensagem nova", async () => {
    const conversation = await direct();
    await api(user, "PATCH", `/conversations/${conversation.id}`, { archived: true });
    await send(admin, conversation.id, { text: "oi" });
    expect((await list(user)).data).toEqual([]);
    expect((await list(user, "archived")).data.map((c) => c.id)).toEqual([conversation.id]);
    expect((await list(user)).meta.unreadConversations).toBe(0);
    await api(user, "PATCH", `/conversations/${conversation.id}`, { archived: false });
    expect((await list(user)).data.map((c) => c.id)).toEqual([conversation.id]);
  });

  it("silenciar por 8 horas, 1 semana ou sempre", async () => {
    const conversation = await direct();
    const muted = (
      await api<Conversation>(user, "PATCH", `/conversations/${conversation.id}`, { mute: "8h" })
    ).body;
    expect(muted.muted).toBe(true);
    const hours = (new Date(muted.mutedUntil!).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(7.9);
    const forever = (
      await api<Conversation>(user, "PATCH", `/conversations/${conversation.id}`, {
        mute: "always",
      })
    ).body;
    expect(forever).toMatchObject({ muted: true, mutedUntil: null });
    const back = (
      await api<Conversation>(user, "PATCH", `/conversations/${conversation.id}`, { mute: null })
    ).body;
    expect(back.muted).toBe(false);
  });

  it("mensagens em páginas para trás", async () => {
    const conversation = await direct();
    for (let i = 1; i <= 5; i++) await send(admin, conversation.id, { text: `m${i}` });
    const last = (
      await api<{ data: Message[]; meta: { hasMore: boolean } }>(
        user,
        "GET",
        `/conversations/${conversation.id}/messages?limit=2`,
      )
    ).body;
    expect(last.data.map((m) => m.text)).toEqual(["m4", "m5"]);
    expect(last.meta.hasMore).toBe(true);
    const older = (
      await api<{ data: Message[]; meta: { hasMore: boolean } }>(
        user,
        "GET",
        `/conversations/${conversation.id}/messages?limit=10&before=${last.data[0].seq}`,
      )
    ).body;
    expect(older.data.map((m) => m.text)).toEqual(["m1", "m2", "m3"]);
    expect(older.meta.hasMore).toBe(false);
  });

  it("citação de mensagem que não é da conversa é recusada", async () => {
    const a = await direct();
    const b = await direct(admin, thirdId);
    const message = await send(admin, a.id, { text: "oi" });
    const res = await api(admin, "POST", `/conversations/${b.id}/messages`, {
      text: "x",
      replyToId: message.id,
    });
    expect(res.status).toBe(422);
  });

  it("pessoas para conversar: ativas, sem a própria", async () => {
    store.users.get(thirdId)!.active = false;
    const res = await api<{ data: { fullName: string }[] }>(user, "GET", "/contacts");
    expect(res.body.data.map((p) => p.fullName)).toEqual(["Administrador"]);
  });
});

describe("avisos de conversa por Web Push", () => {
  it("duas pessoas: o texto; grupo: Fulano e o texto", async () => {
    await subscribe(user, "https://push.example.test/user");
    const conversation = await direct();
    await send(admin, conversation.id, { text: "oi" });
    const team = await group();
    await send(third, team.id, { text: "bom dia" });
    await settle();
    expect(pushed()).toEqual([
      expect.objectContaining({ title: "Administrador", body: "oi", kind: "conversation" }),
      expect.objectContaining({ title: "Equipe", body: "Carla: bom dia" }),
    ]);
  });

  it("sem prévia: N novas mensagens, ou Mensagem de Fulano no grupo", async () => {
    await subscribe(user, "https://push.example.test/user", { previews: false });
    const conversation = await direct();
    await send(admin, conversation.id, { text: "um" });
    await send(admin, conversation.id, { text: "dois" });
    const team = await group();
    await send(third, team.id, { text: "segredo" });
    await settle();
    expect(pushed().map((p) => p.body)).toEqual([
      "1 nova mensagem",
      "2 novas mensagens",
      "Mensagem de Carla",
    ]);
  });

  it("grupo agitado: um aviso a cada intervalo", async () => {
    await subscribe(user, "https://push.example.test/user");
    const team = await group();
    forgetSquelches();
    for (const text of ["a", "b", "c"]) {
      await api(third, "POST", `/conversations/${team.id}/messages`, { text });
    }
    await settle();
    expect(pushed().map((p) => p.body)).toEqual(["Carla: a"]);
  });

  it("silenciada ou arquivada só avisa menção ou resposta, com o prefixo", async () => {
    await subscribe(user, "https://push.example.test/user");
    const team = await group();
    const mine = await send(user, team.id, { text: "minha" });
    await api(user, "PATCH", `/conversations/${team.id}`, { mute: "always" });
    await send(third, team.id, { text: "nada" });
    await send(third, team.id, { text: "@Usuário Comum veja", mentionIds: [userId] });
    await send(third, team.id, { text: "concordo", replyToId: mine.id });
    await api(user, "PATCH", `/conversations/${team.id}`, { mute: null, archived: true });
    await send(admin, team.id, { text: "@todos reunião", mentionsAll: true });
    await settle();
    expect(pushed().map((p) => p.body)).toEqual([
      "Mencionou você: Carla: @Usuário Comum veja",
      "Respondeu a você: Carla: concordo",
      "Mencionou você: Administrador: @todos reunião",
    ]);
    // Silenciada com menção conta no (N) da aba; arquivada não.
    const summaryNow = await summary(user, team.id);
    expect(summaryNow).toMatchObject({ mentioned: true, archived: true });
  });

  it("silenciada com menção conta no (N) da aba; sem menção, não", async () => {
    const team = await group();
    await api(user, "PATCH", `/conversations/${team.id}`, { mute: "1w" });
    await send(third, team.id, { text: "nada" });
    expect((await list(user)).meta.unreadConversations).toBe(0);
    await send(third, team.id, { text: "@todos", mentionsAll: true });
    expect((await list(user)).meta.unreadConversations).toBe(1);
  });

  it("reação de outra pessoa vira a prévia e avisa quem escreveu", async () => {
    await subscribe(admin, "https://push.example.test/admin");
    const conversation = await direct();
    const message = await send(admin, conversation.id, { text: "relatório pronto" });
    forgetSquelches();
    const res = await api(
      user,
      "PUT",
      `/conversations/${conversation.id}/messages/${message.id}/myReaction`,
      { emoji: "❤️" },
    );
    expect(res.status).toBe(200);
    await settle();
    expect(pushed().at(-1)).toMatchObject({
      title: "Usuário Comum",
      body: "Reagiu ❤️ a: relatório pronto",
    });
    expect((await summary(admin, conversation.id)).lastReaction).toMatchObject({
      authorName: "Usuário Comum",
      emoji: "❤️",
    });
    // Reação não deixa a conversa não lida.
    expect((await summary(admin, conversation.id)).unreadCount).toBe(0);

    const removed = await api(
      user,
      "DELETE",
      `/conversations/${conversation.id}/messages/${message.id}/myReaction`,
    );
    expect(removed.status).toBe(204);
    expect((await summary(admin, conversation.id)).lastReaction).toBeNull();
  });

  it("as configurações de mensagens e de grupos são separadas", async () => {
    await subscribe(user, "https://push.example.test/user", { groups: { show: false } });
    const conversation = await direct();
    await send(admin, conversation.id, { text: "direta" });
    const team = await group();
    await send(third, team.id, { text: "grupo" });
    await settle();
    expect(pushed().map((p) => p.body)).toEqual(["direta"]);
  });
});
