import { AppWindow } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "~/components/ui/button";
import { APP_NAME, SINGLE_TAB } from "~/config/app";

const TAB_LOCK = "app-aba";
// A trava não respondeu: abre o app em vez de deixar a tela em branco.
const CHECK_TIMEOUT_MS = 2_000;

type TabState = "checking" | "active" | "blocked";

const supported = SINGLE_TAB && typeof navigator !== "undefined" && !!navigator.locks;
let state: TabState = supported ? "checking" : "active";
let started = false;
const listeners = new Set<() => void>();

function setState(next: TabState) {
  if (state === next) return;
  state = next;
  listeners.forEach((listener) => listener());
}

// Uma trava por página, fora do ciclo do React (em dev o StrictMode monta tudo duas vezes, e a trava
// pedida pelo componente ficaria presa na primeira). Segurada até a página fechar. `steal` ("Usar
// aqui") toma a da outra aba, que cai no catch e passa a mostrar o aviso.
function requestTab(steal: boolean) {
  navigator.locks
    .request(TAB_LOCK, steal ? { steal: true } : { ifAvailable: true }, (lock) => {
      if (!lock) {
        setState("blocked");
        return;
      }
      setState("active");
      return new Promise<void>(() => {});
    })
    .catch(() => setState("blocked"));
}

function start() {
  if (!supported || started) return;
  started = true;
  requestTab(false);
  setTimeout(() => {
    if (state === "checking") setState("active");
  }, CHECK_TIMEOUT_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Uma aba do app por navegador (SINGLE_TAB em config/app.ts). A trava é do endereço do site: apps
// em endereços diferentes abrem juntos sem se enxergar. Navegador sem Web Locks não bloqueia.
export function SingleTabGate({ children }: { children: React.ReactNode }) {
  const tab = useSyncExternalStore(
    subscribe,
    () => state,
    () => "active" as TabState,
  );
  useEffect(start, []);

  if (tab === "checking") return null;
  if (tab === "active") return children;

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border bg-card p-10 text-center shadow-card-elevated">
        <AppWindow size={40} className="mx-auto mb-4 text-primary" />
        <h1 className="text-lg font-bold tracking-tight">O {APP_NAME} está aberto em outra aba</h1>
        <p className="mt-2 font-inter text-sm text-muted-foreground">
          Clique em "Usar aqui" para usar o {APP_NAME} nesta aba. A outra para de funcionar.
        </p>
        <Button variant="solid" onClick={() => requestTab(true)} className="mt-6">
          Usar aqui
        </Button>
      </div>
    </main>
  );
}
