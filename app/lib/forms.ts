import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "./api";

// Leva os erros por campo do Problem Details (errors[]) para os campos do formulário. Devolve true
// se algum campo recebeu erro; senão o chamador mostra a mensagem geral (error.message).
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  if (!(error instanceof ApiError) || !error.problem.errors) return false;
  let applied = false;
  for (const fieldError of error.problem.errors) {
    const field = fields.find((name) => name === fieldError.field);
    if (field) {
      setError(field, { type: "server", message: fieldError.message });
      applied = true;
    }
  }
  return applied;
}
