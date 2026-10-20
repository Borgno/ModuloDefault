import { z } from "@hono/zod-openapi";

export const LoginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Informe o usuário.")
      .max(254)
      .openapi({ description: "Nome de usuário (antes do @) ou e-mail completo." }),
    password: z.string().min(1, "Informe a senha."),
  })
  .openapi("Login");
