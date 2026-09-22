import { Layers } from "lucide-react";

// Tela de carregamento: vai dentro do index.html (HydrateFallback) e aparece enquanto o JS carrega.
export function Splash() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl bg-primary p-3 text-primary-foreground shadow-primary-glow">
          <Layers size={22} strokeWidth={2.5} />
        </div>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-accent">
          <div className="h-full animate-loading rounded-full bg-primary" />
        </div>
        <span className="sr-only">Carregando</span>
      </div>
    </div>
  );
}
