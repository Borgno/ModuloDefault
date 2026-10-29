import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  CheckCheck,
  ChevronDown,
  Mail,
  MailOpen,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { PageHeader } from "~/components/layout/PageHeader";
import { DataTable, useDataTableVariant, type Column } from "~/components/patterns/DataTable";
import { FilterButton, FilterField } from "~/components/patterns/FilterButton";
import { MuteMenuItems, mutedUntilLabel } from "~/components/patterns/MuteMenuItems";
import { SearchableSelect } from "~/components/patterns/SearchableSelect";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { APP_NAME } from "~/config/app";
import { useListParams } from "~/hooks/useListParams";
import { useMediaQuery } from "~/hooks/useMediaQuery";
import { useListSearch } from "~/hooks/useListSearch";
import { formatDateTime } from "~/lib/format";
import {
  isMutedNow,
  noticeMuteQuery,
  useMarkAllNotificationsRead,
  useSetNoticeMute,
  useUpdateNotification,
} from "~/lib/notifier/notifications.queries";
import { queryClient } from "~/lib/queryClient";
import type { SearchKey } from "~/lib/search";
import { cn } from "~/lib/utils";
import type { AppNotification } from "~/types/notification";
import type { Route } from "./+types/route";
import {
  notificationsParamsFrom,
  notificationsQuery,
  PAGE_SIZE,
} from "./_hooks/notifications.queries";

export const meta: Route.MetaFunction = () => [{ title: `Notificações | ${APP_NAME}` }];

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const params = notificationsParamsFrom(new URL(request.url).searchParams);
  void queryClient.prefetchQuery(notificationsQuery(params));
  return null;
}

const FILTERS = ["read", "archived"] as const;

// As mesmas de NOTIFICATION_SEARCH_KEYS no servidor.
const SEARCH_KEYS: SearchKey[] = [
  { key: "titulo", label: "Título" },
  { key: "texto", label: "Texto" },
];

