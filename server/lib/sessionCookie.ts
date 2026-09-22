import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const cookieOptions = {
  httpOnly: true,
  sameSite: "Lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE_SECONDS });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, cookieOptions);
}
