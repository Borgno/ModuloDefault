import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, AtSign, BellOff, ChevronDown } from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "~/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { usePageAttention } from "~/hooks/usePageAttention";
import {
  conversationQuery,
  flattenMessages,
  messagesQuery,
  useReact,
  useSendMessage,
  useUpdateConversation,
} from "~/lib/chat/chat.queries";
import { cn } from "~/lib/utils";
import type { Conversation, Message } from "~/types/chat";
import {
  dayLabel,
  findFirstUnread,
  formatUnreadCount,
  isSameDay,
  unreadDividerLabel,
} from "../_lib/unread";
import { Avatar } from "./Avatar";
import { Composer } from "./Composer";
import { ConversationMenuContent } from "./ConversationMenu";
import { MessageBubble } from "./MessageBubble";

// Rolagem a menos disso do fim conta como "no fim".
const NEAR_BOTTOM_PX = 150;
// Abrindo na 1ª não lida: até quantas mensagens a abertura busca para chegar nela.
const MAX_UNREAD_LOAD = 1000;
// Janela que volta ao foco só lê depois disso, como no WhatsApp Web: quem passou o olho não leu.
const READ_AFTER_FOCUS_MS = 2500;

// Faixa "N mensagens não lidas". Nasce com as não lidas da abertura (a leitura vem depois);
// `anchorId` undefined: a 1ª não lida ainda não foi achada; `opening`: falta rolar até ela.
type UnreadMark = { count: number; anchorId: string | null | undefined; opening: boolean };

const mentionsMe = (message: Message, myId: string) =>
  message.authorId !== myId &&
  (message.mentionsAll || message.mentionIds.includes(myId) || message.replyTo?.authorId === myId);

