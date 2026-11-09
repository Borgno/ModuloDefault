// Textos das notificações do sistema, os mesmos na página e no Web Push: o front e o servidor importam
// este arquivo. Regras do WhatsApp Web.

// Depois de avisar, o mesmo grupo (ou os avisos do sistema) fica este tempo sem notificação nem som.
// Conversa de duas pessoas avisa toda mensagem.
export const SQUELCH_MS = 15_000;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Aviso do sistema. Sem prévia: de quem é, ou quantos há.
export function noticeNotification(
  notice: { title: string; body: string; senderName: string | null },
  previews: boolean,
  unread: number,
) {
  if (previews) return { title: notice.title, body: notice.body };
  return {
    title: "Nova notificação",
    body: notice.senderName
      ? `Notificação de ${notice.senderName}`
      : plural(Math.max(1, unread), "notificação não lida", "notificações não lidas"),
  };
}

export type MessageNotificationInput = {
  conversationName: string;
  isGroup: boolean;
  // Quem mandou (grupo).
  senderName: string;
  text: string;
  previews: boolean;
  // Não lidas da conversa, contando esta (prévia desligada: "3 novas mensagens").
  unreadCount: number;
  // Grupo: marcou a pessoa (ou todos) ou respondeu uma mensagem dela.
  mentionsMe: boolean;
  repliesToMe: boolean;
};

export function messageNotification(input: MessageNotificationInput) {
  const title = input.conversationName;
  if (!input.previews) {
    return {
      title,
      body: input.isGroup
        ? `Mensagem de ${input.senderName}`
        : plural(Math.max(1, input.unreadCount), "nova mensagem", "novas mensagens"),
    };
  }
  const line = input.isGroup ? `${input.senderName}: ${input.text}` : input.text;
  const prefix = input.repliesToMe
    ? "Respondeu a você: "
    : input.mentionsMe
      ? "Mencionou você: "
      : "";
  return { title, body: `${prefix}${line}` };
}

// "Fulano reagiu ❤️ a: texto": prévia da lista e corpo da notificação de reação.
export function reactionText(authorName: string | null, emoji: string, text: string) {
  return `${authorName ? `${authorName} reagiu` : "Reagiu"} ${emoji} a: ${text}`;
}

export function reactionNotification(
  input: {
    conversationName: string;
    authorName: string;
    isGroup: boolean;
    emoji: string;
    text: string;
  },
  previews: boolean,
) {
  const author = input.isGroup ? input.authorName : null;
  return {
    title: input.conversationName,
    body: previews
      ? reactionText(author, input.emoji, input.text)
      : `${author ? `${author} reagiu` : "Reagiu"} a uma mensagem`,
  };
}
