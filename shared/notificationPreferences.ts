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

// Sons gerados no navegador (app/lib/notifier/sounds.ts), sem arquivo nem site externo.
export const NOTIFICATION_SOUNDS = ["padrao", "sino", "chime", "pop"] as const;
export type NotificationSound = (typeof NOTIFICATION_SOUNDS)[number];

export type NotificationPreferences = Record<NotificationKind, KindPreferences> & {
  // Desligado, a notificação não mostra o texto: só quantas há, ou de quem é.
  previews: boolean;
  // Silencia o som de todos os tipos, inclusive o do sistema. As notificações continuam.
  muted: boolean;
  // Fim do silêncio temporário, em ms desde 1970. Null com `muted`: até a pessoa desligar.
  mutedUntil: number | null;
  sound: NotificationSound;
  // De 0 a 1.
  volume: number;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  notices: { show: true, sound: true },
  messages: { show: true, sound: true },
  groups: { show: true, sound: true },
  previews: true,
  muted: false,
  mutedUntil: null,
  sound: "padrao",
  volume: 0.5,
};

// Silêncio valendo agora. O temporário vencido conta como desligado, sem precisar regravar.
export function isMuted(prefs: NotificationPreferences, now = Date.now()) {
  return prefs.muted && (prefs.mutedUntil === null || now < prefs.mutedUntil);
}

// Som de um tipo de aviso: ligado no tipo e sem silêncio.
export const soundOn = (prefs: NotificationPreferences, kind: NotificationKind) =>
  prefs[kind].sound && !isMuted(prefs);

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
    muted: pickBoolean(source.muted, d.muted),
    mutedUntil:
      typeof source.mutedUntil === "number" && Number.isFinite(source.mutedUntil)
        ? source.mutedUntil
        : null,
    sound: NOTIFICATION_SOUNDS.includes(source.sound as NotificationSound)
      ? (source.sound as NotificationSound)
      : d.sound,
    volume:
      typeof source.volume === "number" && Number.isFinite(source.volume)
        ? Math.min(1, Math.max(0, source.volume))
        : d.volume,
  };
}
