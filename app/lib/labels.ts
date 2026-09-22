import type { Role } from "~/types/user";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  user: "Usuário",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.created": "Usuário criado",
  "user.updated": "Nome alterado",
  "user.roleChanged": "Cargo alterado",
  "user.deactivated": "Usuário desativado",
  "user.activated": "Usuário reativado",
  "user.passwordReset": "Senha resetada",
  "user.passwordChanged": "Senha trocada pelo usuário",
};
