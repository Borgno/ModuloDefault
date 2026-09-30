import { z } from "zod";

// Espelha as regras do servidor (server/routes/users/users.schemas.ts) para dar o erro antes do envio.
// O servidor valida de novo; os erros dele chegam pelos mesmos campos (applyApiErrors).
export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome.")
  .max(120, "Use no máximo 120 caracteres.");

export const passwordSchema = z
  .string()
  .min(8, "Use ao menos 8 caracteres.")
  .max(72, "Use no máximo 72 caracteres.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Use no máximo 72 caracteres.");

export const roleSchema = z.enum(["admin", "user"]);

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")),
  fullName: fullNameSchema,
  role: roleSchema,
  password: passwordSchema,
});

export const editUserSchema = z.object({
  fullName: fullNameSchema,
  role: roleSchema,
});
