import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";
import { notifyServerError } from "./notifications";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: notifyServerError }),
  mutationCache: new MutationCache({ onError: notifyServerError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Erro 4xx é resposta definitiva da API (sem sessão, sem permissão, inexistente): repetir não
      // muda nada. Só falha de rede e 5xx tentam de novo.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
