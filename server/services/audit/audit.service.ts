import { randomUUID } from "node:crypto";
import { store, type AuditEventRecord } from "../../lib/memoryStore";
import { paginate } from "../pagination";

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.roleChanged"
  | "user.deactivated"
  | "user.activated"
  | "user.passwordReset"
  | "user.passwordChanged";

type AuditInput = {
  actorId: string | null;
  action: AuditAction;
  targetType: "user";
  targetId: string;
  data?: Record<string, unknown>;
};

export function recordAudit(input: AuditInput): AuditEventRecord {
  const event: AuditEventRecord = {
    id: randomUUID(),
    data: {},
    ...input,
    createdAt: new Date(),
  };
  store.auditEvents.push(event);
  return event;
}

export type PublicAuditEvent = {
  id: string;
  action: string;
  actor: { id: string; fullName: string } | null;
  targetType: string;
  targetId: string;
  data: Record<string, unknown>;
  createdAt: string;
};

function toPublicEvent(event: AuditEventRecord): PublicAuditEvent {
  const actor = event.actorId ? store.users.get(event.actorId) : undefined;
  return {
    id: event.id,
    action: event.action,
    actor: actor ? { id: actor.id, fullName: actor.fullName } : null,
    targetType: event.targetType,
    targetId: event.targetId,
    data: event.data,
    createdAt: event.createdAt.toISOString(),
  };
}

// Mais recentes primeiro.
export function listAuditEvents(query: {
  targetType?: string;
  targetId?: string;
  page: number;
  pageSize: number;
}) {
  const events = store.auditEvents
    .filter((event) => !query.targetType || event.targetType === query.targetType)
    .filter((event) => !query.targetId || event.targetId === query.targetId)
    .toReversed();
  const page = paginate(events, query.page, query.pageSize);
  return { data: page.data.map(toPublicEvent), meta: page.meta };
}
