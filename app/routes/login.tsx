import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { redirect, useNavigate, useSearchParams } from "react-router";
import { AuthAlert, AuthCard, AuthField, authInputClass } from "~/components/layout/AuthCard";
import { Button } from "~/components/ui/button";
import { PasswordInput } from "~/components/patterns/PasswordInput";
import { Input } from "~/components/ui/input";
import { APP_NAME, APP_TAGLINE, LOGIN_EMAIL_DOMAIN } from "~/config/app";
import { api, ApiError } from "~/lib/api";
import { clearSessionData, getSessionUser, meQuery, safeRedirect } from "~/lib/auth";
import { completeLoginEmail } from "~/lib/loginEmail";
import { cn } from "~/lib/utils";
import type { User } from "~/types/user";
import type { Route } from "./+types/login";

export const meta: Route.MetaFunction = () => [{ title: `Entrar | ${APP_NAME}` }];

// Quem já tem sessão não precisa ver o login.
export async function clientLoader() {
  if (await getSessionUser()) throw redirect("/");
  return null;
}

export default function Login() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: (input: { email: string; password: string }) => api.post<User>("/sessions", input),
    onSuccess: (user) => {
      clearSessionData();
      queryClient.setQueryData(meQuery.queryKey, user);
      const target = user.mustChangePassword
        ? "/change-password"
        : safeRedirect(searchParams.get("redirectTo"));
      navigate(target, { replace: true });
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      email: completeLoginEmail(email, LOGIN_EMAIL_DOMAIN),
      password: String(form.get("password")),
    });
  }

  const error = mutation.error instanceof ApiError ? mutation.error : null;
  const emailError = error?.fieldError("email");
  const passwordError = error?.fieldError("password");
  // O domínio aparece logo depois do que foi digitado enquanto não há "@".
  const showDomain = LOGIN_EMAIL_DOMAIN !== null && email.trim() !== "" && !email.includes("@");
  const emailDescription = [LOGIN_EMAIL_DOMAIN && "email-domain", emailError && "email-error"]
    .filter(Boolean)
    .join(" ");

  return (
    <AuthCard subtitle={APP_TAGLINE}>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <AuthField id="email" label="E-mail" icon={Mail} error={emailError}>
          <Input
            id="email"
            name="email"
            // "text" e não "email": o navegador não pode recusar o nome sem "@".
            type="text"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            placeholder={LOGIN_EMAIL_DOMAIN ? "seu.nome" : "seu@email.com"}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={!!emailError}
            aria-describedby={emailDescription || undefined}
            className={authInputClass}
          />
          {showDomain && (
            // Espelho do input: o texto digitado fica invisível e só empurra o domínio para depois
            // dele. Mesma fonte, borda e recuo do input, para as letras caírem no mesmo lugar.
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center overflow-hidden border border-transparent pr-6 pl-14 font-inter text-base whitespace-pre md:text-sm"
            >
              <span className="invisible">{email}</span>
              <span className="text-dim">@{LOGIN_EMAIL_DOMAIN}</span>
            </div>
          )}
        </AuthField>
        {LOGIN_EMAIL_DOMAIN && (
          <p id="email-domain" className="sr-only">
            Digite só o nome: o final @{LOGIN_EMAIL_DOMAIN} é completado. Para outro domínio, digite
            o e-mail inteiro.
          </p>
        )}

        <AuthField id="password" label="Senha" icon={Lock} error={passwordError}>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? "password-error" : undefined}
            className={cn(authInputClass, "pr-14")}
          />
        </AuthField>

        {error && !error.problem.errors && <AuthAlert>{error.message}</AuthAlert>}

        <Button
          type="submit"
          variant="solid"
          disabled={mutation.isPending}
          className="group h-14 w-full rounded-3xl text-sm tracking-widest uppercase"
        >
          {mutation.isPending ? (
            <Loader2 className="animate-spin" size={20} strokeWidth={3} aria-label="Entrando" />
          ) : (
            <>
              <span>Entrar</span>
              <ArrowRight
                size={18}
                strokeWidth={3}
                className="transition-transform group-hover:translate-x-1"
              />
            </>
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
