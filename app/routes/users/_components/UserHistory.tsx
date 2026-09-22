import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "~/components/ui/skeleton";
import { ErrorState } from "~/components/patterns/EmptyState";
import { formatDateTime } from "~/lib/format";
import { AUDIT_ACTION_LABELS, ROLE_LABELS } from "~/lib/labels";
import type { AuditEvent } from "~/types/api";
import { userHistoryQuery } from "../_hooks/users.queries";

function detail(event: AuditEvent) {
  if (event.action === "user.roleChanged") {
    const from = ROLE_LABELS[event.data.from as keyof typeof ROLE_LABELS] ?? event.data.from;
    const to = ROLE_LABELS[event.data.to as keyof typeof ROLE_LABELS] ?? event.data.to;
    return `${from} para ${to}`;
  }
  if (event.action === "user.updated" && typeof event.data.to === "string")
    return `Agora: ${event.data.to}`;
  return null;
}

export function UserHistory({ userId }: { userId: string }) {
  const { data, isLoading, error, refetch } = useQuery(userHistoryQuery(userId));

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data?.data.length) return <p className="text-sm text-muted-foreground">Nenhum registro.</p>;

  return (
    <ol className="space-y-3 border-l pl-4" aria-label="Histórico">
      {data.data.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-primary" />
          <p className="text-sm font-bold">{AUDIT_ACTION_LABELS[event.action] ?? event.action}</p>
          {detail(event) && (
            <p className="font-inter text-xs text-muted-foreground">{detail(event)}</p>
          )}
          <p className="text-xs text-dim">
            {event.actor?.fullName ?? "Sistema"} ·{" "}
            <span className="font-mono">{formatDateTime(event.createdAt)}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}
