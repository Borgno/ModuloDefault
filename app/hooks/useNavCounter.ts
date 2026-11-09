import { useQuery } from "@tanstack/react-query";
import type { NavItem } from "~/config/navigation";
import { unreadConversationsQuery } from "~/lib/chat/chat.queries";

// Número ao lado de um item da navegação. O cache é o mesmo do "(N)" da aba, atualizado pelo stream.
// `muted` fica para um contador que respeite silêncio; as conversas não usam.
export function useNavCounter(counter: NavItem["counter"]) {
  const conversations = useQuery({
    ...unreadConversationsQuery,
    enabled: counter === "unreadConversations",
  });
  if (counter === "unreadConversations") return { count: conversations.data ?? 0, muted: false };
  return { count: 0, muted: false };
}

export const formatCounter = (count: number) => (count > 999 ? "999+" : String(count));
