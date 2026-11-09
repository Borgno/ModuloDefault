import { findUserByEmail } from "../../services/users/users.service";
import { beforeEach, describe, expect, it } from "vitest";
import { notifyUser } from "../../services/notifications/notifications.service";
import { jsonRequest, loginAs, setupApp, USER_EMAIL } from "../../test/helpers";

let app: Awaited<ReturnType<typeof setupApp>>;
let user: string;
let userId: string;

beforeEach(async () => {
  app = await setupApp();
  user = await loginAs(app, USER_EMAIL);
  userId = findUserByEmail(USER_EMAIL)!.id;
});

// Lê o stream até juntar `count` eventos (sem os comentários de ping).
async function openEvents() {
  const controller = new AbortController();
  const res = await app.request("/api/v1/events", {
    headers: { Cookie: user },
    signal: controller.signal,
  });
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  const next = async () => {
    while (!buffer.includes("\n\n")) {
      const { value, done } = await reader.read();
      if (done) throw new Error("stream fechou");
      buffer += value;
    }
    const [raw] = buffer.split("\n\n", 1);
    buffer = buffer.slice(raw.length + 2);
    const field = (name: string) =>
      raw
        .split("\n")
        .find((line) => line.startsWith(`${name}:`))
        ?.slice(name.length + 1)
        .trim();
    return { event: field("event"), data: JSON.parse(field("data") ?? "null") as unknown };
  };
  return { res, next, close: () => controller.abort() };
}

describe("GET /api/v1/events", () => {
  it("exige sessão", async () => {
    expect((await app.request("/api/v1/events")).status).toBe(401);
  });

  it("manda a notificação nova e a leitura, com o contador", async () => {
    const stream = await openEvents();
    expect(stream.res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(await stream.next()).toEqual({ event: "ready", data: {} });

    const n = await notifyUser(userId, { title: "Aviso", body: "texto" });
    expect(await stream.next()).toEqual({
      event: "notification",
      data: { notification: expect.objectContaining({ id: n.id, title: "Aviso" }), unread: 1 },
    });

    await app.request(`/api/v1/notifications/${n.id}`, jsonRequest("PATCH", { read: true }, user));
    expect(await stream.next()).toEqual({ event: "read", data: { ids: [n.id], unread: 0 } });

    await app.request(`/api/v1/notifications/${n.id}`, jsonRequest("PATCH", { read: false }, user));
    expect(await stream.next()).toEqual({ event: "unread", data: { unread: 1 } });

    await app.request("/api/v1/notifications", jsonRequest("PATCH", { read: true }, user));
    expect(await stream.next()).toEqual({ event: "read", data: { ids: null, unread: 0 } });
    stream.close();
  });
});
