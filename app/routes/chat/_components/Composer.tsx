import { SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { COMPOSER_FOCUS_EVENT, takeComposerFocus } from "~/lib/chat/composerFocus";
import { cn } from "~/lib/utils";
import type { ChatMember, Message } from "~/types/chat";
import { ALL_MENTION, mentionQuery, mentionsIn } from "../_lib/mentions";
import { Avatar } from "./Avatar";

type Suggestion = { id: string | null; name: string };

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

// Campo de mensagem: Enter envia, Shift+Enter quebra a linha, "@" sugere as pessoas do grupo (e
// "@todos") e Esc fecha as sugestões. A citação aparece em cima, e o X ou o Esc a cancela.
export function Composer({
  conversationId,
  isGroup,
  members,
  myId,
  replyTo,
  onCancelReply,
  onSend,
  sending,
}: {
  conversationId: string;
  isGroup: boolean;
  members: ChatMember[];
  myId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (input: { text: string; mentionIds: string[]; mentionsAll: boolean }) => void;
  sending: boolean;
}) {
  const [text, setText] = useState("");
  const [cursor, setCursor] = useState(0);
  const [highlight, setHighlight] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Aberta pela notificação: o cursor vem para o campo, agora ou quando o pedido chegar.
  useEffect(() => {
    if (takeComposerFocus(conversationId)) ref.current?.focus();
    const onFocusRequest = (event: Event) => {
      if (
        (event as CustomEvent<string>).detail === conversationId &&
        takeComposerFocus(conversationId)
      )
        ref.current?.focus();
    };
    window.addEventListener(COMPOSER_FOCUS_EVENT, onFocusRequest);
    return () => window.removeEventListener(COMPOSER_FOCUS_EVENT, onFocusRequest);
  }, [conversationId]);

  // Citar põe o cursor no campo.
  useEffect(() => {
    if (replyTo) ref.current?.focus();
  }, [replyTo]);

  // Cresce com o texto até umas 6 linhas.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const query = isGroup && !dismissed ? mentionQuery(text, cursor) : null;
  const others = members.filter((m) => m.id !== myId);
  const suggestions: Suggestion[] =
    query === null
      ? []
      : [
          ...others.map((m) => ({ id: m.id, name: m.fullName })),
          { id: null, name: ALL_MENTION },
        ].filter((s) => normalize(s.name).includes(normalize(query)));
  const active = Math.min(highlight, Math.max(0, suggestions.length - 1));

  function pick(suggestion: Suggestion) {
    const before = text.slice(0, cursor).replace(/@([^\s@]*)$/, `@${suggestion.name} `);
    const next = before + text.slice(cursor);
    setText(next);
    setHighlight(0);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(before.length, before.length);
      setCursor(before.length);
    });
  }

  function send() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    onSend({ text: trimmed, ...mentionsIn(trimmed, others) });
    setText("");
    setCursor(0);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length > 0) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setHighlight((active + step + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        pick(suggestions[active]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setDismissed(true);
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div className="relative border-t bg-card px-3 py-2">
      {suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mencionar"
          className="absolute right-3 bottom-full left-3 mb-1 max-h-56 overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id ?? "todos"}
              role="option"
              aria-selected={i === active}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(s);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                i === active && "bg-accent",
              )}
            >
              <Avatar name={s.name} group={s.id === null} className="size-6 text-[9px]" />
              {s.id === null ? "todos (avisa todo o grupo)" : s.name}
            </li>
          ))}
        </ul>
      )}
      {replyTo && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border-l-4 border-primary/60 bg-muted/70 px-3 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-primary">
              Respondendo a {replyTo.authorId === myId ? "você" : replyTo.authorName}
            </p>
            <p className="line-clamp-2 font-inter text-xs text-muted-foreground">{replyTo.text}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancelar resposta"
            onClick={onCancelReply}
          >
            <X />
          </Button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          rows={1}
          aria-label="Mensagem"
          placeholder={isGroup ? "Mensagem (@ para mencionar)" : "Mensagem"}
          value={text}
          maxLength={4000}
          onChange={(event) => {
            setText(event.target.value);
            setCursor(event.target.selectionStart);
            setDismissed(false);
          }}
          onSelect={(event) => setCursor(event.currentTarget.selectionStart)}
          onKeyDown={onKeyDown}
          className="max-h-40 min-h-9 flex-1 resize-none rounded-xl border bg-background px-3 py-2 font-inter text-sm outline-none focus-visible:border-ring"
        />
        <Button size="icon" aria-label="Enviar" disabled={!text.trim() || sending} onClick={send}>
          <SendHorizontal />
        </Button>
      </div>
    </div>
  );
}
