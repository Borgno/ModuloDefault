import { queryOptions, useQuery } from "@tanstack/react-query";
import { KeyRound, UserCheck, Users, UserX } from "lucide-react";
import { Link } from "react-router";
import { ErrorState } from "~/components/patterns/EmptyState";
import {
  DistributionCard,
  WidgetCard,
  WidgetCardSkeleton,
} from "~/components/widgets/DistributionCard";
import { StatCard, StatCardSkeleton } from "~/components/widgets/StatCard";
import { api } from "~/lib/api";
import { formatDateTime, formatNumber } from "~/lib/format";
import { ROLE_LABELS } from "~/lib/labels";
import type { UserStats } from "~/types/stats";

// Dashboard do admin: quem acessa o sistema.
const userStatsQuery = queryOptions({
  queryKey: ["userStats"],
  queryFn: ({ signal }) => api.get<UserStats>("/userStats", { signal }),
});

const ROLE_COLORS = { admin: "var(--chart-1)", user: "var(--chart-2)" } as const;

export function AdminDashboard() {
  const { data: stats, isLoading, error, refetch } = useQuery(userStatsQuery);

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <WidgetCardSkeleton />
          <WidgetCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuários" value={formatNumber(stats.total)} icon={Users} />
        <StatCard label="Ativos" value={formatNumber(stats.active)} icon={UserCheck} />
        <StatCard label="Inativos" value={formatNumber(stats.inactive)} icon={UserX} />
        <StatCard
          label="Troca de senha pendente"
          value={formatNumber(stats.pendingPasswordChange)}
          hint="Entre os ativos"
          icon={KeyRound}
          tone={stats.pendingPasswordChange > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionCard
          title="Usuários por cargo"
          items={stats.byRole.map(({ role, count }) => ({
            label: ROLE_LABELS[role],
            value: count,
            color: ROLE_COLORS[role],
          }))}
        />
        <WidgetCard title="Últimos acessos">
          {stats.recentLogins.length === 0 ? (
            <p className="py-6 text-center text-xs font-medium text-muted-foreground">
              Ninguém entrou ainda.
            </p>
          ) : (
            <ul className="divide-y">
              {stats.recentLogins.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <Link to={`/users?userId=${user.id}`} className="min-w-0 hover:text-primary">
                    <p className="truncate text-sm font-bold">{user.fullName}</p>
                    <p className="truncate font-inter text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </Link>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {formatDateTime(user.lastLoginAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>
      </div>
    </div>
  );
}
