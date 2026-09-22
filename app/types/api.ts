// Espelha os schemas de server/schemas/common.ts e server/routes/auditEvents/.

export type Page<T> = {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
};

export type AuditEvent = {
  id: string;
  action: string;
  actor: { id: string; fullName: string } | null;
  targetType: string;
  targetId: string;
  data: Record<string, unknown>;
  createdAt: string;
};
