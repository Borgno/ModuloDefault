---
name: backend-domain
description: Cria ou modifica um domínio da API (server/routes e server/services) seguindo a arquitetura em camadas e o desenho de API do projeto. Use ao adicionar ou editar endpoints, criar um recurso novo, mover acesso a dados para services, ou ao depurar erro de tipo "_data not assignable to never" no @hono/zod-openapi.
---

# Domínio de backend (Hono + @hono/zod-openapi)

Procedimento operacional. O racional completo está em `docs/PATTERNS/BACKEND-ARCH.md` e
`docs/PATTERNS/API-DESIGN.md`; leia se precisar do porquê.

## Regras que não se negociam

- **Só `server/services/` importa o store** (`server/lib/memoryStore.ts`) ou o client do banco. O lint
  barra em `routes/` e `middleware/` com `ARCHITECTURE_VIOLATION`. Não contorne com `eslint-disable`.
- **Erro nunca é montado à mão.** Service e handler lançam `new ApiProblem(status, "CODE", "mensagem")`.
  Sem `try/catch` no handler.
- **Path em camelCase, substantivo no plural, sem verbo.** Ação é o método HTTP. Filtro, busca,
  ordenação e paginação na query string.
- Toda rota de lista aceita `search` na query (busca no servidor), além de paginação e ordenação.
- Sucesso sem envelope: recurso direto, ou `{ data, meta }` para lista (`listSchema` de
  `server/schemas/common.ts`).

## Passos para um recurso novo

1. **Dados:** se precisar de uma coleção nova, adicione ao `store` em `server/lib/memoryStore.ts`.
2. **Service** (`server/services/<dominio>/<dominio>.service.ts`): funções puras, sem `c`. Lê e escreve
   no store, lança `ApiProblem` para inexistente (`404`) e conflito (`409`), grava `recordAudit` em toda
   mudança que um admin precise rastrear.
3. **Schemas** (`server/routes/<dominio>/<dominio>.schemas.ts`): `z` de `@hono/zod-openapi`, camelCase,
   `.openapi("Nome")` nos schemas de corpo. Nunca `z.any()` em resposta.
4. **Rotas** (`<dominio>.routes.ts`): `createRoute` com status de sucesso literais e erros em
   `...problemResponses(...)`, incluindo o `401`/`403` dos middlewares e o `422` de validação. Rota de
   admin: `middleware: [requireAuth(), requireRole("admin")]`.
5. **Handlers** (`<dominio>.handlers.ts`): `RouteHandler<typeof rota, HonoEnv>`. Lê
   `c.req.valid("json" | "param" | "query")`, chama o service, devolve `c.json(resultado, status)`.
   Criação: `201` com header `Location` quando o recurso tem endereço próprio.
6. **Wire** (`index.ts`): `const x = createRouter(); x.openapi(rota, handler); export default x;`.
7. **Montar:** entrada em `server/routes/index.ts` e a tag no `doc31` de `server/app.ts`.
8. **Documentar:** linha na matriz de path por método do `docs/PATTERNS/API-DESIGN.md`.
9. **Testar** (`<dominio>.test.ts`, com `setupApp` e `loginAs` de `server/test/helpers.ts`): sucesso,
   `422`, `401`/`403`, e o conflito ou inexistente do domínio.

## Erro "_data not assignable to never"

Cheque nesta ordem:

1. Algum response schema usa `z.any()`? Troque por `z.unknown()` ou um schema concreto.
2. O handler devolve um status de sucesso que não está no `responses`?
3. Tem cast `as Handler`? Remova: ele apaga o tipo dos inputs.

## Antes de concluir

`bun run typecheck:api`, `bun run lint`, `bun run lint:api` e `bun run test:run`.
