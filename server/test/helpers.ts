import { createApp } from "../app";
import { resetStore } from "../lib/memoryStore";
import { resetLoginThrottle } from "../services/auth/loginThrottle.service";
import { seedUsers } from "../services/users/users.service";

export const SEED_PASSWORD = "seed-password";
export const ADMIN_EMAIL = "admin@local.test";
export const USER_EMAIL = "user@local.test";

export async function setupApp() {
  resetStore();
  resetLoginThrottle();
  await seedUsers(SEED_PASSWORD);
  return createApp();
}

type App = Awaited<ReturnType<typeof setupApp>>;

export function jsonRequest(method: string, body?: unknown, cookie?: string): RequestInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  return { method, headers, body: body === undefined ? undefined : JSON.stringify(body) };
}

// Faz login e devolve o cookie "session=..." pronto para o header Cookie.
export async function loginAs(app: App, email: string, password = SEED_PASSWORD) {
  const res = await app.request("/api/v1/sessions", jsonRequest("POST", { email, password }));
  if (res.status !== 201) throw new Error(`login falhou: ${res.status}`);
  const setCookie = res.headers.get("Set-Cookie") ?? "";
  return setCookie.split(";")[0];
}
