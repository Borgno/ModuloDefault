import { findUserByEmail } from "../../services/users/users.service";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../env";
import { store } from "../../lib/memoryStore";
import { notifyUser } from "../../services/notifications/notifications.service";
import { forgetSquelches } from "../../services/notifications/push.service";
import { openStream } from "../../services/notifications/stream.service";
import {
  ADMIN_EMAIL,
  jsonRequest,
  loginAs,
  SEED_PASSWORD,
  setupApp,
  USER_EMAIL,
} from "../../test/helpers";

// O envio de verdade vai a um serviço de push do navegador. Aqui só se registra o que sairia; a
// geração do par VAPID continua a real.
const sent = vi.hoisted(() => ({ calls: [] as { endpoint: string; payload: unknown }[] }));
const failWith = vi.hoisted(() => ({ status: 0 }));
vi.mock("web-push", async (importOriginal) => {
  const real = (await importOriginal<{ default: typeof import("web-push") }>()).default;
  return {
    default: {
      ...real,
      sendNotification: vi.fn(async (sub: { endpoint: string }, payload: string) => {
        if (failWith.status)
          throw Object.assign(new Error("push"), { statusCode: failWith.status });
        sent.calls.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
      }),
    },
  };
});

let app: Awaited<ReturnType<typeof setupApp>>;
let user: string;
let userId: string;

beforeEach(async () => {
  app = await setupApp();
  sent.calls = [];
  failWith.status = 0;
  user = await loginAs(app, USER_EMAIL);
  userId = findUserByEmail(USER_EMAIL)!.id;
});

