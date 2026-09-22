import { toast } from "sonner";
import { ApiError } from "./api";

// Falha de conexão e erro 5xx viram UM toast por janela: uma tela com seis queries em paralelo
// empilharia seis avisos iguais. Erro 4xx não passa por aqui: é tratado pela tela (campo, estado vazio).
const COOLDOWN_MS = 10_000;
let lastToastAt = 0;

export function notifyServerError(error: unknown) {
  if (!(error instanceof ApiError)) return;
  if (error.status !== 0 && error.status < 500) return;

  const now = Date.now();
  if (now - lastToastAt < COOLDOWN_MS) return;
  lastToastAt = now;

  toast.error(error.status === 0 ? "Sem conexão com o servidor" : "Erro no servidor", {
    description: error.message,
  });
}
