import { z } from "@hono/zod-openapi";

// Paginação e ordenação de listas, em query string: ?page=2&pageSize=20&sort=-createdAt
export const PageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
});

export const PageMetaSchema = z
  .object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  })
  .openapi("PageMeta");

// Lista paginada: { data: [...], meta: { page, pageSize, total } }
export function listSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), meta: PageMetaSchema });
}

// Booleano em query string chega como texto: "true" ou "false".
export const QueryBooleanSchema = z.enum(["true", "false"]).transform((value) => value === "true");

// Campo de ordenação: nome do campo, com "-" na frente para decrescente.
export function sortSchema<const F extends readonly [string, ...string[]]>(
  fields: F,
  fallback: string,
) {
  const values = fields.flatMap((field) => [field, `-${field}`]) as [string, ...string[]];
  return z.enum(values).default(fallback);
}
