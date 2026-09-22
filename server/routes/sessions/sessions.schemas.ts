import { z } from "@hono/zod-openapi";
import { EmailSchema } from "../users/users.schemas";

export const LoginSchema = z
  .object({
    email: EmailSchema,
    password: z.string().min(1, "Informe a senha."),
  })
  .openapi("Login");
