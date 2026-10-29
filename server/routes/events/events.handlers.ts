import type { RouteHandler } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";
import { openStream } from "../../services/notifications/stream.service";
import type { HonoEnv } from "../../types";
import type { streamEventsRoute } from "./events.routes";

// Menor que o timeout de ociosidade dos proxies (60 s no Traefik e no nginx): a conexão não cai
// parada, e a aba percebe a queda em até 45 s sem ping (app/lib/notifier/realtime.ts). É evento e não
// comentário SSE porque o EventSource não entrega comentário ao JavaScript.
const PING_MS = 20_000;

export const streamEventsHandler: RouteHandler<typeof streamEventsRoute, HonoEnv> = (c) => {
  const userId = c.get("user").id;
  const { pushEndpoint } = c.req.valid("query");
  // Proxy com buffer (nginx) seguraria os eventos até encher.
  c.header("X-Accel-Buffering", "no");
  return streamSSE(c, async (stream) => {
    let end = () => {};
    const ended = new Promise<void>((resolve) => {
      end = resolve;
      stream.onAbort(resolve);
    });
    const close = openStream(
      userId,
      pushEndpoint ?? null,
      (event) => void stream.writeSSE({ event: event.type, data: JSON.stringify(event.data) }),
      () => end(),
    );
    const ping = setInterval(() => void stream.writeSSE({ event: "ping", data: "{}" }), PING_MS);
    await stream.writeSSE({ event: "ready", data: "{}" });
    await ended;
    clearInterval(ping);
    close();
  }) as never;
};
