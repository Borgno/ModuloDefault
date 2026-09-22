import { useNavigation } from "react-router";
import { useRequestsInFlight } from "~/lib/loading";

// Faixa fina no topo enquanto há requisição em voo ou navegação pendente. Indeterminada: não mede
// progresso, só indica que algo está carregando.
export function TopProgress() {
  const inFlight = useRequestsInFlight();
  const navigation = useNavigation();
  if (inFlight === 0 && navigation.state === "idle") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[10002] h-0.5 overflow-hidden"
    >
      <div className="h-full animate-loading bg-primary" />
      <span className="sr-only">Carregando</span>
    </div>
  );
}
