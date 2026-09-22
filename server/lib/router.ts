import { OpenAPIHono } from "@hono/zod-openapi";
import type { HonoEnv } from "../types";
import { ApiProblem } from "./problem";

// Todo módulo de rota nasce daqui. O defaultHook converte falha de validação do Zod em 422 com a
// lista de campos, no formato Problem Details.
export function createRouter() {
  return new OpenAPIHono<HonoEnv>({
    defaultHook: (result) => {
      if (result.success) return;
      throw new ApiProblem(422, "VALIDATION_FAILED", "Os dados enviados são inválidos.", {
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    },
  });
}

export type Router = ReturnType<typeof createRouter>;
