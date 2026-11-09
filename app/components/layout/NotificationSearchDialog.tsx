import { useInfiniteQuery } from "@tanstack/react-query";
import { Archive, Search, SearchX } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ErrorState } from "~/components/patterns/EmptyState";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { useUpdateNotification } from "~/lib/notifier/notifications.queries";
import { cn } from "~/lib/utils";
import type { AppNotification } from "~/types/notification";
import { loadMoreOnScroll, NotificationItem, notificationPagesQuery } from "./NotificationItem";

type Status = "all" | "false" | "true";
type Folder = "inbox" | "archived";

const STATUS_LABELS: Record<Status, string> = { all: "Todas", false: "Não lidas", true: "Lidas" };
const FOLDER_LABELS: Record<Folder, string> = { inbox: "Recebidas", archived: "Arquivadas" };

function Chips<T extends string>({
  label,
  labels,
  value,
  onChange,
}: {
  label: string;
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-2" role="group" aria-label={label}>
      {(Object.keys(labels) as T[]).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold transition-colors",
            value === key
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {labels[key]}
        </button>
      ))}
    </div>
  );
}

// Busca nas notificações, aberta pela lupa do painel do sininho. Procura no título e no texto, com
// filtro de lidas e a pasta das arquivadas.
export function NotificationSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [folder, setFolder] = useState<Folder>("inbox");
  const search = useDebouncedValue(text.trim());
  const list = useInfiniteQuery({
    ...notificationPagesQuery({
      search: search || undefined,
      read: status === "all" ? undefined : status,
      archived: folder === "archived",
    }),
    enabled: open,
  });
  const update = useUpdateNotification();
  const navigate = useNavigate();

  const items = list.data?.pages.flatMap((page) => page.data) ?? [];
  const total = list.data?.pages[0]?.meta.total ?? 0;
  const filtered = Boolean(search) || status !== "all";

  function openNotification(notification: AppNotification) {
    if (!notification.read) update.mutate({ id: notification.id, read: true });
    onOpenChange(false);
    if (notification.url) navigate(notification.url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(720px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="space-y-3 border-b p-5 pr-12">
          <div>
            <DialogTitle className="text-lg font-bold">Buscar notificações</DialogTitle>
            <DialogDescription className="font-inter text-xs text-muted-foreground">
              Procura no título e no texto. Aceita titulo:valor e texto:valor.
            </DialogDescription>
          </div>
          <div className="relative">
            <Search
              aria-hidden
              size={16}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              autoFocus
              type="search"
              aria-label="Buscar notificações"
              placeholder="Buscar no título ou no texto"
              className="pl-9"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Chips label="Status" labels={STATUS_LABELS} value={status} onChange={setStatus} />
            <Chips label="Pasta" labels={FOLDER_LABELS} value={folder} onChange={setFolder} />
          </div>
        </div>
        <div className="min-h-48 flex-1 overflow-y-auto" onScroll={loadMoreOnScroll(list)}>
          {list.isLoading ? (
            <p className="px-5 py-10 text-center font-inter text-sm text-muted-foreground">
              Carregando...
            </p>
          ) : list.error ? (
            <ErrorState error={list.error} onRetry={() => list.refetch()} />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              {filtered ? (
                <SearchX size={40} className="mb-3 text-dim opacity-60" />
              ) : (
                <Archive size={40} className="mb-3 text-dim opacity-60" />
              )}
              <p className="text-sm font-bold">
                {filtered
                  ? "Nenhuma notificação encontrada"
                  : folder === "archived"
                    ? "Nenhuma notificação arquivada"
                    : "Nenhuma notificação"}
              </p>
              {filtered && (
                <p className="mt-1 font-inter text-xs text-muted-foreground">
                  Ajuste a busca ou os filtros.
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="px-5 pt-3 pb-1 font-inter text-xs text-muted-foreground">
                {total === 1 ? "1 notificação" : `${total} notificações`}
              </p>
              <ul>
                {items.map((n) => (
                  <NotificationItem key={n.id} notification={n} onOpen={openNotification} />
                ))}
              </ul>
              {list.isFetchingNextPage && (
                <p className="py-3 text-center font-inter text-xs text-muted-foreground">
                  Carregando mais...
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
