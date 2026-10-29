import { useQuery } from "@tanstack/react-query";
import { Archive, ArrowLeft, MessageCirclePlus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { conversationsQuery } from "~/lib/chat/chat.queries";
import { cn } from "~/lib/utils";
import type { ConversationFilter } from "~/types/chat";
import { ConversationItem } from "./ConversationItem";

const FILTER_LABELS: Record<Exclude<ConversationFilter, "archived">, string> = {
  all: "Tudo",
  unread: "Não lidas",
};

export function ConversationList({
  myId,
  activeId,
  onOpen,
  onNew,
  onMarkedUnread,
}: {
  myId: string;
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onMarkedUnread: (id: string) => void;
}) {
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [search, setSearch] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const debounced = useDebouncedValue(search.trim(), 300);
  const list = useQuery(conversationsQuery(filter, debounced.length >= 3 ? debounced : undefined));
  const archivedUnread = list.data?.meta.archivedUnread ?? 0;

  return (
    <section aria-label="Lista de conversas" className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        {filter === "archived" ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Voltar às conversas"
              onClick={() => setFilter("all")}
            >
              <ArrowLeft />
            </Button>
            <h1 className="text-lg font-bold tracking-tight">Arquivadas</h1>
          </div>
        ) : (
          <h1 className="text-lg font-bold tracking-tight">Conversas</h1>
        )}
        <Button variant="ghost" size="icon-sm" aria-label="Nova conversa" onClick={onNew}>
          <MessageCirclePlus />
        </Button>
      </div>

      <div className="space-y-3 px-4 pb-3">
        <div className="relative">
          <Search
            aria-hidden
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Buscar conversa"
            placeholder="Buscar conversa"
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {filter !== "archived" && (
          <div className="flex gap-2" role="group" aria-label="Filtro">
            {(Object.keys(FILTER_LABELS) as (keyof typeof FILTER_LABELS)[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                  filter === key
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {FILTER_LABELS[key]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filter !== "archived" && (
          <button
            type="button"
            onClick={() => setFilter("archived")}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium hover:bg-muted/60"
          >
            <Archive size={16} className="ml-3 text-muted-foreground" />
            <span className="ml-3 flex-1">Arquivadas</span>
            {archivedUnread > 0 && (
              <span className="font-mono text-[10px] font-bold text-primary">{archivedUnread}</span>
            )}
          </button>
        )}
        {list.isLoading && !list.data ? (
          <ul aria-hidden className="space-y-4 px-4 py-3">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </li>
            ))}
          </ul>
        ) : list.data?.data.length === 0 ? (
          <p className="px-6 py-10 text-center font-inter text-xs text-muted-foreground">
            {filter === "archived"
              ? "Nenhuma conversa arquivada."
              : filter === "unread"
                ? "Nenhuma conversa não lida."
                : "Nenhuma conversa ainda. Comece uma pelo botão acima."}
          </p>
        ) : (
          <ul aria-label="Conversas">
            {list.data?.data.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                myId={myId}
                active={conversation.id === activeId}
                menuOpen={menuFor === conversation.id}
                onMenuOpenChange={(open) => setMenuFor(open ? conversation.id : null)}
                onOpen={() => onOpen(conversation.id)}
                onMarkedUnread={() => onMarkedUnread(conversation.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