// Ações de uma notificação, pela seta da linha ou pelo clique direito: valem só para quem fez.
function NotificationMenu({
  notification,
  open,
  onOpenChange,
}: {
  notification: AppNotification;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateNotification();
  const mute = useQuery(noticeMuteQuery);
  const setMute = useSetNoticeMute();
  // A lista tem a tabela (desktop) e os cards (celular), e só uma aparece: o menu abre na visível.
  const desktop = useMediaQuery("(min-width: 768px)");
  const visible = (useDataTableVariant() === "table") === desktop;
  return (
    <DropdownMenu open={open && visible} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Ações de ${notification.title}`}
          title="Ações"
          // A linha abre a notificação; a seta só abre o menu.
          onClick={(event) => event.stopPropagation()}
        >
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem
          onSelect={() => update.mutate({ id: notification.id, read: !notification.read })}
        >
          {notification.read ? <Mail /> : <MailOpen />}
          {notification.read ? "Marcar como não lida" : "Marcar como lida"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => update.mutate({ id: notification.id, archived: !notification.archived })}
        >
          {notification.archived ? <ArchiveRestore /> : <Archive />}
          {notification.archived ? "Desarquivar" : "Arquivar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <MuteMenuItems
          muted={isMutedNow(mute.data)}
          label="Silenciar avisos"
          onChange={(option) => setMute.mutate(option)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function columnsFor(menuFor: string | null, setMenuFor: (id: string | null) => void) {
  const columns: Column<AppNotification>[] = [
    {
      key: "notification",
      header: "Notificação",
      cell: (n) => (
        <div className="flex items-start gap-2.5">
          {/* "Marcar como não lida" mostra só a bolinha, como no WhatsApp. */}
          <span
            aria-hidden
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              n.read ? "bg-transparent" : "bg-primary",
            )}
          />
          <div className="min-w-0">
            <p className={cn(n.read ? "font-medium text-muted-foreground" : "font-bold")}>
              {n.title}
              {!n.read && <span className="sr-only"> (não lida)</span>}
            </p>
            <p className="font-inter text-xs text-muted-foreground">{n.body}</p>
          </div>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Recebida em",
      cell: (n) => (
        <span className={cn("font-mono text-xs", !n.read && "font-bold text-primary")}>
          {formatDateTime(n.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      className: "w-16 text-right",
      cell: (n) => (
        <NotificationMenu
          notification={n}
          open={menuFor === n.id}
          onOpenChange={(open) => setMenuFor(open ? n.id : null)}
        />
      ),
    },
  ];
  return columns;
}

export default function NotificationsPage() {
  const { searchParams, set } = useListParams();
  const params = notificationsParamsFrom(searchParams);
  const list = useQuery(notificationsQuery(params));
  const search = useListSearch(params.search);
  const update = useUpdateNotification();
  const markAll = useMarkAllNotificationsRead();
  const mute = useQuery(noticeMuteQuery);
  const setMute = useSetNoticeMute();
  const navigate = useNavigate();
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const unread = list.data?.meta.unread ?? 0;
  const muted = isMutedNow(mute.data);
  const filtered = Boolean(params.search) || FILTERS.some((key) => searchParams.has(key));

  function open(notification: AppNotification) {
    if (!notification.read) update.mutate({ id: notification.id, read: true });
    if (notification.url) navigate(notification.url);
  }

  return (
    <>
      <PageHeader
        title="Notificações"
        description={
          muted
            ? `Avisos silenciados ${mutedUntilLabel(mute.data?.mutedUntil ?? null)}: chegam aqui, sem notificação nem som.`
            : "Avisos do sistema para você. As não lidas aparecem no título da aba."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <BellOff />
                  {muted ? "Silenciados" : "Silenciar avisos"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <MuteMenuItems
                  muted={muted}
                  label="Silenciar por"
                  onChange={(option) => setMute.mutate(option)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck />
              Marcar todas como lidas
            </Button>
          </div>
        }
      />

      <DataTable
        search={{
          ...search,
          placeholder: "Buscar no título ou no texto",
          keys: SEARCH_KEYS,
          periodLabel: "Período de recebimento",
        }}
        filters={
          <FilterButton keys={FILTERS}>
            <FilterField label="Status" htmlFor="filtro-lida">
              <SearchableSelect
                id="filtro-lida"
                value={params.read ?? "all"}
                onChange={(value) => set({ read: value === "all" ? null : value })}
                options={[
                  { value: "all", label: "Todas" },
                  { value: "false", label: "Não lidas" },
                  { value: "true", label: "Lidas" },
                ]}
                searchPlaceholder="Buscar status..."
              />
            </FilterField>
            <FilterField label="Pasta" htmlFor="filtro-pasta">
              <SearchableSelect
                id="filtro-pasta"
                value={params.archived ? "archived" : "inbox"}
                onChange={(value) => set({ archived: value === "archived" ? "true" : null })}
                options={[
                  { value: "inbox", label: "Recebidas" },
                  { value: "archived", label: "Arquivadas" },
                ]}
                searchPlaceholder="Buscar pasta..."
              />
            </FilterField>
          </FilterButton>
        }
        columns={columnsFor(menuFor, setMenuFor)}
        rows={list.data?.data}
        rowKey={(n) => n.id}
        rowLabel={(n) => `Abrir ${n.title}: ${n.body}`}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={open}
        onRowContextMenu={(n) => setMenuFor(n.id)}
        pagination={
          list.data && {
            page: params.page,
            pageSize: PAGE_SIZE,
            total: list.data.meta.total,
            onPageChange: (page) => set({ page: String(page) }),
          }
        }
        empty={{
          icon: params.archived ? Archive : Bell,
          title: params.archived ? "Nenhuma notificação arquivada" : "Nenhuma notificação",
          description: filtered
            ? "Ajuste a busca ou os filtros."
            : "Quando algo mudar na sua conta, o aviso aparece aqui.",
        }}
      />
    </>
  );
}
