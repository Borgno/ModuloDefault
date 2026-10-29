// Conversa aberta pelo clique numa notificação: o cursor vai para o campo de mensagem. O campo pode
// ainda não estar na tela (app aberto pelo clique no push), então ele pega quando aparecer.
export const COMPOSER_FOCUS_EVENT = "chat:foco-no-campo";

let pending: string | null = null;

export function requestComposerFocus(conversationId: string) {
  pending = conversationId;
  window.dispatchEvent(new CustomEvent(COMPOSER_FOCUS_EVENT, { detail: conversationId }));
}

// true uma vez para a conversa que pediu o cursor.
export function takeComposerFocus(conversationId: string) {
  if (pending !== conversationId) return false;
  pending = null;
  return true;
}
