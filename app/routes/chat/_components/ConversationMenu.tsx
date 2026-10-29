import { Archive, ArchiveRestore, Mail, MailOpen } from "lucide-react";
import { MuteMenuItems } from "~/components/patterns/MuteMenuItems";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { useUpdateConversation } from "~/lib/chat/chat.queries";
import type { Conversation } from "~/types/chat";

// Ações da conversa, pela seta ou pelo clique direito: valem só para quem fez.
export function ConversationMenuContent({
  conversation,
  onMarkedUnread,
}: {
  conversation: Conversation;
  // Marcada como não lida com ela aberta: a tela segura a leitura até abrir de novo.
  onMarkedUnread?: () => void;
}) {
  const update = useUpdateConversation();
  const unread = conversation.unreadCount > 0 || conversation.markedUnread;
  return (
    <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
      <DropdownMenuItem
        onSelect={() => {
          if (!unread) onMarkedUnread?.();
          update.mutate({ id: conversation.id, read: unread });
        }}
      >
        {unread ? <MailOpen /> : <Mail />}
        {unread ? "Marcar como lida" : "Marcar como não lida"}
      </DropdownMenuItem>
      <MuteMenuItems
        muted={conversation.muted}
        onChange={(mute) => update.mutate({ id: conversation.id, mute })}
      />
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => update.mutate({ id: conversation.id, archived: !conversation.archived })}
      >
        {conversation.archived ? <ArchiveRestore /> : <Archive />}
        {conversation.archived ? "Desarquivar" : "Arquivar"}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
