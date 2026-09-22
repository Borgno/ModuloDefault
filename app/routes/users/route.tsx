import { useQuery } from "@tanstack/react-query";
import { UserPlus, Users as UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "~/components/layout/PageHeader";
import { DataTable, type Column } from "~/components/patterns/DataTable";
import { Button } from "~/components/ui/button";
import { SearchableSelect } from "~/components/patterns/SearchableSelect";
import { APP_NAME } from "~/config/app";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { useListParams } from "~/hooks/useListParams";
import { meQuery, requireRole } from "~/lib/auth";
import { formatDateTime } from "~/lib/format";
import { queryClient } from "~/lib/queryClient";
import type { User } from "~/types/user";
import type { Route } from "./+types/route";
import { CreateUserDialog } from "./_components/CreateUserDialog";
import { RoleBadge, StatusBadge } from "./_components/UserBadges";
import { UserDrawer } from "./_components/UserDrawer";
import { PAGE_SIZE, usersParamsFrom, usersQuery } from "./_hooks/users.queries";

export const meta: Route.MetaFunction = () => [{ title: `Usuários | ${APP_NAME}` }];

export const clientMiddleware: Route.ClientMiddlewareFunction[] = [
  async ({ request }) => {
    await requireRole(request, "admin");
  },
];

// Começa a buscar a lista junto com a navegação, em vez de esperar a tela montar.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const params = usersParamsFrom(new URL(request.url).searchParams);
  void queryClient.prefetchQuery(usersQuery(params));
  return null;
}

const columns: Column<User>[] = [
  {
    key: "name",
    header: "Nome",
    sortField: "fullName",
    cell: (user) => (
      <div>
        <p className="font-bold">{user.fullName}</p>
        <p className="font-inter text-xs text-muted-foreground">{user.email}</p>
      </div>
    ),
  },
  { key: "role", header: "Cargo", cell: (user) => <RoleBadge role={user.role} /> },
  { key: "status", header: "Status", cell: (user) => <StatusBadge user={user} /> },
  {
    key: "lastLoginAt",
    header: "Último acesso",
    sortField: "lastLoginAt",
    cell: (user) => <span className="font-mono text-xs">{formatDateTime(user.lastLoginAt)}</span>,
  },
  {
    key: "createdAt",
    header: "Criado em",
    sortField: "createdAt",
    cell: (user) => <span className="font-mono text-xs">{formatDateTime(user.createdAt)}</span>,
  },
];

export default function UsersPage() {
  const { searchParams, set } = useListParams();
  const params = usersParamsFrom(searchParams);
  const list = useQuery(usersQuery(params));
  const { data: me } = useQuery(meQuery);
  const [creating, setCreating] = useState(false);

  // Busca digitada vai para a URL depois de uma pausa, sem uma requisição por tecla.
  const [searchInput, setSearchInput] = useState(params.search ?? "");
  const debouncedSearch = useDebouncedValue(searchInput.trim());
  useEffect(() => {
    if (debouncedSearch !== (params.search ?? "")) set({ search: debouncedSearch });
  }, [debouncedSearch, params.search, set]);

  const selectedId = searchParams.get("userId");
  const filtered = Boolean(params.search || params.role || params.active);

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Quem acessa o sistema, com qual cargo, e o histórico de cada um."
        actions={
          <Button variant="solid" onClick={() => setCreating(true)}>
            <UserPlus />
            Novo usuário
          </Button>
        }
      />

      <DataTable
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: "Buscar por nome ou e-mail",
        }}
        filters={
          <>
            <SearchableSelect
              aria-label="Filtrar por cargo"
              className="w-48"
              value={params.role ?? "all"}
              onChange={(value) => set({ role: value === "all" ? null : value })}
              options={[
                { value: "all", label: "Todos os cargos" },
                { value: "admin", label: "Administrador" },
                { value: "user", label: "Usuário" },
              ]}
              searchPlaceholder="Buscar cargo..."
            />
            <SearchableSelect
              aria-label="Filtrar por status"
              className="w-44"
              value={params.active ?? "all"}
              onChange={(value) => set({ active: value === "all" ? null : value })}
              options={[
                { value: "all", label: "Todos os status" },
                { value: "true", label: "Ativos" },
                { value: "false", label: "Inativos" },
              ]}
              searchPlaceholder="Buscar status..."
            />
          </>
        }
        columns={columns}
        rows={list.data?.data}
        rowKey={(user) => user.id}
        rowLabel={(user) => `Abrir ${user.fullName}`}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        sort={params.sort}
        onSortChange={(sort) => set({ sort })}
        onRowClick={(user) => set({ userId: user.id }, { resetPage: false })}
        pagination={
          list.data && {
            page: params.page,
            pageSize: PAGE_SIZE,
            total: list.data.meta.total,
            onPageChange: (page) => set({ page: String(page) }),
          }
        }
        empty={{
          icon: UsersIcon,
          title: "Nenhum usuário encontrado",
          description: filtered
            ? "Ajuste a busca ou os filtros."
            : "Crie o primeiro usuário para começar.",
        }}
      />

      <CreateUserDialog open={creating} onOpenChange={setCreating} />
      {me && (
        <UserDrawer
          userId={selectedId}
          currentUserId={me.id}
          onClose={() => set({ userId: null }, { resetPage: false })}
        />
      )}
    </>
  );
}
