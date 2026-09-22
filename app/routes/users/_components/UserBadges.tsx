import { Badge } from "~/components/ui/badge";
import { ROLE_LABELS } from "~/lib/labels";
import type { User } from "~/types/user";

export function RoleBadge({ role }: { role: User["role"] }) {
  return <Badge variant={role === "admin" ? "default" : "secondary"}>{ROLE_LABELS[role]}</Badge>;
}

// Bolinha de status: azul (ativo), vermelha (inativo), âmbar (troca de senha pendente). Decorativa: o
// texto do badge já diz o status.
function StatusDot({ className }: { className: string }) {
  return <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${className}`} />;
}

export function StatusBadge({ user }: { user: User }) {
  if (!user.active) {
    return (
      <Badge variant="destructive">
        <StatusDot className="bg-destructive" />
        Inativo
      </Badge>
    );
  }
  if (user.mustChangePassword) {
    return (
      <Badge variant="warning">
        <StatusDot className="bg-warning" />
        Troca de senha pendente
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <StatusDot className="bg-primary" />
      Ativo
    </Badge>
  );
}
