import { Badge } from "~/components/ui/badge";
import { WidgetCard } from "~/components/widgets/DistributionCard";
import { formatDateTime } from "~/lib/format";
import { ROLE_LABELS } from "~/lib/labels";
import type { User } from "~/types/user";

// Dashboard do usuário comum. PONTO DE TROCA: cada projeto substitui este conteúdo pelo que a pessoa
// precisa ver ao entrar (os chamados mais recentes dela, as tarefas do dia). O template mostra só o
// resumo do próprio acesso, que é o único dado que existe para todo usuário.
export function UserDashboard({ user }: { user: User }) {
  const rows = [
    { label: "Cargo", value: <Badge>{ROLE_LABELS[user.role]}</Badge> },
    {
      label: "Sessão iniciada em",
      value: <span className="font-mono text-sm">{formatDateTime(user.lastLoginAt)}</span>,
    },
    {
      label: "Conta criada em",
      value: <span className="font-mono text-sm">{formatDateTime(user.createdAt)}</span>,
    },
  ];

  return (
    <div className="max-w-xl">
      <WidgetCard title="Seu acesso">
        <dl className="divide-y">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <dt className="text-sm font-bold text-muted-foreground">{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </WidgetCard>
    </div>
  );
}
