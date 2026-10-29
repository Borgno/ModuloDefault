import type { Router } from "../lib/router";
import auditEvents from "./auditEvents";
import contacts from "./contacts";
import conversations from "./conversations";
import me from "./me";
import noticeMute from "./noticeMute";
import events from "./events";
import notifications from "./notifications";
import pushSubscriptions from "./pushSubscriptions";
import sessions from "./sessions";
import users from "./users";
import userStats from "./userStats";
import pushKey from "./pushKey";

// Módulos montados sob /api/v1, como [path, router].
export const modules: Array<[string, Router]> = [
  ["/sessions", sessions],
  ["/me", me],
  ["/users", users],
  ["/auditEvents", auditEvents],
  ["/userStats", userStats],
  ["/notifications", notifications],
  ["/events", events],
  ["/pushSubscriptions", pushSubscriptions],
  ["/pushKey", pushKey],
  ["/noticeMute", noticeMute],
  ["/conversations", conversations],
  ["/contacts", contacts],
];
