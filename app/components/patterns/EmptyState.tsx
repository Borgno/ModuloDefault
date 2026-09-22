import { AlertTriangle, Inbox, type LucideIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ApiError } from "~/lib/api";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <Icon size={44} className="mb-4 text-dim opacity-60" />
      <h3 className="mb-1 text-base font-bold">{title}</h3>
      {description && (
        <p className="max-w-md font-inter text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Erro de carregamento. Nunca troque por lista vazia: "não carregou" e "não tem nada" são coisas
// diferentes para quem usa.
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : "Não foi possível carregar os dados.";
  return (
    <div role="alert">
      <EmptyState
        icon={AlertTriangle}
        title="Não foi possível carregar"
        description={message}
        action={
          onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Tentar de novo
            </Button>
          )
        }
      />
    </div>
  );
}
