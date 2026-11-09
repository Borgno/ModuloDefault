import { infiniteQueryOptions, useQuery } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Bell, Mail, MailOpen, MoreVertical } from "lucide-react";
import { MuteMenuItems } from "~/components/patterns/MuteMenuItems";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { api } from "~/lib/api";
import { formatDateTime } from "~/lib/format";
import {
  isMutedNow,
  noticeMuteQuery,
  useSetNoticeMute,
  useUpdateNotification,
} from "~/lib/notifier/notifications.queries";
import { cn } from "~/lib/utils";
import type { AppNotification, NotificationPage } from "~/types/notification";

// Item de notificação e a lista paginada, usados no painel do sininho e na busca.

const PAGE_SIZE = 20;

export type NotificationFilters = {
  search?: string;
  read?: "true" | "false";
  archived?: boolean;
};

// Página a página conforme rola. Fica sob ["notifications", "list"]: o stream invalida quando chega
// ou muda uma notificação.
export const notificationPagesQuery = (filters: NotificationFilters) =>
  infiniteQueryOptions({
    queryKey: ["notifications", "list", "pages", filters],
    queryFn: ({ pageParam, signal }) => {
      const query = new URLSearchParams({ page: String(pageParam), pageSize: String(PAGE_SIZE) });
      if (filters.search) query.set("search", filters.search);
      if (filters.read) query.set("read", filters.read);
      if (filters.archived) query.set("archived", "true");
      return api.get<NotificationPage>(`/notifications?${query.toString()}`, { signal });
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page * last.meta.pageSize < last.meta.total ? last.meta.page + 1 : undefined,
  });

// Perto do fim da lista rolável, busca a próxima página.
export function loadMoreOnScroll(list: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}) {
  return (event: React.UIEvent<HTMLElement>) => {
    const el = event.currentTarget;
    if (
      el.scrollHeight - el.scrollTop - el.clientHeight < 200 &&
      list.hasNextPage &&
      !list.isFetchingNextPage
    ) {
      void list.fetchNextPage();
    }
  };
}

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

// "há 18 horas", "há 2 dias", "agora".
function timeAgo(iso: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.trunc(seconds / size), unit);
  }
  return "agora";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

// Ações de uma notificação: lida ou não lida, arquivar ou desarquivar e silenciar os avisos.
function ItemMenu({ notification }: { notification: AppNotification }) {
  const update = useUpdateNotification();
  const mute = useQuery(noticeMuteQuery);
  const setMute = useSetNoticeMute();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Ações de ${notification.title}`}
          className="shrink-0 rounded-full opacity-70 hover:opacity-100"
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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

export function NotificationItem({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
}) {
  const n = notification;
  return (
    <li className="relative flex items-start gap-3 py-3 pr-2 pl-5 hover:bg-accent">
      {/* Bolinha à esquerda: não lida. */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-2 size-1.5 -translate-y-1/2 rounded-full",
          n.read ? "bg-transparent" : "bg-primary",
        )}
      />
      <button
        type="button"
        onClick={() => onOpen(n)}
        aria-label={`Abrir ${n.title}: ${n.body}${n.read ? "" : " (não lida)"}`}
        className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring"
      >
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
        >
          {n.senderName ? initials(n.senderName) : <Bell size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-sm leading-snug",
              n.read ? "text-muted-foreground" : "font-bold text-foreground",
            )}
          >
            {n.title}
          </span>
          <span className="mt-0.5 block font-inter text-sm leading-snug text-muted-foreground">
            {n.body}
          </span>
          <span
            className="mt-1.5 block font-inter text-xs text-dim"
            title={formatDateTime(n.createdAt)}
          >
            {timeAgo(n.createdAt)}
          </span>
        </span>
      </button>
      {/* Acima do botão que cobre a linha, para o menu abrir sem abrir a notificação. */}
      <div className="relative z-10">
        <ItemMenu notification={n} />
      </div>
    </li>
  );
}
