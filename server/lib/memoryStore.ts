// Dados em memória. Ocupa o lugar do client do banco nesta etapa: só server/services/ importa este
// arquivo (regra do ESLint). Restart zera tudo e volta ao seed.

export const ROLES = [
  { code: "admin", name: "Administrador" },
  { code: "user", name: "Usuário" },
] as const;

export type RoleCode = (typeof ROLES)[number]["code"];

export type UserRecord = {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: RoleCode;
  active: boolean;
  mustChangePassword: boolean;
  // Vai dentro do token de sessão. Incrementar derruba todas as sessões abertas do usuário.
  sessionVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditEventRecord = {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  data: Record<string, unknown>;
  createdAt: Date;
};

export const store = {
  users: new Map<string, UserRecord>(),
  auditEvents: [] as AuditEventRecord[],
};

export function resetStore() {
  store.users.clear();
  store.auditEvents.length = 0;
}
