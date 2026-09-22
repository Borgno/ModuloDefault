import { createRoute, z } from "@hono/zod-openapi";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { ApiProblem, ProblemSchema, type Problem } from "./lib/problem";
import { createRouter } from "./lib/router";

// Módulo de teste montado em /api/v1/probes, exercitando validação e os erros lançados.
const probes = createRouter();

probes.openapi(
  createRoute({
    method: "post",
    path: "/",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({ email: z.email(), name: z.string().min(1) }),
          },
        },
      },
    },
    responses: {
      201: {
        description: "Criado",
        content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
      },
      422: {
        description: "Inválido",
        content: { "application/problem+json": { schema: ProblemSchema } },
      },
    },
  }),
  (c) => c.json({ ok: true }, 201),
);

probes.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: {
        description: "OK",
        content: { "application/json": { schema: z.object({ id: z.string() }) } },
      },
    },
  }),
  (c) => {
    const { id } = c.req.valid("param");
    if (id === "taken") throw new ApiProblem(409, "EMAIL_TAKEN", "E-mail já usado.");
    if (id === "boom") throw new Error("detalhe interno que não pode vazar");
    return c.json({ id }, 200);
  },
);

const app = createApp({ modules: [["/probes", probes]] });

function post(path: string, body: string) {
  return app.request(path, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createApp", () => {
  it("responde o health check sem cache", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("responde 404 em Problem Details para rota inexistente", async () => {
    const res = await app.request("/api/v1/nothing");
    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toContain("application/problem+json");
    expect(await res.json()).toMatchObject({ type: "about:blank", status: 404, code: "NOT_FOUND" });
  });

  it("responde 405 com Allow quando o path existe mas o método não", async () => {
    const res = await app.request("/api/v1/probes/abc", { method: "DELETE" });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET");
    expect(await res.json()).toMatchObject({ code: "METHOD_NOT_ALLOWED" });
  });

  it("responde 422 com a lista de campos quando a validação falha", async () => {
    const res = await post("/api/v1/probes", JSON.stringify({ email: "x", name: "" }));
    expect(res.status).toBe(422);
    const body = (await res.json()) as Problem;
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.errors?.map((e) => e.field).sort()).toEqual(["email", "name"]);
  });

  it("responde 400 quando o JSON é malformado", async () => {
    const res = await post("/api/v1/probes", "{nao e json");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "MALFORMED_REQUEST" });
  });

  it("converte ApiProblem lançado no handler", async () => {
    const res = await app.request("/api/v1/probes/taken");
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "EMAIL_TAKEN", detail: "E-mail já usado." });
  });

  it("responde 500 sem vazar a mensagem do erro", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await app.request("/api/v1/probes/boom");
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("detalhe interno");
    expect(JSON.parse(text)).toMatchObject({ code: "INTERNAL_ERROR" });
    spy.mockRestore();
  });

  it("publica o contrato OpenAPI com as rotas dos módulos", async () => {
    const res = await app.request("/api/v1/openapi.json");
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { paths: Record<string, unknown> };
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(["/probes", "/probes/{id}"]));
  });
});
