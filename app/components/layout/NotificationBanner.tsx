import { BellOff, BellRing } from "lucide-react";
import { Button } from "~/components/ui/button";
import { requestPermission, useNotifierState } from "~/lib/notifier/preferences";
import { cn } from "~/lib/utils";

// Faixa no topo das telas enquanto o navegador não tiver a notificação permitida: pede a permissão,
// ou ensina a desbloquear. Não fecha: some com a permissão dada.
export function NotificationBanner({ className }: { className?: string }) {
  const { permission } = useNotifierState();
  if (permission !== "default" && permission !== "denied") return null;

  const blocked = permission === "denied";
  const Icon = blocked ? BellOff : BellRing;
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-3 rounded-2xl border bg-badge-primary-bg px-4 py-3",
        className,
      )}
    >
      <Icon size={18} className="mt-0.5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {blocked ? "As notificações estão bloqueadas" : "Receba notificações na área de trabalho"}
        </p>
        {blocked ? (
          <p className="mt-0.5 font-inter text-xs text-muted-foreground">
            Clique no cadeado ao lado do endereço do site, em Notificações escolha Permitir e
            recarregue a página.
          </p>
        ) : (
          <Button
            variant="link"
            size="sm"
            onClick={() => void requestPermission()}
            className="h-auto p-0"
          >
            Ativar notificações
          </Button>
        )}
      </div>
    </div>
  );
}
