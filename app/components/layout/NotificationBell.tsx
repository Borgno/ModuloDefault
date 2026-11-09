import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, Search, Settings } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ErrorState } from "~/components/patterns/EmptyState";
import { mutedUntilLabel } from "~/components/patterns/MuteMenuItems";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { formatCounter } from "~/hooks/useNavCounter";
import {
  isMutedNow,
  noticeMuteQuery,
  unreadNotificationsQuery,
  useMarkAllNotificationsRead,
  useUpdateNotification,
} from "~/lib/notifier/notifications.queries";
import { cn } from "~/lib/utils";
import type { AppNotification } from "~/types/notification";
import { loadMoreOnScroll, NotificationItem, notificationPagesQuery } from "./NotificationItem";
import { NotificationSearchDialog } from "./NotificationSearchDialog";
import { NotificationSettingsDialog } from "./NotificationSettingsDialog";

// Recebidas, sem filtro.
const panelQuery = notificationPagesQuery({});

function Section({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: AppNotification[];
  onOpen: (notification: AppNotification) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="border-b last:border-b-0">
      <h3 className="px-5 pt-3 pb-1 text-sm font-bold">{title}</h3>
      <ul>
        {items.map((n) => (
          <NotificationItem key={n.id} notification={n} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}

// Sininho ao lado dos botões do topo de cada tela. Abre o painel com as notificações; a lupa abre a
// busca e a engrenagem, as mesmas configurações do menu do perfil.
// `size`: "icon-sm" ao lado de botões pequenos, como no topo da lista de conversas.
export function NotificationBell({ size = "icon" }: { size?: "icon" | "icon-sm" }) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const unread = useQuery(unreadNotificationsQuery).data ?? 0;
  const mute = useQuery(noticeMuteQuery);
  const muted = isMutedNow(mute.data);
  const list = useInfiniteQuery({ ...panelQuery, enabled: open });
  const update = useUpdateNotification();
  const markAll = useMarkAllNotificationsRead();
  const navigate = useNavigate();

  const items = list.data?.pages.flatMap((page) => page.data) ?? [];
  const important = items.filter((n) => n.important);
  const others = items.filter((n) => !n.important);
  const label = unread > 0 ? `Notificações (${formatCounter(unread)})` : "Notificações";

  function openNotification(notification: AppNotification) {
    if (!notification.read) update.mutate({ id: notification.id, read: true });
    setOpen(false);
    if (notification.url) navigate(notification.url);
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={size}
                aria-label={label}
                className="relative rounded-full"
              >
                {muted ? <BellOff /> : <Bell />}
                {unread > 0 && (
                  <span
                    className={cn(
                      "absolute -top-0.5 -right-0.5 min-w-4 rounded-full px-1 font-mono text-[10px] leading-4 text-primary-foreground",
                      muted ? "bg-muted-foreground" : "bg-destructive",
                    )}
                  >
                    {formatCounter(unread)}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent side="bottom">Notificações</TooltipContent>
        </Tooltip>
        <PopoverContent
          align="end"
          sideOffset={8}
          aria-label="Painel de notificações"
          // O foco vai para o painel, e não para o primeiro botão: senão o tooltip dele abre sozinho.
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).focus();
          }}
          className="w-[min(480px,calc(100vw-32px))] gap-0 overflow-hidden p-0"
        >
          <header className="flex items-center gap-1 border-b py-2 pr-2 pl-5">
            <h2 className="flex-1 text-lg font-bold">Notificações</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Buscar notificações"
                  onClick={() => {
                    setOpen(false);
                    setSearchOpen(true);
                  }}
                >
                  <Search />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Buscar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Marcar todas como lidas"
                  disabled={unread === 0 || markAll.isPending}
                  onClick={() => markAll.mutate()}
                >
                  <CheckCheck />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Marcar todas como lidas</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Configurações de notificação"
                  onClick={() => {
                    setOpen(false);
                    setSettingsOpen(true);
                  }}
                >
                  <Settings />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Configurações</TooltipContent>
            </Tooltip>
          </header>
          {muted && (
            <p className="border-b bg-muted px-5 py-2 font-inter text-xs text-muted-foreground">
              Avisos silenciados {mutedUntilLabel(mute.data?.mutedUntil ?? null)}: chegam aqui, sem
              notificação nem som.
            </p>
          )}
          <div
            className="max-h-[min(640px,calc(100dvh-120px))] overflow-y-auto"
            onScroll={loadMoreOnScroll(list)}
          >
            {list.isLoading ? (
              <p className="px-5 py-10 text-center font-inter text-sm text-muted-foreground">
                Carregando...
              </p>
            ) : list.error ? (
              <ErrorState error={list.error} onRetry={() => list.refetch()} />
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <Bell size={40} className="mb-3 text-dim opacity-60" />
                <p className="text-sm font-bold">Nenhuma notificação</p>
                <p className="mt-1 font-inter text-xs text-muted-foreground">
                  Quando algo mudar na sua conta, o aviso aparece aqui.
                </p>
              </div>
            ) : (
              <>
                <Section title="Importante" items={important} onOpen={openNotification} />
                <Section
                  title={important.length > 0 ? "Mais notificações" : "Recentes"}
                  items={others}
                  onOpen={openNotification}
                />
                {list.isFetchingNextPage && (
                  <p className="py-3 text-center font-inter text-xs text-muted-foreground">
                    Carregando mais...
                  </p>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <NotificationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <NotificationSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
