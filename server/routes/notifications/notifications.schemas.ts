import { z } from "@hono/zod-openapi";
import {
  PageMetaSchema,
  PageQuerySchema,
  QueryBooleanSchema,
  searchSchema,
} from "../../schemas/common";
import { MUTE_OPTIONS } from "../../services/notifications/mute";

export const NotificationSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    body: z.string(),
    url: z.string().nullable().openapi({ description: "Caminho do app aberto no clique." }),
    senderName: z
      .string()
      .nullable()
      .openapi({ description: "Quem causou o aviso. Sem prévia, a notificação diz só isso." }),
    important: z.boolean().openapi({ description: "Avisa mesmo com os avisos silenciados." }),
    read: z.boolean(),
    archived: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .openapi("Notification");

export const NotificationIdParamSchema = z.object({
  id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

export const ListNotificationsQuerySchema = PageQuerySchema.extend({
  search: searchSchema(["titulo", "texto"]),
  read: QueryBooleanSchema.optional().openapi({ type: "string", enum: ["true", "false"] }),
  archived: QueryBooleanSchema.optional().openapi({
    type: "string",
    enum: ["true", "false"],
    description: "Sem o filtro, só as não arquivadas.",
  }),
});

// A lista leva o total de não lidas do usuário, para o contador da aba não precisar de outra ida.
export const NotificationListSchema = z
  .object({
    data: z.array(NotificationSchema),
    meta: PageMetaSchema.extend({ unread: z.number().int() }),
  })
  .openapi("NotificationList");

export const UpdateNotificationSchema = z
  .object({ read: z.boolean(), archived: z.boolean() })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Informe read ou archived.")
  .openapi("UpdateNotification");

// Na coleção, só marcar todas como lidas.
export const UpdateNotificationsSchema = z
  .object({ read: z.literal(true) })
  .openapi("UpdateNotifications");

// Avisos do sistema silenciados. `mutedUntil` null com `muted`: para sempre.
export const NoticeMuteSchema = z
  .object({ muted: z.boolean(), mutedUntil: z.iso.datetime().nullable() })
  .openapi("NoticeMute");

export const UpdateNoticeMuteSchema = z
  .object({
    mute: z
      .enum(MUTE_OPTIONS)
      .nullable()
      .openapi({ description: "8h, 1w (uma semana) ou always. null volta a avisar." }),
  })
  .openapi("UpdateNoticeMute");
