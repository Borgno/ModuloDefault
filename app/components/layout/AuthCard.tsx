import { Layers } from "lucide-react";
import { APP_NAME } from "~/config/app";

// Moldura das telas fora do app (login, troca obrigatória de senha).
export function AuthCard({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div className="h-screen w-full overflow-y-auto bg-background selection:bg-primary/30">
      <div className="relative flex min-h-full w-full items-center justify-center overflow-hidden p-6">
        <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />

        <div className="relative z-10 w-full max-w-[440px]">
          <div className="mb-10 flex flex-col items-center">
            <div className="mb-6 flex size-16 items-center justify-center rounded-[22px] bg-primary text-primary-foreground shadow-primary-glow ring-4 ring-primary/10">
              <Layers size={32} strokeWidth={2.5} />
            </div>
            <h1 className="mb-2 text-4xl font-bold tracking-tighter uppercase">{APP_NAME}</h1>
            <p className="text-center font-medium text-muted-foreground">{subtitle}</p>
          </div>

          <div className="rounded-4xl border bg-card p-10 shadow-card-elevated">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Campo com rótulo no estilo do sistema (caixa alta, espaçado) e ícone à esquerda.
export function AuthField({
  id,
  label,
  icon: Icon,
  error,
  children,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="ml-4 text-[10px] font-bold tracking-[0.2em] text-dim uppercase"
      >
        {label}
      </label>
      <div className="group relative">
        <div className="absolute top-1/2 left-5 -translate-y-1/2 text-dim transition-colors group-focus-within:text-primary">
          <Icon size={18} strokeWidth={2.5} />
        </div>
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="ml-4 text-xs font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthAlert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-2xl bg-badge-destructive-bg p-4 text-xs font-bold text-badge-destructive-fg"
    >
      {children}
    </div>
  );
}

export const authInputClass = "h-14 rounded-3xl pr-6 pl-14";
