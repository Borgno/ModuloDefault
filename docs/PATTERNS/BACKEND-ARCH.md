---
tags: [patterns, backend, architecture]
status: current
updated: 2026-09-21
related:
  - ./API-DESIGN.md
  - ./FRONTEND-ARCH.md
---

# Backend: Domain-Centric Layered Architecture

O negócio fica no centro e o Hono é só a casca externa. Este doc define a organização do `server/`
e responde uma pergunta concreta: **onde mora o acesso aos dados?**

Resposta curta: **só na camada de services.** Rotas, handlers e middleware nunca importam o store
nem o client do banco.

## As três arquiteturas que convergem

### 1. Modular Monolith

O backend é um processo só, dividido em módulos de domínio (`users`, `sessions`, `auditEvents`). Se um
módulo crescer a ponto de precisar virar serviço separado, ele já está contido na própria pasta, e a
extração não exige caçar lógica espalhada pelo resto do servidor.

### 2. Layered Architecture

| Camada         | Pasta                   | Responsabilidade                                                      | Pode importar                                                                       |
| :------------- | :---------------------- | :-------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| Interface      | `routes/`               | Protocolo HTTP, contrato OpenAPI, validação de entrada e saída. Fina. | `services/`, schemas do próprio módulo, `schemas/common.ts`, `lib/` (menos o store) |
| Negócio        | `services/`             | Regra de negócio, agregação e **todo o acesso a dados**.              | `lib/`, `integrations/`, outros `services/`                                         |
| Infraestrutura | `lib/`, `integrations/` | Store de dados, erros, cookie, SDKs externos. Sem regra de negócio.   | bibliotecas externas                                                                |

### 3. Feature-Driven

Arquivos agrupados por funcionalidade, não por tipo técnico. Tudo de usuários vive em
`routes/users/` e `services/users/`. Arquivos que mudam juntos ficam juntos (Code Locality).

## A Regra de Ouro

> **Só `services/` importa o acesso a dados** (`server/lib/memoryStore.ts` hoje, o client do Prisma
> quando o banco entrar). Rotas, handlers e middleware nunca tocam nos dados diretamente.

Corolários:

- A rota recebe a requisição, valida com Zod, chama um service e devolve o resultado no formato do
  contrato. Nada mais.
- Service não conhece o `c` (Context do Hono): recebe argumentos puros, retorna dados puros ou lança
  `ApiProblem`. Isso deixa o service testável sem subir servidor HTTP.
- Middleware que precisa de dado (resolver a sessão) chama um service.
- Trocar o acesso a dados mexe só em `services/` e `lib/`. Rotas e telas não mudam.

## Estrutura

```text
server/
├── index.ts           # sobe o servidor (seed, porta, SIGTERM)
├── app.ts             # monta o app: /api/health, /api/v1, erros, SPA em produção
├── env.ts             # lê e valida as variáveis; derruba o processo se faltar segredo
├── types.ts           # HonoEnv (variáveis de request, como o usuário da sessão)
├── lib/
│   ├── memoryStore.ts # dados em memória (lugar do client do banco)
│   ├── problem.ts     # ApiProblem, ProblemSchema, problemResponses
│   ├── router.ts      # createRouter: todo módulo nasce daqui
│   ├── allowedMethods.ts  # 405 com Allow, a partir do contrato
│   └── sessionCookie.ts
├── middleware/        # requireAuth, requireRole
├── schemas/
│   └── common.ts      # paginação, ordenação, lista paginada
├── routes/            # um módulo por recurso, montado em server/routes/index.ts
│   └── users/
│       ├── users.routes.ts    # createRoute (contrato OpenAPI)
│       ├── users.handlers.ts  # protocolo: status, header, cookie
│       ├── users.schemas.ts   # schemas Zod do domínio
│       ├── users.test.ts
│       └── index.ts           # liga rota ao handler
└── services/
    └── users/
        └── users.service.ts
```

**Onde ficam os schemas.** O schema de um domínio mora na pasta do módulo, porque o contrato muda junto
com a rota que o usa. O que é comum a todos os módulos (paginação, ordenação) fica em
`server/schemas/common.ts`, e o formato de erro em `server/lib/problem.ts`.

## O módulo de domínio em quatro arquivos

A divisão separa o **contrato da API** (`*.routes.ts`) da **execução** (`*.handlers.ts`). Isso protege a
inferência de tipos do `@hono/zod-openapi`: um erro de status ou de formato no handler aparece na linha
do `return c.json(...)`.

Convenções:

- `z` e `createRoute` vêm de `@hono/zod-openapi`, não de `zod` puro.
- O router vem de `createRouter()` (`server/lib/router.ts`), que converte falha de validação em `422`.
- O tipo do handler é `RouteHandler<typeof rota, HonoEnv>`. Nunca cast `as Handler`: ele apaga o tipo
  dos inputs.
