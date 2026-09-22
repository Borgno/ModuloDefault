import { z } from "@hono/zod-openapi";
import { listSchema, PageQuerySchema, QueryBooleanSchema, sortSchema } from "../../schemas/common";

export const RoleSchema = z.enum(["admin", "user"]).openapi("Role");

export const UserSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    fullName: z.string(),
    role: RoleSchema,
    active: z.boolean(),
    mustChangePassword: z.boolean(),
    lastLoginAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi("User");

// Normaliza (trim e minúsculas) antes de validar o formato: o Zod checa o formato do z.email() antes
// das transformações da mesma cadeia, então "  Ana@X.com " seria recusado sem o pipe.
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido."));

export const PasswordSchema = z
  .string()
  .min(8, "Use ao menos 8 caracteres.")
  .max(128, "Use no máximo 128 caracteres.");

export const UserIdParamSchema = z.object({
  id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

export const ListUsersQuerySchema = PageQuerySchema.extend({
  search: z
    .string()
    .trim()
    .min(1)
    .optional()
    .openapi({ description: "Parte do nome ou do e-mail" }),
  role: RoleSchema.optional(),
  active: QueryBooleanSchema.optional().openapi({ type: "string", enum: ["true", "false"] }),
  sort: sortSchema(["fullName", "email", "createdAt", "lastLoginAt"], "fullName"),
});

export const UserListSchema = listSchema(UserSchema).openapi("UserList");

const FullNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome.")
  .max(120, "Use no máximo 120 caracteres.");

export const CreateUserSchema = z
  .object({
    email: EmailSchema,
    fullName: FullNameSchema,
    role: RoleSchema,
    password: PasswordSchema.openapi({
      description: "Senha inicial. O usuário troca no primeiro login.",
    }),
  })
  .openapi("CreateUser");

export const UpdateUserSchema = z
  .object({
    fullName: FullNameSchema.optional(),
    role: RoleSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { message: "Informe ao menos um campo." })
  .openapi("UpdateUser");

export const PasswordResetSchema = z
  .object({
    temporaryPassword: z.string().openapi({ description: "Mostrada uma única vez." }),
  })
  .openapi("PasswordReset");
