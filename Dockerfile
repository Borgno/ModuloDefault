# SPA + API num container só: o Hono serve build/client e /api na mesma porta.

# Mesma versão do "packageManager" no package.json. Um bun mais antigo não lê o bun.lock.
ARG BUN_VERSION=1.4.2

FROM oven/bun:${BUN_VERSION} AS bun

# --- Build: instala tudo, gera build/client (Vite) e build/api (esbuild) -------------------------
# Imagem Node com o binário do bun copiado: o bun instala as dependências, e o `react-router build`
# roda sobre o Node, o mesmo runtime do dev e do CI.
FROM node:24-slim AS builder
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# --- Dependências de runtime: só o que o servidor importa (dependencies) -------------------------
FROM bun AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# --- Runtime -------------------------------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# package.json vai junto por causa do "type": "module": o bundle é ESM.
COPY --chown=node:node package.json ./
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/build/client ./build/client
COPY --from=builder --chown=node:node /app/build/api ./build/api

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "build/api/index.js"]
