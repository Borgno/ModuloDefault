import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { FormAlert, FormField } from "~/components/patterns/FormField";
import { FormDialog } from "~/components/patterns/FormDialog";
import { Input } from "~/components/ui/input";
import { SearchableSelect } from "~/components/patterns/SearchableSelect";
import { ApiError } from "~/lib/api";
import { applyApiErrors } from "~/lib/forms";
import { ROLE_LABELS } from "~/lib/labels";
import { useCreateUser } from "../_hooks/users.queries";
import { createUserSchema } from "./userForm";

const ROLE_OPTIONS = [
  { value: "user", label: ROLE_LABELS.user },
  { value: "admin", label: ROLE_LABELS.admin },
];

type FormInput = z.input<typeof createUserSchema>;
type FormOutput = z.output<typeof createUserSchema>;

const FIELDS = ["email", "fullName", "role", "password"] as const;

export function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useCreateUser();
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", fullName: "", role: "user", password: "" },
  });
  const { errors } = form.formState;

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset();
      mutation.reset();
    }
    onOpenChange(next);
  }

  const onSubmit = form.handleSubmit((values) =>
    mutation.mutate(values, {
      onSuccess: (user) => {
        toast.success("Usuário criado", {
          description: `${user.fullName} troca a senha no primeiro acesso.`,
        });
        handleOpenChange(false);
      },
      onError: (error) => applyApiErrors(error, form.setError, FIELDS),
    }),
  );

  const generalError =
    mutation.error instanceof ApiError && !mutation.error.problem.errors
      ? mutation.error.message
      : null;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Novo usuário"
      description="A pessoa entra com a senha inicial e escolhe uma nova no primeiro acesso."
      submitLabel="Criar usuário"
      isPending={mutation.isPending}
      onSubmit={onSubmit}
    >
      <FormField id="create-fullName" label="Nome" error={errors.fullName?.message}>
        {(props) => <Input {...props} autoComplete="off" {...form.register("fullName")} />}
      </FormField>

      <FormField id="create-email" label="E-mail" error={errors.email?.message}>
        {(props) => (
          <Input {...props} type="email" autoComplete="off" {...form.register("email")} />
        )}
      </FormField>

      <FormField id="create-role" label="Cargo" error={errors.role?.message}>
        {(props) => (
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <SearchableSelect
                {...props}
                value={field.value}
                onChange={field.onChange}
                options={ROLE_OPTIONS}
                searchPlaceholder="Buscar cargo..."
              />
            )}
          />
        )}
      </FormField>

      <FormField
        id="create-password"
        label="Senha inicial"
        error={errors.password?.message}
        hint="Ao menos 8 caracteres. Entregue à pessoa por um canal seguro."
      >
        {(props) => (
          <Input
            {...props}
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
        )}
      </FormField>

      {generalError && <FormAlert>{generalError}</FormAlert>}
    </FormDialog>
  );
}
