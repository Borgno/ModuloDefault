import { z } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

// Formato único de erro da API: Problem Details (RFC 9457).
export const ProblemSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    detail: z.string().optional(),
    code: z.string(),
    errors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
  })
  .openapi("Problem");

export type Problem = z.infer<typeof ProblemSchema>;
export type FieldError = NonNullable<Problem["errors"]>[number];

const TITLES: Partial<Record<number, string>> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  500: "Internal Server Error",
};

// Lançada por services e handlers. O error handler do app converte em resposta Problem Details, então
// nenhuma rota monta corpo de erro à mão.
export class ApiProblem extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;
  readonly detail?: string;
  readonly errors?: FieldError[];
  readonly headers?: Record<string, string>;

  constructor(
    status: ContentfulStatusCode,
    code: string,
    detail?: string,
    options: { errors?: FieldError[]; headers?: Record<string, string> } = {},
  ) {
    super(detail ?? code);
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.errors = options.errors;
    this.headers = options.headers;
  }
}

// Respostas de erro para declarar no contrato de uma rota: problemResponses(401, 422).
// Os handlers nunca devolvem esses status (lançam ApiProblem), então o spread não interfere na
// inferência do tipo de retorno do handler.
export function problemResponses<const S extends readonly number[]>(...statuses: S) {
  return Object.fromEntries(
    statuses.map((status) => [
      status,
      {
        description: TITLES[status] ?? "Error",
        content: { "application/problem+json": { schema: ProblemSchema } },
      },
    ]),
  ) as {
    [K in S[number]]: {
      description: string;
      content: { "application/problem+json": { schema: typeof ProblemSchema } };
    };
  };
}

export function problemResponse(
  c: Context,
  problem: Omit<Problem, "type" | "title">,
  headers: Record<string, string> = {},
) {
  const body: Problem = {
    type: "about:blank",
    title: TITLES[problem.status] ?? "Error",
    ...problem,
  };
  return c.json(body, problem.status as ContentfulStatusCode, {
    ...headers,
    "Content-Type": "application/problem+json",
  });
}
