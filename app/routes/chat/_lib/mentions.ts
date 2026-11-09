import type { ChatMember } from "~/types/chat";

// Menção no texto: "@Nome da Pessoa" ou "@todos". O texto vai como foi escrito; os ids vão à parte,
// para o servidor saber quem foi marcado.

export const ALL_MENTION = "todos";

// Pedaços do texto, com as menções separadas para o destaque.
export function splitMentions(text: string, members: ChatMember[]) {
  const names = [...members.map((m) => m.fullName), ALL_MENTION].sort(
    (a, b) => b.length - a.length,
  );
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`@(${escaped.join("|")})`, "g");
  const parts: { text: string; mention: boolean }[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), mention: false });
    parts.push({ text: match[0], mention: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), mention: false });
  return parts;
}

// Quem continua marcado no texto na hora de enviar (a menção apagada sai).
export function mentionsIn(text: string, members: ChatMember[]) {
  return {
    mentionIds: members.filter((m) => text.includes(`@${m.fullName}`)).map((m) => m.id),
    mentionsAll: text.includes(`@${ALL_MENTION}`),
  };
}

// "@ana" sendo digitado antes do cursor: o termo, ou null.
export function mentionQuery(text: string, cursor: number) {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(text.slice(0, cursor));
  return match ? match[1] : null;
}
