// Configurações de notificação, guardadas no navegador de cada usuário (não no servidor) e mandadas junto
// com a inscrição de Web Push, para o aviso com a aba fechada seguir as mesmas regras da página. Usado
// pela página e pelo servidor (shared/ não importa app/ nem server/).

// Cada tipo de aviso tem as próprias: avisos do sistema, conversas de duas pessoas e grupos.
export const NOTIFICATION_KINDS = ["notices", "messages", "groups"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type KindPreferences = {
  // Notificação do sistema.
  show: boolean;
  // Som do app ao chegar.
  sound: boolean;
};

export type NotificationPreferences = Record<NotificationKind, KindPreferences> & {
  // Desligado, a notificação não mostra o texto: só quantas há, ou de quem é.
  previews: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  notices: { show: true, sound: true },
  messages: { show: true, sound: true },
  groups: { show: true, sound: true },
  previews: true,
};

const pickBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const asRecord = (value: unknown) =>
  (value && typeof value === "object" ? value : {}) as Record<string, unknown>;

// Campo ausente ou com tipo errado fica com o valor padrão. O formato antigo, sem tipos
// ({ show, sound, previews }), vale para os três.
export function normalizeNotificationPreferences(raw: unknown): NotificationPreferences {
  const source = asRecord(raw);
  const d = DEFAULT_NOTIFICATION_PREFERENCES;
  const kind = (key: NotificationKind): KindPreferences => {
    const given = asRecord(source[key]);
    return {
      show: pickBoolean(given.show, pickBoolean(source.show, d[key].show)),
      sound: pickBoolean(given.sound, pickBoolean(source.sound, d[key].sound)),
    };
  };
  return {
    notices: kind("notices"),
    messages: kind("messages"),
    groups: kind("groups"),
    previews: pickBoolean(source.previews, d.previews),
  };
}
