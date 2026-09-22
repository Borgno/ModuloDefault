// Gera build/openapi.json a partir das rotas, sem subir servidor. Usado pelo Spectral no CI.
import { mkdirSync, writeFileSync } from "node:fs";

// O contrato não depende de segredo, mas o env.ts exige as variáveis para carregar os módulos.
process.env.SESSION_SECRET ??= "openapi-dump-placeholder-secret-0000000000";
process.env.SEED_PASSWORD ??= "openapi-dump";

const { createApp } = await import("../app");
const res = await createApp().request("/api/v1/openapi.json");
if (!res.ok) throw new Error(`openapi.json respondeu ${res.status}`);

mkdirSync("build", { recursive: true });
writeFileSync("build/openapi.json", JSON.stringify(await res.json(), null, 2));
console.log("build/openapi.json gerado");
