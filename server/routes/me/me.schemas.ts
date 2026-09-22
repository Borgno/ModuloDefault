import { z } from "@hono/zod-openapi";
import { PasswordSchema } from "../users/users.schemas";

export const UpdateMeSchema = z
  .object({
    fullName: z.string().trim().min(1, "Informe o nome.").max(120, "Use no máximo 120 caracteres."),
  })
  .openapi("UpdateMe");

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: PasswordSchema,
  })
  .openapi("ChangePassword");
