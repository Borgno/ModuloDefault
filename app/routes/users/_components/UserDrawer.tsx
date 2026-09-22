import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, Loader2, UserCheck, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useConfirm } from "~/components/patterns/ConfirmDialog";
import { ErrorState } from "~/components/patterns/EmptyState";
import { DrawerSection, EntityDrawer } from "~/components/patterns/EntityDrawer";
import { FormField } from "~/components/patterns/FormField";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SearchableSelect } from "~/components/patterns/SearchableSelect";
import { Skeleton } from "~/components/ui/skeleton";
import { ApiError } from "~/lib/api";
import { formatDateTime } from "~/lib/format";
import { applyApiErrors } from "~/lib/forms";
import { ROLE_LABELS } from "~/lib/labels";
import type { User } from "~/types/user";
import {
  useResetPassword,
  useUpdateUser,
  userQuery,
  type UpdateUserInput,
} from "../_hooks/users.queries";
import { TemporaryPasswordDialog } from "./TemporaryPasswordDialog";
import { RoleBadge, StatusBadge } from "./UserBadges";
import { UserHistory } from "./UserHistory";
import { editUserSchema } from "./userForm";

const ROLE_OPTIONS = [
  { value: "user", label: ROLE_LABELS.user },
  { value: "admin", label: ROLE_LABELS.admin },
];

type EditValues = z.infer<typeof editUserSchema>;

function EditForm({ user, isSelf }: { user: User; isSelf: boolean }) {
  const mutation = useUpdateUser(user.id);
  const form = useForm<EditValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { fullName: user.fullName, role: user.role },
  });
  const { errors, isDirty, dirtyFields } = form.formState;

  // Quando o usuário muda por fora (outra aba, desativação), o formulário acompanha.
  useEffect(() => {
    form.reset({ fullName: user.fullName, role: user.role });
  }, [form, user.fullName, user.role]);

  const onSubmit = form.handleSubmit((values) => {
    const patch: UpdateUserInput = {};
    if (dirtyFields.fullName) patch.fullName = values.fullName;
    if (dirtyFields.role) patch.role = values.role;
    mutation.mutate(patch, {
      onSuccess: () => toast.success("Alterações salvas"),
      onError: (error) => {
        if (
          !applyApiErrors(error, form.setError, ["fullName", "role"]) &&
          error instanceof ApiError
        ) {
          toast.error(error.message);
        }
      },
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField id="edit-fullName" label="Nome" error={errors.fullName?.message}>
        {(props) => <Input {...props} {...form.register("fullName")} />}
      </FormField>
      <FormField
        id="edit-role"
        label="Cargo"
        error={errors.role?.message}
        hint={isSelf ? "Você não pode mudar o próprio cargo." : undefined}
      >
        {(props) => (
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <SearchableSelect
                {...props}
                value={field.value}
                onChange={field.onChange}
                disabled={isSelf}
                options={ROLE_OPTIONS}
                searchPlaceholder="Buscar cargo..."
              />
            )}
          />
        )}
      </FormField>
      <Button type="submit" disabled={!isDirty || mutation.isPending}>
        {mutation.isPending && <Loader2 className="animate-spin" />}
        Salvar alterações
      </Button>
    </form>
  );
}

function AccessActions({ user, isSelf }: { user: User; isSelf: boolean }) {
  const confirm = useConfirm();
  const update = useUpdateUser(user.id);
  const reset = useResetPassword(user.id);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  async function handleReset() {
    const ok = await confirm({
      title: "Resetar senha?",
      description: `${user.fullName} sai de todas as sessões abertas e troca a senha no próximo acesso.`,
      confirmLabel: "Resetar senha",
    });
    if (!ok) return;
    reset.mutate(undefined, {
      onSuccess: ({ temporaryPassword }) => setTemporaryPassword(temporaryPassword),
      onError: (error) => error instanceof ApiError && toast.error(error.message),
    });
  }

  async function handleToggleActive() {
    const deactivating = user.active;
    const ok = await confirm(
      deactivating
        ? {
            title: "Desativar usuário?",
            description: `${user.fullName} perde o acesso na hora, inclusive nas sessões abertas. Dá para reativar depois.`,
            confirmLabel: "Desativar",
            variant: "destructive",
          }
        : {
            title: "Reativar usuário?",
            description: `${user.fullName} volta a ter acesso.`,
            confirmLabel: "Reativar",
          },
    );
    if (!ok) return;
    update.mutate(
      { active: !deactivating },
      {
        onSuccess: () => toast.success(deactivating ? "Usuário desativado" : "Usuário reativado"),
        onError: (error) => error instanceof ApiError && toast.error(error.message),
      },
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={handleReset} disabled={reset.isPending}>
        <KeyRound />
        Resetar senha
      </Button>
      {!isSelf && (
        <Button
          variant={user.active ? "destructive" : "outline"}
          onClick={handleToggleActive}
          disabled={update.isPending}
        >
          {user.active ? <UserX /> : <UserCheck />}
          {user.active ? "Desativar" : "Reativar"}
        </Button>
      )}
      <TemporaryPasswordDialog
        password={temporaryPassword}
        onClose={() => setTemporaryPassword(null)}
      />
    </div>
  );
}

type UserDrawerProps = {
  userId: string | null;
  currentUserId: string;
  onClose: () => void;
};

export function UserDrawer({ userId, currentUserId, onClose }: UserDrawerProps) {
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    ...userQuery(userId ?? ""),
    enabled: userId !== null,
  });
  const isSelf = user?.id === currentUserId;

  return (
    <EntityDrawer
      open={userId !== null}
      onOpenChange={(open) => !open && onClose()}
      title={user?.fullName ?? "Usuário"}
      description={user?.email}
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        user && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role={user.role} />
              <StatusBadge user={user} />
              <span className="text-xs text-muted-foreground">
                Último acesso: <span className="font-mono">{formatDateTime(user.lastLoginAt)}</span>
              </span>
            </div>
            <DrawerSection title="Dados">
              <EditForm user={user} isSelf={isSelf} />
            </DrawerSection>
            <DrawerSection title="Acesso">
              <AccessActions user={user} isSelf={isSelf} />
            </DrawerSection>
            <DrawerSection title="Histórico">
              <UserHistory userId={user.id} />
            </DrawerSection>
          </>
        )
      )}
    </EntityDrawer>
  );
}