- **Status de sucesso** escritos literalmente no `responses`, com o schema da resposta.
- **Status de erro** declarados com `...problemResponses(401, 409, 422)`. O handler nunca devolve esses
  status: ele lança `ApiProblem`, e o error handler do app responde. Por isso o spread não interfere na
  inferência do retorno do handler.
- Response schema nunca usa `z.any()`: ele colapsa o tipo esperado do handler para `never`. Use
  `z.unknown()` ou um schema concreto.
- Imports relativos sem extensão (`moduleResolution: bundler`; o esbuild empacota o servidor).

```typescript
// server/services/clients/clients.service.ts
import { ApiProblem } from "../../lib/problem";
import { store } from "../../lib/memoryStore";

export function getClient(id: string) {
  const client = store.clients.get(id);
  if (!client) throw new ApiProblem(404, "CLIENT_NOT_FOUND", "Cliente não encontrado.");
  return client;
}
```

```typescript
// server/routes/clients/clients.schemas.ts
import { z } from "@hono/zod-openapi";

export const ClientIdParamSchema = z.object({
  id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

export const ClientSchema = z
  .object({ id: z.uuid(), name: z.string(), active: z.boolean() })
  .openapi("Client");
```

```typescript
// server/routes/clients/clients.routes.ts
import { createRoute } from "@hono/zod-openapi";
import { problemResponses } from "../../lib/problem";
import { requireAuth } from "../../middleware/auth";
import { ClientIdParamSchema, ClientSchema } from "./clients.schemas";

export const getClientRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Clients"],
  summary: "Detalhe de um cliente",
  middleware: [requireAuth()] as const,
  request: { params: ClientIdParamSchema },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: ClientSchema } } },
    ...problemResponses(401, 404, 422),
  },
});
```

```typescript
// server/routes/clients/clients.handlers.ts
import type { RouteHandler } from "@hono/zod-openapi";
import { getClient } from "../../services/clients/clients.service";
import type { HonoEnv } from "../../types";
import type { getClientRoute } from "./clients.routes";

export const getClientHandler: RouteHandler<typeof getClientRoute, HonoEnv> = (c) => {
  return c.json(getClient(c.req.valid("param").id), 200);
};
```

```typescript
// server/routes/clients/index.ts
import { createRouter } from "../../lib/router";
import { getClientHandler } from "./clients.handlers";
import { getClientRoute } from "./clients.routes";

const clients = createRouter();
clients.openapi(getClientRoute, getClientHandler);

export default clients;
```

Por fim, o módulo entra na lista de `server/routes/index.ts` (`["/clients", clients]`) e a tag entra no
`doc31` de `server/app.ts`.

Repare no que o handler **não** faz: não tem `try/catch`, não monta corpo de erro, não conhece o store.
O `404` sai do service como `ApiProblem` e vira Problem Details no error handler.

## Onde mora cada coisa

| Situação                                | Vai para                                                      |
| :-------------------------------------- | :------------------------------------------------------------ |
| Leitura ou escrita de dados             | `services/<dominio>/`                                         |
| Cálculo, agregação, regra de negócio    | `services/<dominio>/`                                         |
| Erro de negócio (conflito, inexistente) | `throw new ApiProblem(status, "CODE", "mensagem")` no service |
| Definição de rota                       | `routes/<dominio>/<dominio>.routes.ts`                        |
| Handler (status, header, cookie)        | `routes/<dominio>/<dominio>.handlers.ts`                      |
| Schema Zod do domínio                   | `routes/<dominio>/<dominio>.schemas.ts`                       |
| Paginação, ordenação                    | `schemas/common.ts`                                           |
| Registro de audit                       | `recordAudit()` no service, na mesma operação                 |
| Lógica transversal (auth, permissão)    | `middleware/`                                                 |

## Como a Regra de Ouro é garantida

`no-restricted-imports` no `eslint.config.js`, rodando no CI: importar o store (ou o client do banco)
em `server/routes/` ou `server/middleware/` quebra o lint com `ARCHITECTURE_VIOLATION`. Arquivos de
teste ficam de fora, porque leem o store para conferir o efeito de uma requisição.

## Checklist por domínio

- [ ] Nenhum import do store ou do client do banco em `routes/` ou `middleware/`.
- [ ] Toda leitura e escrita de dados vive em `services/<dominio>/`.
- [ ] Handlers chamam services e só mapeiam o resultado para o contrato. Sem `try/catch`.
- [ ] Services não recebem `c`; recebem argumentos puros e lançam `ApiProblem`.
- [ ] Erros declarados com `problemResponses`, incluindo o `401`/`403` dos middlewares.
- [ ] Nenhum `z.any()` em response schema; nenhum cast `as Handler`.
- [ ] Rotas documentadas na matriz do `API-DESIGN.md`, e `bun run lint:api` limpo.
- [ ] Teste de rota cobrindo sucesso, validação (`422`) e autorização (`401`/`403`).
