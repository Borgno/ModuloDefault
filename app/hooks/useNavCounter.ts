import { useQuery } from "@tanstack/react-query";
import type { NavItem } from "~/config/navigation";
import { unreadConversationsQuery } from "~/lib/chat/chat.queries";
import {
  isMutedNow,
  noticeMuteQuery,
  unreadNotificationsQuery,
} from "~/lib/notifier/notifications.queries";

// Número ao lado de um item da navegação. O cache é o mesmo do "(N)" da aba, atualizado pelo stream.
// `muted`: avisos silenciados, o número fica cinza.
export function useNavCounter(counter: NavItem["counter"]) {
  const notices = useQuery({
    ...unreadNotificationsQuery,
    enabled: counter === "unreadNotifications",
  });
  const mute = useQuery({ ...noticeMuteQuery, enabled: counter === "unreadNotifications" });
  const conversations = useQuery({
    ...unreadConversationsQuery,
    enabled: counter === "unreadConversations",
  });
  if (counter === "unreadNotifications") {
    return { count: notices.data ?? 0, muted: isMutedNow(mute.data) };
  }
  if (counter === "unreadConversations") return { count: conversations.data ?? 0, muted: false };
  return { count: 0, muted: false };
}

export const formatCounter = (count: number) => (count > 999 ? "999+" : String(count));
