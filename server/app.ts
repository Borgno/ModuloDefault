import { readFileSync } from "node:fs";
import { serveStatic } from "@hono/node-server/serve-static";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { allowedMethods } from "./lib/allowedMethods";
import { ApiProblem, problemResponse } from "./lib/problem";
import { createRouter, type Router } from "./lib/router";
import { modules as defaultModules } from "./routes";
import type { HonoEnv } from "./types";

const API_V1 = "/api/v1";
const CLIENT_DIR = "./build/client";

type AppOptions = {
  // Serve o build do SPA (build/client) na mesma origem da API. Ligado em produção.
  serveClient?: boolean;
  // Loga método, path, status e duração de cada request da API.
  logRequests?: boolean;
  modules?: Array<[string, Router]>;
};

export function createApp({
  serveClient = false,
  logRequests = false,
  modules = defaultModules,
}: AppOptions = {}) {
  const app = new OpenAPIHono<HonoEnv>();
  const isApi = (path: string) => path === "/api" || path.startsWith("/api/");

  if (logRequests) {
    // Só método e path, sem query nem corpo: nada sensível chega ao log.
    app.use("/api/*", async (c, next) => {
      const start = performance.now();
      await next();
      const ms = Math.round(performance.now() - start);
      console.log(`${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`);
    });
  }

  // Toda resposta da API é dinâmica: sem cache HTTP.
  app.use("/api/*", async (c, next) => {
    await next();
    c.header("Cache-Control", "no-store");
  });

  // Fora da versão: é contrato de infraestrutura, não da aplicação.
  app.get("/api/health", (c) => c.json({ status: "ok" }));

  const v1 = createRouter();
  for (const [path, router] of modules) v1.route(path, router);
  v1.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: { title: "Default API", version: "1.0.0" },
    // Toda tag usada numa rota precisa estar aqui (regra do Spectral no CI).
    tags: [
      { name: "Sessions", description: "Login e logout" },
      { name: "Me", description: "O usuário da sessão" },
      { name: "Users", description: "Gestão de usuários (admin)" },
      { name: "Audit", description: "Histórico de ações (admin)" },
    ],
  });
  v1.get("/docs", swaggerUI({ url: `${API_V1}/openapi.json` }));
  app.route(API_V1, v1);

  if (serveClient) {
    const serveAssets = serveStatic({ root: CLIENT_DIR });
    app.use("*", (c, next) => (isApi(c.req.path) ? next() : serveAssets(c, next)));
  }

  const indexHtml = serveClient ? readFileSync(`${CLIENT_DIR}/index.html`, "utf8") : null;

  app.notFound((c) => {
    const path = c.req.path;

    if (path.startsWith(`${API_V1}/`)) {
      const allowed = allowedMethods(v1, path.slice(API_V1.length));
      if (allowed.length > 0) {
        return problemResponse(
          c,
          { status: 405, code: "METHOD_NOT_ALLOWED", detail: `Use ${allowed.join(", ")}.` },
          { Allow: allowed.join(", ") },
        );
      }
    }

    // Qualquer URL que não é da API é uma rota do SPA: devolve o index.html e o React Router assume.
    if (!isApi(path) && indexHtml && c.req.method === "GET") return c.html(indexHtml);

    return problemResponse(c, {
      status: 404,
      code: "NOT_FOUND",
      detail: "Recurso não encontrado.",
    });
  });

  app.onError((error, c) => {
    if (error instanceof ApiProblem) {
      return problemResponse(
        c,
        { status: error.status, code: error.code, detail: error.detail, errors: error.errors },
        error.headers,
      );
    }

    // Erros do próprio Hono, como JSON malformado no corpo (400).
    if (error instanceof HTTPException) {
      return problemResponse(c, {
        status: error.status,
        code: error.status === 400 ? "MALFORMED_REQUEST" : "HTTP_ERROR",
        detail: error.message,
      });
    }

    console.error(error);
    return problemResponse(c, { status: 500, code: "INTERNAL_ERROR", detail: "Erro interno." });
  });

  return app;
}
