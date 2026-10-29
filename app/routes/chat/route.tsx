import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router";
import { APP_NAME } from "~/config/app";
import { meQuery } from "~/lib/auth";
import type { Conversation, ConversationPage } from "~/types/chat";
import type { Route } from "./+types/route";
import { ConversationList } from "./_components/ConversationList";
import { ConversationView } from "./_components/ConversationView";
import { NewConversationDialog } from "./_components/NewConversationDialog";

export const meta: Route.MetaFunction = () => [{ title: `Conversas | ${APP_NAME}` }];

// A tela ocupa toda a área do layout, sem o padding das outras páginas.
export const handle = { fullBleed: true };

export default function ChatPage() {
  const { data: user } = useQuery(meQuery);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get("c");
  const [newOpen, setNewOpen] = useState(false);
  // Conversa marcada como não lida com ela aberta: não é lida até abrir de novo.
  const [heldId, setHeldId] = useState<string | null>(null);
  // Abrir de novo a mesma conversa recomeça a abertura (faixa e leitura).
  const [openCount, setOpenCount] = useState(0);

  const open = useCallback(
    (id: string) => {
      setHeldId(null);
      setOpenCount((n) => n + 1);
      setSearchParams({ c: id });
    },
    [setSearchParams],
  );
  const close = useCallback(() => setSearchParams({}), [setSearchParams]);

  // A conversa como estava na lista, para a abertura não esperar a busca dela.
  const initial = activeId
    ? queryClient
        .getQueriesData<ConversationPage>({ queryKey: ["chat", "conversations"] })
        .flatMap(([, page]) => page?.data ?? [])
        .find((c) => c.id === activeId)
    : undefined;

  if (!user) return null;

  return (
    <div className="flex h-full min-h-0">
      <div
        className={
          activeId
            ? "hidden h-full w-80 shrink-0 border-r bg-card md:block"
            : "h-full w-full shrink-0 bg-card md:w-80 md:border-r"
        }
      >
        <ConversationList
          myId={user.id}
          activeId={activeId}
          onOpen={open}
          onNew={() => setNewOpen(true)}
          onMarkedUnread={(id) => {
            if (id === activeId) setHeldId(id);
          }}
        />
      </div>
      {activeId ? (
        <ConversationView
          key={`${activeId}:${openCount}`}
          conversationId={activeId}
          myId={user.id}
          initial={initial}
          held={heldId === activeId}
          onHold={() => setHeldId(activeId)}
          onClose={close}
        />
      ) : (
        <div className="hidden flex-1 flex-col items-center justify-center gap-2 bg-muted/30 text-center md:flex">
          <MessageCircle size={32} className="text-muted-foreground" />
          <p className="text-sm font-bold">Escolha uma conversa</p>
          <p className="max-w-xs font-inter text-xs text-muted-foreground">
            Ou comece uma nova com uma pessoa ou um grupo.
          </p>
        </div>
      )}
      <NewConversationDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(conversation: Conversation) => open(conversation.id)}
      />
    </div>
  );
}
