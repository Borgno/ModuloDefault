import type { Router } from "../lib/router";
import auditEvents from "./auditEvents";
import me from "./me";
import sessions from "./sessions";
import users from "./users";
import userStats from "./userStats";

// Módulos montados sob /api/v1, como [path, router].
export const modules: Array<[string, Router]> = [
  ["/sessions", sessions],
  ["/me", me],
  ["/users", users],
  ["/auditEvents", auditEvents],
  ["/userStats", userStats],
];
