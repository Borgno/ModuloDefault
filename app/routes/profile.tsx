import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "~/components/layout/PageHeader";
import { FormField } from "~/components/patterns/FormField";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { APP_NAME } from "~/config/app";
import { api, ApiError } from "~/lib/api";
import { meQuery } from "~/lib/auth";
import { applyApiErrors } from "~/lib/forms";
import { ROLE_LABELS } from "~/lib/labels";
import type { User } from "~/types/user";
import type { Route } from "./+types/profile";
import { fullNameSchema, passwordSchema } from "./users/_components/userForm";

export const meta: Route.MetaFunction = () => [{ title: `Perfil | ${APP_NAME}` }];

const nameSchema = z.object({ fullName: fullNameSchema });

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem.",
  });

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border bg-card p-6 shadow-card">
      <h2 className="mb-5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function NameForm({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: { fullName: user.fullName },
  });
  useEffect(() => form.reset({ fullName: user.fullName }), [form, user.fullName]);

  const mutation = useMutation({
    mutationFn: (input: { fullName: string }) => api.patch<User>("/me", input),
    onSuccess: (updated) => {
      queryClient.setQueryData(meQuery.queryKey, updated);
      toast.success("Nome atualizado");
    },
    onError: (error) => applyApiErrors(error, form.setError, ["fullName"]),
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="space-y-4"
    >
      <FormField id="profile-fullName" label="Nome" error={form.formState.errors.fullName?.message}>
        {(props) => <Input {...props} {...form.register("fullName")} />}
      </FormField>
      <FormField
        id="profile-email"
        label="E-mail"
        hint="O e-mail só pode ser alterado por um administrador."
      >
        {(props) => <Input {...props} value={user.email} readOnly disabled />}
      </FormField>
      <Button type="submit" disabled={!form.formState.isDirty || mutation.isPending}>
        {mutation.isPending && <Loader2 className="animate-spin" />}
        Salvar
      </Button>
    </form>
  );
}

function PasswordForm() {
  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const mutation = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.put("/me/password", input),
    onSuccess: () => {
      form.reset();
      toast.success("Senha alterada", {
        description: "As outras sessões abertas foram encerradas.",
      });
    },
    onError: (error) => {
      if (
        !applyApiErrors(error, form.setError, ["currentPassword", "newPassword"]) &&
        error instanceof ApiError
      ) {
        toast.error(error.message);
      }
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit(({ currentPassword, newPassword }) =>
        mutation.mutate({ currentPassword, newPassword }),
      )}
      noValidate
      className="space-y-4"
    >
      <FormField
        id="profile-currentPassword"
        label="Senha atual"
        error={errors.currentPassword?.message}
      >
        {(props) => (
          <Input
            {...props}
            type="password"
            autoComplete="current-password"
            {...form.register("currentPassword")}
          />
        )}
      </FormField>
      <FormField id="profile-newPassword" label="Nova senha" error={errors.newPassword?.message}>
        {(props) => (
          <Input
            {...props}
            type="password"
            autoComplete="new-password"
            {...form.register("newPassword")}
          />
        )}
      </FormField>
      <FormField
        id="profile-confirmPassword"
        label="Confirme a nova senha"
        error={errors.confirmPassword?.message}
      >
        {(props) => (
          <Input
            {...props}
            type="password"
            autoComplete="new-password"
            {...form.register("confirmPassword")}
          />
        )}
      </FormField>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending && <Loader2 className="animate-spin" />}
        Trocar senha
      </Button>
    </form>
  );
}

export default function Profile() {
  const { data: user } = useQuery(meQuery);
  if (!user) return null;

  return (
    <>
      <PageHeader
        title="Perfil"
        description="Seus dados e sua senha."
        actions={<Badge>{ROLE_LABELS[user.role]}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Seus dados">
          <NameForm user={user} />
        </Card>
        <Card title="Senha">
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
