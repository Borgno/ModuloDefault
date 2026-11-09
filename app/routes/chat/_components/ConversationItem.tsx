import { AtSign, BellOff, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { reactionText } from "~shared/notificationText";
import { cn } from "~/lib/utils";
import type { Conversation } from "~/types/chat";
import { formatListTime, formatUnreadCount } from "../_lib/unread";
import { Avatar } from "./Avatar";
import { ConversationMenuContent } from "./ConversationMenu";

// Prévia de uma linha: a reação mais nova que a última mensagem, ou a última mensagem ("Você:" para
// a sua, "Fulano:" em grupo).
function preview(conversation: Conversation, myId: string) {
  const { lastMessage, lastReaction, kind } = conversation;
  if (lastReaction) {
    return reactionText(
      kind === "group" ? lastReaction.authorName : null,
      lastReaction.emoji,
      lastReaction.text,
    );
  }
  if (!lastMessage) return "Nenhuma mensagem ainda";
  if (lastMessage.authorId === myId) return `Você: ${lastMessage.text}`;
  return kind === "group" ? `${lastMessage.authorName}: ${lastMessage.text}` : lastMessage.text;
}

export function ConversationItem({
  conversation,
  myId,
  active,
  menuOpen,
  onMenuOpenChange,
  onOpen,
  onMarkedUnread,
}: {
  conversation: Conversation;
  myId: string;
  active: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onMarkedUnread: () => void;
}) {
  const unread = conversation.unreadCount > 0;
  const highlighted = unread || conversation.markedUnread;
  const time =
    conversation.lastMessage || conversation.lastReaction ? conversation.lastActivityAt : null;
  const label = [
    conversation.name,
    unread ? `${formatUnreadCount(conversation.unreadCount)} não lidas` : null,
    conversation.markedUnread && !unread ? "marcada como não lida" : null,
    conversation.mentioned ? "menciona você" : null,
    conversation.muted ? "silenciada" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <li
      className="group/conversation relative"
      onContextMenu={(event) => {
        event.preventDefault();
        onMenuOpenChange(true);
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-accent focus-visible:outline-none",
          active && "bg-accent",
        )}
      >
        <Avatar name={conversation.name} group={conversation.kind === "group"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn("truncate text-sm", highlighted ? "font-bold" : "font-medium")}>
              {conversation.name}
            </span>
            {time && (
              <span
                className={cn(
                  "shrink-0 font-mono text-[10px]",
                  unread && !conversation.muted
                    ? "font-bold text-primary"
                    : "text-muted-foreground",
                )}
              >
                {formatListTime(time)}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={cn(
                "flex-1 truncate font-inter text-xs",
                unread ? "font-bold text-foreground" : "text-muted-foreground",
              )}
            >
              {preview(conversation, myId)}
            </span>
            {conversation.muted && (
              <BellOff aria-hidden size={13} className="shrink-0 text-muted-foreground" />
            )}
            {conversation.mentioned && (
              <span
                aria-hidden
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <AtSign size={11} />
              </span>
            )}
            {unread ? (
              <span
                aria-hidden
                className={cn(
                  "min-w-5 shrink-0 rounded-full px-1.5 text-center font-mono text-[10px] leading-5 text-primary-foreground",
                  conversation.muted ? "bg-muted-foreground" : "bg-primary",
                )}
              >
                {formatUnreadCount(conversation.unreadCount)}
              </span>
            ) : (
              conversation.markedUnread && (
                <span
                  aria-hidden
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    conversation.muted ? "bg-muted-foreground" : "bg-primary",
                  )}
                />
              )
            )}
            {/* Espaço da seta do menu, que aparece no hover. */}
            <span aria-hidden className="w-0 transition-all group-hover/conversation:w-5" />
          </div>
        </div>
      </button>
      <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
        <DropdownMenuTrigger
          aria-label={`Ações de ${conversation.name}`}
          className={cn(
            "absolute right-3 bottom-3 flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background group-hover/conversation:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
          )}
        >
          <ChevronDown size={16} />
        </DropdownMenuTrigger>
        <ConversationMenuContent conversation={conversation} onMarkedUnread={onMarkedUnread} />
      </DropdownMenu>
    </li>
  );
}