const ENDPOINT = "https://push.example.test/abc";
const subscribe = async (cookie = user, body: object = {}) => {
  const res = await app.request(
    "/api/v1/pushSubscriptions",
    jsonRequest("POST", { endpoint: ENDPOINT, keys: { p256dh: "p", auth: "a" }, ...body }, cookie),
  );
  return { res, body: (await res.json()) as { id: string } };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

// O push sai depois da resposta (o notifyUser não espera o envio). Cada chamada é um aviso novo,
// fora do intervalo do anterior.
const notifyAndSettle = async (
  title = "Aviso",
  body = "texto",
  extra: { senderName?: string; important?: boolean } = {},
) => {
  forgetSquelches();
  notifyUser(userId, { title, body, url: "/profile", ...extra });
  await settle();
};

describe("GET /api/v1/pushKey", () => {
  const getKey = async () =>
    (
      (await (await app.request("/api/v1/pushKey", { headers: { Cookie: user } })).json()) as {
        publicKey: string;
      }
    ).publicKey;

  it("usa o par do .env", async () => {
    const saved = { ...env };
    env.VAPID_PUBLIC_KEY = "chave-publica-do-env";
    env.VAPID_PRIVATE_KEY = "chave-privada-do-env";
    try {
      expect(await getKey()).toBe("chave-publica-do-env");
      expect(store.vapidKeys).toBeNull();
    } finally {
      Object.assign(env, saved);
    }
  });

  it("sem o par no .env (dev e teste), gera um e devolve sempre o mesmo", async () => {
    const saved = { ...env };
    env.VAPID_PUBLIC_KEY = undefined;
    env.VAPID_PRIVATE_KEY = undefined;
    try {
      const first = await getKey();
      expect(first).toMatch(/^[A-Za-z0-9_-]{80,}$/);
      expect(await getKey()).toBe(first);
      expect(store.vapidKeys?.publicKey).toBe(first);
    } finally {
      Object.assign(env, saved);
    }
  });
});

describe("POST e DELETE /api/v1/pushSubscriptions", () => {
  it("inscreve preso à sessão e cancela pelo id", async () => {
    const { res, body } = await subscribe();
    expect(res.status).toBe(201);
    expect(res.headers.get("Location")).toBe(`/api/v1/pushSubscriptions/${body.id}`);
    const saved = [...store.pushSubscriptions.values()].find((s) => s.id === body.id)!;
    expect(saved).toMatchObject({ userId, sessionVersion: 1 });
    expect(saved.sessionExpiresAt.getTime()).toBeGreaterThan(Date.now());

    const del = await app.request(`/api/v1/pushSubscriptions/${body.id}`, {
      method: "DELETE",
      headers: { Cookie: user },
    });
    expect(del.status).toBe(204);
    expect(store.pushSubscriptions.size).toBe(0);
  });

  it("recusa endpoint fora de https", async () => {
    const res = await app.request(
      "/api/v1/pushSubscriptions",
      jsonRequest("POST", { endpoint: "http://x.test/a", keys: { p256dh: "p", auth: "a" } }, user),
    );
    expect(res.status).toBe(422);
  });

  it("o mesmo navegador inscrito por outro usuário passa a ser dele", async () => {
    await subscribe();
    await subscribe(await loginAs(app, ADMIN_EMAIL));
    const all = [...store.pushSubscriptions.values()];
    expect(all).toHaveLength(1);
    expect(all[0].userId).toBe(findUserByEmail(ADMIN_EMAIL)!.id);
  });

  it("não cancela a inscrição de outro usuário", async () => {
    const { body } = await subscribe();
    const res = await app.request(`/api/v1/pushSubscriptions/${body.id}`, {
      method: "DELETE",
      headers: { Cookie: await loginAs(app, ADMIN_EMAIL) },
    });
    expect(res.status).toBe(404);
  });

  it("o logout apaga a inscrição da sessão", async () => {
    await subscribe();
    await app.request("/api/v1/sessions/current", { method: "DELETE", headers: { Cookie: user } });
    expect(store.pushSubscriptions.size).toBe(0);
  });

  it("a troca da própria senha mantém a inscrição desta sessão", async () => {
    await subscribe();
    const res = await app.request(
      "/api/v1/me/password",
      jsonRequest("PUT", { currentPassword: SEED_PASSWORD, newPassword: "nova-senha-123" }, user),
    );
    expect(res.status).toBe(204);
    await notifyAndSettle();
    expect(sent.calls).toHaveLength(1);
  });
});

describe("envio por Web Push", () => {
  it("avisa o navegador fechado com título, texto, caminho e som", async () => {
    await subscribe();
    await notifyAndSettle("Seu cargo mudou", "Agora você é Administrador.");
    expect(sent.calls).toEqual([
      {
        endpoint: ENDPOINT,
        payload: expect.objectContaining({
          title: "Seu cargo mudou",
          body: "Agora você é Administrador.",
          url: "/profile",
          silent: false,
        }),
      },
    ]);
  });

  it("não manda push para o navegador que está com o app aberto", async () => {
    await subscribe();
    const close = openStream(
      userId,
      ENDPOINT,
      () => {},
      () => {},
    );
    await notifyAndSettle();
    close();
    expect(sent.calls).toEqual([]);
  });

  it("segue as configurações do navegador: desligada, sem som e sem prévia", async () => {
    await subscribe(user, { preferences: { notices: { show: false } } });
    await notifyAndSettle();
    expect(sent.calls).toEqual([]);

    await subscribe(user, { preferences: { notices: { sound: false }, previews: false } });
    await notifyAndSettle("Segredo", "não aparece");
    expect(sent.calls.at(-1)?.payload).toMatchObject({
      title: "Nova notificação",
      body: "2 notificações não lidas",
      silent: true,
    });
  });

  it("sem prévia e com remetente, diz de quem é", async () => {
    await subscribe(user, { preferences: { previews: false } });
    await notifyAndSettle("Segredo", "não aparece", { senderName: "Administrador" });
    expect(sent.calls.at(-1)?.payload).toMatchObject({
      title: "Nova notificação",
      body: "Notificação de Administrador",
    });
  });

  it("as configurações valem por tipo: avisos desligados não chegam", async () => {
    await subscribe(user, { preferences: { notices: { show: false }, messages: { show: true } } });
    await notifyAndSettle();
    expect(sent.calls).toEqual([]);
  });

  it("vários avisos seguidos: um push a cada intervalo", async () => {
    await subscribe();
    notifyUser(userId, { title: "Um", body: "a" });
    notifyUser(userId, { title: "Dois", body: "b" });
    await settle();
    expect(sent.calls.map((call) => (call.payload as { title: string }).title)).toEqual(["Um"]);
  });

  it("avisos silenciados não chegam, a não ser o importante", async () => {
    await subscribe();
    const res = await app.request("/api/v1/noticeMute", jsonRequest("PUT", { mute: "8h" }, user));
    expect(await res.json()).toMatchObject({ muted: true });
    await notifyAndSettle("Comum", "x");
    expect(sent.calls).toEqual([]);
    await notifyAndSettle("Urgente", "y", { important: true });
    expect(sent.calls.map((call) => (call.payload as { title: string }).title)).toEqual([
      "Urgente",
    ]);
  });

  it("reset de senha e conta desativada apagam a inscrição no próximo envio", async () => {
    await subscribe();
    findUserByEmail(USER_EMAIL)!.sessionVersion += 1;
    await notifyAndSettle();
    expect(sent.calls).toEqual([]);
    expect(store.pushSubscriptions.size).toBe(0);

    const fresh = await loginAs(app, USER_EMAIL);
    await subscribe(fresh);
    findUserByEmail(USER_EMAIL)!.active = false;
    await notifyAndSettle();
    expect(store.pushSubscriptions.size).toBe(0);
  });

  it("sessão vencida não recebe", async () => {
    await subscribe();
    for (const s of store.pushSubscriptions.values()) s.sessionExpiresAt = new Date(0);
    await notifyAndSettle();
    expect(sent.calls).toEqual([]);
  });

  it("inscrição que o serviço de push recusa (410) é apagada", async () => {
    await subscribe();
    failWith.status = 410;
    await notifyAndSettle();
    expect(store.pushSubscriptions.size).toBe(0);
  });
});
