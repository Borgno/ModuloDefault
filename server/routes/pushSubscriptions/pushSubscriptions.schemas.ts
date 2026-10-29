import { z } from "@hono/zod-openapi";

const KindPreferencesSchema = z.object({ show: z.boolean(), sound: z.boolean() }).partial();

// O que o navegador devolve em PushSubscription.toJSON(), mais as configurações de notificação dele.
export const CreatePushSubscriptionSchema = z
  .object({
    endpoint: z.url().refine((url) => url.startsWith("https://"), "O endpoint precisa ser https."),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
    preferences: z
      .object({
        notices: KindPreferencesSchema,
        messages: KindPreferencesSchema,
        groups: KindPreferencesSchema,
        previews: z.boolean(),
      })
      .partial()
      .optional()
      .openapi({
        description:
          "Configurações deste navegador: avisos, conversas e grupos. Campo ausente fica com o padrão.",
      }),
  })
  .openapi("CreatePushSubscription");

export const PushSubscriptionSchema = z.object({ id: z.uuid() }).openapi("PushSubscription");

export const PushSubscriptionIdParamSchema = z.object({
  id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});
