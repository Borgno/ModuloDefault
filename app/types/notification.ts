// Espelha server/routes/notifications/notifications.schemas.ts. O frontend não importa o servidor (regra
// do ESLint).
export type AppNotification = {
  id: string;
  title: string;
  body: string;
  // Caminho do app aberto no clique.
  url: string | null;
  // Quem causou o aviso. Sem prévia, a notificação diz só isso.
  senderName: string | null;
  // Avisa mesmo com os avisos silenciados.
  important: boolean;
  read: boolean;
  archived: boolean;
  createdAt: string;
};

export type NotificationPage = {
  data: AppNotification[];
  // `unread`: não lidas fora das arquivadas, para o contador.
  meta: { page: number; pageSize: number; total: number; unread: number };
};

// Avisos do sistema silenciados. `mutedUntil` null com `muted`: para sempre.
export type NoticeMute = { muted: boolean; mutedUntil: string | null };

// 8 horas, 1 semana ou sempre.
export type MuteOption = "8h" | "1w" | "always";

export const MUTE_LABELS: Record<MuteOption, string> = {
  "8h": "8 horas",
  "1w": "1 semana",
  always: "Sempre",
};

// Configurações de notificação deste navegador, por tipo de aviso (shared/notificationPreferences.ts).
export {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type KindPreferences,
  type NotificationKind,
  type NotificationPreferences,
} from "~shared/notificationPreferences";
