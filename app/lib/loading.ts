import { useSyncExternalStore } from "react";

// Contador de requisições em voo, alimentado pelo app/lib/api.ts. Acende a faixa de progresso do topo.
let inFlight = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function requestStarted() {
  inFlight += 1;
  emit();
}

export function requestFinished() {
  inFlight = Math.max(0, inFlight - 1);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRequestsInFlight() {
  return useSyncExternalStore(
    subscribe,
    () => inFlight,
    () => 0,
  );
}
