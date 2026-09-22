import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { redirect, useNavigate } from "react-router";
import { AuthAlert, AuthCard, AuthField, authInputClass } from "~/components/layout/AuthCard";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { APP_NAME } from "~/config/app";
import { api, ApiError } from "~/lib/api";
import { meQuery, requireSessionUser } from "~/lib/auth";
import type { Route } from "./+types/change-password";

export const meta: Route.MetaFunction = () => [{ title: `Trocar senha | ${APP_NAME}` }];

// Tela da troca obrigatória (depois de um reset). A troca voluntária fica no perfil.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireSessionUser(request);
  if (!user.mustChangePassword) throw redirect("/");
  return null;
}

export default function ChangePassword() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [mismatch, setMismatch] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.put("/me/password", input),
    onSuccess: async () => {
      // Busca o /me de novo antes de navegar. invalidateQueries não serve aqui: nenhuma tela observa
      // o /me nesta rota, então ele só marcaria como velho, e o guard leria do cache o usuário ainda
      // com a troca pendente, mandando de volta para cá.
      await queryClient.fetchQuery({ ...meQuery, staleTime: 0 });
      navigate("/", { replace: true });
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword"));
    const isMismatch = newPassword !== String(form.get("confirmPassword"));
    setMismatch(isMismatch);
    if (isMismatch) return;
    mutation.mutate({ currentPassword: String(form.get("currentPassword")), newPassword });
  }

  const error = mutation.error instanceof ApiError ? mutation.error : null;

  return (
    <AuthCard subtitle="Sua senha foi redefinida. Escolha uma nova para continuar.">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <AuthField
          id="currentPassword"
          label="Senha atual"
          icon={Lock}
          error={error?.fieldError("currentPassword")}
        >
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!error?.fieldError("currentPassword")}
            className={authInputClass}
          />
        </AuthField>

        <AuthField
          id="newPassword"
          label="Nova senha"
          icon={KeyRound}
          error={error?.fieldError("newPassword")}
        >
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!error?.fieldError("newPassword")}
            className={authInputClass}
          />
        </AuthField>

        <AuthField
          id="confirmPassword"
          label="Confirme a nova senha"
          icon={KeyRound}
          error={mismatch ? "As senhas não conferem." : undefined}
        >
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={mismatch}
            className={authInputClass}
          />
        </AuthField>

        {error && !error.problem.errors && <AuthAlert>{error.message}</AuthAlert>}

        <Button
          type="submit"
          variant="solid"
          disabled={mutation.isPending}
          className="h-14 w-full rounded-3xl text-sm tracking-widest uppercase"
        >
          {mutation.isPending ? (
            <Loader2 className="animate-spin" size={20} strokeWidth={3} />
          ) : (
            "Salvar nova senha"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
