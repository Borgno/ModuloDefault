import { Reply, SmilePlus } from "lucide-react";
import { memo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import type { ChatMember, Message } from "~/types/chat";
import { splitMentions } from "../_lib/mentions";
import { formatMessageTime } from "../_lib/unread";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function MessageText({ text, members }: { text: string; members: ChatMember[] }) {
  return (
    <>
      {splitMentions(text, members).map((part, i) =>
        part.mention ? (
          <span key={i} className="font-bold text-primary">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

// Reações agrupadas por emoji, com quem reagiu no título. Clicar na sua tira.
function Reactions({
  message,
  myId,
  onReact,
}: {
  message: Message;
  myId: string;
  onReact: (emoji: string | null) => void;
}) {
  const groups = new Map<string, string[]>();
  for (const r of message.reactions)
    groups.set(r.emoji, [...(groups.get(r.emoji) ?? []), r.userName]);
  const mine = message.reactions.find((r) => r.userId === myId)?.emoji;
  if (groups.size === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {[...groups].map(([emoji, names]) => (
        <button
          key={emoji}
          type="button"
          title={names.join(", ")}
          aria-label={`${emoji} de ${names.join(", ")}${emoji === mine ? ". Clique para tirar a sua" : ""}`}
          onClick={() => (emoji === mine ? onReact(null) : onReact(emoji))}
          className={cn(
            "rounded-full border bg-background px-1.5 text-xs leading-5",
            emoji === mine && "border-primary/50 bg-primary/10",
          )}
        >
          {emoji}
          {names.length > 1 && <span className="ml-0.5 font-mono text-[10px]">{names.length}</span>}
        </button>
      ))}
    </div>
  );
}

export const MessageBubble = memo(function MessageBubble({
  message,
  mine,
  showAuthor,
  members,
  myId,
  highlighted,
  onReply,
  onReact,
  onJumpTo,
}: {
  message: Message;
  mine: boolean;
  showAuthor: boolean;
  members: ChatMember[];
  myId: string;
  highlighted: boolean;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string | null) => void;
  onJumpTo: (messageId: string) => void;
}) {
  const [reacting, setReacting] = useState(false);
  return (
    <div
      data-message-id={message.id}
      className={cn(
        "group/message flex px-4 py-0.5 transition-colors",
        mine ? "justify-end" : "justify-start",
        highlighted && "bg-primary/10",
      )}
    >
      <div className={cn("flex max-w-[80%] items-center gap-1", mine && "flex-row-reverse")}>
        <div
          className={cn(
            "min-w-0 rounded-2xl px-3 py-1.5 text-sm shadow-xs",
            mine ? "rounded-br-sm bg-primary/15" : "rounded-bl-sm bg-card ring-1 ring-border",
          )}
        >
          {showAuthor && !mine && (
            <p className="text-xs font-bold text-primary">{message.authorName}</p>
          )}
          {message.replyTo && (
            <button
              type="button"
              onClick={() => onJumpTo(message.replyTo!.id)}
              className="mb-1 block w-full rounded-lg border-l-4 border-primary/60 bg-muted/70 px-2 py-1 text-left"
            >
              <span className="block text-xs font-bold text-primary">
                {message.replyTo.authorId === myId ? "Você" : message.replyTo.authorName}
              </span>
              <span className="line-clamp-2 font-inter text-xs text-muted-foreground">
                {message.replyTo.text}
              </span>
            </button>
          )}
          <p className="font-inter break-words whitespace-pre-wrap">
            <MessageText text={message.text} members={members} />
            <span className="ml-2 inline-block translate-y-0.5 font-mono text-[10px] text-muted-foreground">
              {formatMessageTime(message.createdAt)}
            </span>
          </p>
          <Reactions
            message={message}
            myId={myId}
            onReact={(emoji) => onReact(message.id, emoji)}
          />
        </div>
        <div className="flex opacity-0 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            aria-label="Responder"
            title="Responder"
            onClick={() => onReply(message)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Reply size={15} />
          </button>
          <Popover open={reacting} onOpenChange={setReacting}>
            <PopoverTrigger
              aria-label="Reagir"
              title="Reagir"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <SmilePlus size={15} />
            </PopoverTrigger>
            <PopoverContent className="flex w-auto gap-1 p-1.5" side="top">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`Reagir com ${emoji}`}
                  onClick={() => {
                    setReacting(false);
                    onReact(message.id, emoji);
                  }}
                  className="rounded-md px-1.5 py-0.5 text-lg hover:bg-muted"
                >
                  {emoji}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
});
