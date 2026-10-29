// Silenciar por 8 horas, 1 semana ou sempre: vale para os avisos do sistema e para cada conversa.
// Silenciado não avisa nem toca (o contador continua, em cinza). O prazo vence sozinho.

export const MUTE_OPTIONS = ["8h", "1w", "always"] as const;
export type MuteOption = (typeof MUTE_OPTIONS)[number];

const DURATION_MS: Record<Exclude<MuteOption, "always">, number> = {
  "8h": 8 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

// `until` null: para sempre.
export function muteUntil(option: MuteOption, now = Date.now()): { until: Date | null } {
  return { until: option === "always" ? null : new Date(now + DURATION_MS[option]) };
}

export function isMuted(mute: { until: Date | null } | null | undefined, now = Date.now()) {
  return !!mute && (mute.until === null || mute.until.getTime() > now);
}
