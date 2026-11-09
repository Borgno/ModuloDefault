import type { Message } from "~/types/chat";

// Número de não lidas como no WhatsApp: de 1000 para cima, "999+".
export const formatUnreadCount = (count: number) => (count > 999 ? "999+" : String(count));

export const unreadDividerLabel = (count: number) =>
  `${formatUnreadCount(count)} ${count === 1 ? "mensagem não lida" : "mensagens não lidas"}`;

// Onde entra a faixa "N mensagens não lidas": antes da N-ésima recebida, contando do fim (as
// enviadas por você no meio não contam). Conversa inteira não lida: antes da 1ª recebida, no topo.
// `undefined`: a 1ª não lida ainda não foi carregada, e a abertura busca as páginas anteriores.
export function findFirstUnread(
  messages: Message[],
  count: number,
  myId: string,
  hasMore: boolean,
): string | null | undefined {
  if (count <= 0 || messages.length === 0) return null;
  let seen = 0;
  let earliest: string | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].authorId === myId) continue;
    seen += 1;
    earliest = messages[i].id;
    if (seen === count) return earliest;
  }
  return hasMore ? undefined : earliest;
}

const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export function formatMessageTime(iso: string) {
  return time.format(new Date(iso));
}

// Na lista: hora se for hoje, "Ontem", ou a data.
export function formatListTime(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (sameDay(date, now)) return time.format(date);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Ontem";
  return shortDate.format(date);
}

// Faixa de data entre as mensagens: Hoje, Ontem ou a data.
export function dayLabel(iso: string, now = new Date()) {
  const label = formatListTime(iso, now);
  return label.includes(":") ? "Hoje" : label;
}

export function isSameDay(a: string, b: string) {
  return sameDay(new Date(a), new Date(b));
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}