// Conversa aberta, com as regras do WhatsApp Web:
// - lida só com a janela em foco há 2,5 s e a rolagem no fim, e só até a última mensagem na tela;
//   aberta sem foco (pela notificação), fica não lida até o primeiro clique ou tecla;
// - marcada como não lida com ela aberta (`held`), continua aberta e só é lida ao abrir de novo;
// - abre na faixa "N mensagens não lidas", buscando páginas antigas se preciso; a faixa fica até
//   sair da conversa ou mandar mensagem;
// - só a sua mensagem leva ao fim; a dos outros desce só se você já estava no fim;
// - Esc cancela a citação e depois fecha a conversa (menus abertos fecham antes, sozinhos).
export function ConversationView({
  conversationId,
  myId,
  initial,
  held,
  onHold,
  onClose,
}: {
  conversationId: string;
  myId: string;
  initial: Conversation | undefined;
  held: boolean;
  onHold: () => void;
  onClose: () => void;
}) {
  const summary = useQuery({ ...conversationQuery(conversationId), initialData: initial });
  const conversation = summary.data;
  const messagesResult = useInfiniteQuery(messagesQuery(conversationId));
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = messagesResult;
  const messages = useMemo(() => flattenMessages(messagesResult.data), [messagesResult.data]);
  const loaded = messagesResult.data !== undefined;
  const attention = usePageAttention();
  // Foco de volta: a leitura espera 2,5 s. Perdeu o foco, para de novo.
  const [readAllowed, setReadAllowed] = useState(attention);
  useEffect(() => {
    if (!attention) return;
    const timer = setTimeout(() => setReadAllowed(true), READ_AFTER_FOCUS_MS);
    return () => {
      clearTimeout(timer);
      setReadAllowed(false);
    };
  }, [attention]);
  const update = useUpdateConversation();
  const sendMessage = useSendMessage(conversationId);
  const react = useReact(conversationId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [mark, setMark] = useState<UnreadMark | null>(null);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);
  // Aberta sem foco: espera o primeiro clique ou tecla para ler.
  const [awaitingInteraction, setAwaitingInteraction] = useState(false);
  const lastSeenId = useRef<string | undefined>(undefined);
  const prepend = useRef<{ height: number; top: number; firstId: string | undefined } | null>(null);
  const readingSeq = useRef(0);

  const unreadCount = conversation?.unreadCount ?? 0;
  const markedUnread = conversation?.markedUnread ?? false;
  // A marca de não lida segura a leitura enquanto existir (mandar mensagem tira a marca).
  const holding = held && markedUnread;
  const lastSeq = messages.at(-1)?.seq ?? 0;

  // A faixa nasce com as não lidas que a conversa tinha ao abrir.
  if (mark === null && conversation) {
    setMark({ count: conversation.unreadCount, anchorId: undefined, opening: true });
  }

  const markRead = useCallback(() => {
    if (readingSeq.current >= lastSeq && !markedUnread) return;
    readingSeq.current = lastSeq;
    // Até a última mensagem que estava na tela: a que chegar depois continua não lida.
    update.mutate({ id: conversationId, read: true, readUntil: lastSeq });
  }, [conversationId, lastSeq, markedUnread, update]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = true;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Abertura: acha a 1ª não lida (buscando páginas antigas se preciso) e rola até a faixa; sem não
  // lidas, abre no fim.
  useLayoutEffect(() => {
    if (!mark?.opening || !loaded || isFetchingNextPage) return;
    const anchorId = findFirstUnread(messages, mark.count, myId, !!hasNextPage);
    if (anchorId === undefined && messages.length < MAX_UNREAD_LOAD) {
      prepend.current = null;
      void fetchNextPage();
      return;
    }
    const mentions =
      anchorId != null
        ? messages
            .slice(messages.findIndex((m) => m.id === anchorId))
            .filter((m) => mentionsMe(m, myId))
            .map((m) => m.id)
        : [];
    // A abertura avança junto com a rolagem medida no DOM, por isso o estado muda aqui.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingMentions(mentions);
    setMark({ count: mark.count, anchorId: anchorId ?? messages[0]?.id ?? null, opening: false });
    lastSeenId.current = messages.at(-1)?.id;
    const el = scrollRef.current;
    requestAnimationFrame(() => {
      if (!el) return;
      const divider = el.querySelector<HTMLElement>("[data-unread-divider]");
      if (mark.count > 0 && divider) {
        el.scrollTop =
          el.scrollTop + divider.getBoundingClientRect().top - el.getBoundingClientRect().top - 48;
      } else {
        el.scrollTop = el.scrollHeight;
      }
      const near = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
      stickToBottom.current = near;
      setAtBottom(near);
    });
    // Aberta sem foco: só lê depois do primeiro clique ou tecla.
    if (!attention && (mark.count > 0 || markedUnread)) setAwaitingInteraction(true);
    else if (!holding && (mark.count > 0 || markedUnread)) markRead();
  }, [
    mark,
    loaded,
    isFetchingNextPage,
    messages,
    myId,
    hasNextPage,
    fetchNextPage,
    attention,
    holding,
    markedUnread,
    markRead,
  ]);

  // Mensagens novas (o stream acrescenta): a sua leva ao fim e tira a faixa; a dos outros desce só
  // se você estava no fim, e o que não foi lido entra na faixa e nas menções.
  useLayoutEffect(() => {
    if (!mark || mark.opening) return;
    const last = messages.at(-1);
    if (!last || last.id === lastSeenId.current) return;
    const previousIndex = messages.findIndex((m) => m.id === lastSeenId.current);
    const arrived = previousIndex >= 0 ? messages.slice(previousIndex + 1) : [last];
    lastSeenId.current = last.id;
    if (arrived.some((m) => m.authorId === myId)) {
      setMark({ count: 0, anchorId: null, opening: false });
      setPendingMentions([]);
      scrollToBottom();
      return;
    }
    if (stickToBottom.current) scrollToBottom();
    const fromOthers = arrived.filter((m) => m.authorId !== myId);
    const reading = readAllowed && stickToBottom.current && !holding && !awaitingInteraction;
    if (!reading && fromOthers.length > 0) {
      setMark((m) =>
        m && m.anchorId
          ? { ...m, count: m.count + fromOthers.length }
          : { count: fromOthers.length, anchorId: fromOthers[0].id, opening: false },
      );
      const mentions = fromOthers.filter((m) => mentionsMe(m, myId)).map((m) => m.id);
      if (mentions.length > 0) setPendingMentions((ids) => [...ids, ...mentions]);
    }
  }, [messages, mark, myId, readAllowed, holding, awaitingInteraction, scrollToBottom]);

  // Leitura com a conversa aberta: foco há 2,5 s e rolagem no fim.
  useEffect(() => {
    if (!mark || mark.opening || holding || awaitingInteraction) return;
    if (unreadCount === 0 && !markedUnread) return;
    if (readAllowed && atBottom) markRead();
  }, [
    mark,
    holding,
    awaitingInteraction,
    unreadCount,
    markedUnread,
    readAllowed,
    atBottom,
    markRead,
  ]);

  // Aberta sem foco: o primeiro clique ou tecla na página lê tudo.
  useEffect(() => {
    if (!awaitingInteraction) return;
    const onInteract = () => {
      setAwaitingInteraction(false);
      if (!holding) markRead();
    };
    window.addEventListener("pointerdown", onInteract, { once: true });
    window.addEventListener("keydown", onInteract, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, [awaitingInteraction, holding, markRead]);

  // Página antiga chegou em cima: a posição de leitura fica onde estava.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const saved = prepend.current;
    if (!el || !saved || messages[0]?.id === saved.firstId) return;
    el.scrollTop = saved.top + (el.scrollHeight - saved.height);
    prepend.current = null;
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
    stickToBottom.current = near;
    setAtBottom(near);
    // Menção que apareceu na tela sai do botão "@".
    if (pendingMentions.length > 0) {
      const area = el.getBoundingClientRect();
      setPendingMentions((ids) =>
        ids.filter((id) => {
          const rect = el.querySelector(`[data-message-id="${id}"]`)?.getBoundingClientRect();
          return !rect || rect.bottom <= area.top || rect.top >= area.bottom;
        }),
      );
    }
    if (el.scrollTop < 80 && hasNextPage && !isFetchingNextPage && !mark?.opening) {
      prepend.current = { height: el.scrollHeight, top: el.scrollTop, firstId: messages[0]?.id };
      void fetchNextPage();
    }
  }

  const jumpTo = useCallback((messageId: string) => {
    const row = scrollRef.current?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
    if (!row) return;
    row.scrollIntoView({ block: "center" });
    setHighlighted(messageId);
    setTimeout(() => setHighlighted((id) => (id === messageId ? null : id)), 1500);
  }, []);

  // Esc: cancela a citação, depois fecha a conversa. Quem já tratou o Esc (menu, diálogo, sugestão
  // de menção) marca o evento, e aqui ele é ignorado.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (replyTo) setReplyTo(null);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [replyTo, onClose]);

  const onReact = useCallback(
    (messageId: string, emoji: string | null) => react.mutate({ messageId, emoji }),
    [react],
  );

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center font-inter text-sm text-muted-foreground">
        {summary.isError ? "Conversa não encontrada." : "Carregando..."}
      </div>
    );
  }

  const isGroup = conversation.kind === "group";
  const others = conversation.members.filter((m) => m.id !== myId);

  return (
    <section
      aria-label={`Conversa com ${conversation.name}`}
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <header className="flex items-center gap-3 border-b bg-card px-3 py-2.5">
        <Button variant="ghost" size="icon-sm" aria-label="Fechar conversa" onClick={onClose}>
          <ArrowLeft />
        </Button>
        <Avatar name={conversation.name} group={isGroup} className="size-9" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold">{conversation.name}</h2>
          <p className="truncate font-inter text-xs text-muted-foreground">
            {isGroup ? ["Você", ...others.map((m) => m.fullName)].join(", ") : "Conversa"}
          </p>
        </div>
        {conversation.muted && (
          <BellOff aria-label="Silenciada" size={16} className="text-muted-foreground" />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Ações da conversa">
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <ConversationMenuContent conversation={conversation} onMarkedUnread={onHold} />
        </DropdownMenu>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          role="log"
          aria-label="Mensagens"
          className="h-full overflow-y-auto bg-muted/30 py-3"
        >
          {isFetchingNextPage && (
            <p className="py-2 text-center font-inter text-xs text-muted-foreground">
              Carregando mensagens anteriores...
            </p>
          )}
          {loaded && messages.length === 0 && (
            <p className="py-10 text-center font-inter text-xs text-muted-foreground">
              Nenhuma mensagem ainda. Diga oi.
            </p>
          )}
          {messages.map((message, i) => {
            const previous = messages[i - 1];
            const newDay = !previous || !isSameDay(previous.createdAt, message.createdAt);
            const showAuthor =
              isGroup && (newDay || previous?.authorId !== message.authorId || i === 0);
            return (
              <Fragment key={message.id}>
                {newDay && (
                  <div className="my-2 flex justify-center">
                    <span className="rounded-full bg-card px-3 py-0.5 font-mono text-[10px] text-muted-foreground shadow-xs">
                      {dayLabel(message.createdAt)}
                    </span>
                  </div>
                )}
                {mark && !mark.opening && mark.count > 0 && mark.anchorId === message.id && (
                  <div data-unread-divider className="my-2 flex justify-center bg-primary/5 py-1">
                    <span className="rounded-full bg-card px-3 py-0.5 text-xs font-bold text-primary shadow-xs">
                      {unreadDividerLabel(mark.count)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={message}
                  mine={message.authorId === myId}
                  showAuthor={showAuthor}
                  members={conversation.members}
                  myId={myId}
                  highlighted={highlighted === message.id}
                  onReply={setReplyTo}
                  onReact={onReact}
                  onJumpTo={jumpTo}
                />
              </Fragment>
            );
          })}
        </div>

        <div className="absolute right-4 bottom-4 flex flex-col items-end gap-2">
          {pendingMentions.length > 0 && (
            <Button
              size="icon"
              aria-label={`Ir para a menção (${pendingMentions.length})`}
              className="rounded-full shadow-lg"
              onClick={() => {
                const [first, ...rest] = pendingMentions;
                setPendingMentions(rest);
                jumpTo(first);
              }}
            >
              <AtSign />
            </Button>
          )}
          {!atBottom && (
            <Button
              variant="outline"
              size="icon"
              aria-label={
                unreadCount > 0
                  ? `Descer até o fim (${formatUnreadCount(unreadCount)} não lidas)`
                  : "Descer até o fim"
              }
              className="relative rounded-full bg-card shadow-lg"
              onClick={scrollToBottom}
            >
              <ArrowDown />
              {unreadCount > 0 && (
                <span
                  className={cn(
                    "absolute -top-2 -right-1 min-w-5 rounded-full px-1 font-mono text-[10px] leading-5 text-primary-foreground",
                    conversation.muted ? "bg-muted-foreground" : "bg-primary",
                  )}
                >
                  {formatUnreadCount(unreadCount)}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      <Composer
        conversationId={conversationId}
        isGroup={isGroup}
        members={conversation.members}
        myId={myId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        sending={sendMessage.isPending}
        onSend={(input) => {
          sendMessage.mutate({ ...input, replyToId: replyTo?.id ?? null });
          setReplyTo(null);
        }}
      />
    </section>
  );
}
