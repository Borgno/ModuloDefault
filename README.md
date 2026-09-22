# Default

Template de projeto web da organização. Um projeto novo nasce daqui já com login, gestão de usuários,
dashboard, backend, testes, CI e deploy prontos, e com as regras de arquitetura garantidas pelo lint.

## O que vem pronto

- **Login** com sessão em cookie HttpOnly, limite de tentativas e troca de senha obrigatória depois de
  um reset.
- **Gestão de usuários** (admin): lista com busca, filtros e paginação, criação, drawer de detalhe com
  edição, role, desativação, reset de senha e histórico de audit.
- **Perfil**: nome e troca de senha.
- **Dashboard** que muda com a role: números do sistema para o admin, e para o usuário comum um
  resumo do próprio acesso, que cada projeto troca pelo que a pessoa precisa ver
  (`app/routes/dashboard/_components/UserDashboard.tsx`).
- **Shell**: sidebar por role com categorias recolhíveis e três modos (expandida, recolhida, expandir
  ao passar o mouse), menu do perfil com tema e sair, barra inferior no celular, tema claro e escuro
  sem flash.
- **API** versionada em `/api/v1`, com contrato OpenAPI, Swagger e erro em Problem Details.

Esses domínios são a referência: ao criar algo novo, copie o formato deles.

## Stack

- **React 19** e **React Router 8** em framework mode, como SPA (`ssr: false`)
- **Hono** com `@hono/zod-openapi` no backend, no mesmo repositório
- **TanStack Query**, **react-hook-form** e **Zod**
- **Tailwind CSS 4** com componentes **shadcn/Radix**
- **Vitest** e **Playwright**
- **bun** como package manager

Sem banco de dados nesta etapa: os dados ficam em memória (ver [Próxima etapa](#próxima-etapa)).

## Começar

Requisitos: Node.js 22.22 ou superior e bun 1.4.2 (fixado em `packageManager`).

```bash
bun install
cp .env.example .env   # preencha SESSION_SECRET (openssl rand -base64 48) e SEED_PASSWORD
bun run dev            # front em http://localhost:3000, API em :3001
```

Todo start recria dois usuários, com a senha de `SEED_PASSWORD`:

| E-mail             | Role  |
| :----------------- | :---- |
| `admin@local.test` | admin |
| `user@local.test`  | user  |

Um restart do servidor apaga o que foi criado pela tela.

## Comandos

```bash
bun run dev           # front e API juntos
bun run build         # build/client (SPA) e build/api (servidor)
bun run start         # roda o build de produção
bun run lint          # eslint, incluindo as regras de arquitetura
bun run lint:api      # Spectral sobre o contrato OpenAPI, com as regras de API
bun run format        # prettier
bun run typecheck     # tipos do front
bun run typecheck:api # tipos do servidor
bun run test          # vitest (test:run para rodar uma vez)
bun run test:e2e      # playwright contra o build de produção (porta 4173)
```

O CI (`.github/workflows/ci.yml`) roda todos eles em cada PR.

## Estrutura

```text
app/                  # frontend
├── routes.ts         # rotas
├── routes/           # telas; uma pasta quando a tela tem partes privadas (_components, _hooks)
├── components/       # ui (shadcn), layout, patterns, widgets
├── config/           # nome do app e navegação
└── lib/              # api, sessão, query client, tema, formatação
server/               # backend
├── app.ts            # monta o app: /api/health, /api/v1, erros, SPA em produção
├── routes/           # um módulo por recurso (routes, handlers, schemas, index, teste)
├── services/         # regra de negócio e todo acesso a dados
├── middleware/       # sessão e role
└── lib/              # store em memória, Problem Details, router
e2e/                  # testes do caminho do usuário
docs/                 # patterns e design system
```

## Como funciona

**Em desenvolvimento**, o Vite serve o front em `PORT` (3000) e faz proxy de `/api` para o Hono em
`API_PORT` (3001).
**Em produção**, um processo só: o Hono serve o SPA e a API na mesma porta, e qualquer URL fora de
`/api` devolve o `index.html`.

`dependencies` tem só o que o servidor importa em runtime, porque a imagem instala só elas. A exceção
é o `isbot`: o React Router exige o pacote ali quando não há `app/entry.server.tsx`.

A arquitetura em uma frase de cada lado: no servidor, **só `services/` acessa dados**; no front, **só
`app/lib/api.ts` fala com o servidor**. O ESLint barra as duas violações com `ARCHITECTURE_VIOLATION`.

## Documentação

- [docs/PATTERNS/BACKEND-ARCH.md](docs/PATTERNS/BACKEND-ARCH.md): camadas e módulo de domínio
- [docs/PATTERNS/API-DESIGN.md](docs/PATTERNS/API-DESIGN.md): regras da API e matriz de rotas
- [docs/PATTERNS/FRONTEND-ARCH.md](docs/PATTERNS/FRONTEND-ARCH.md): colocation, dados, sessão, formulários
- [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md): tokens, tipografia, componentes
- `CLAUDE.md` (e o symlink `AGENTS.md`): guia para agentes de código
- `.agents/skills/`: `backend-domain`, `new-screen` e a skill oficial `react-router`

## Deploy

`Dockerfile` multi-stage: build com bun e Node, runtime `node:24-alpine` como usuário `node`, com
`HEALTHCHECK` em `/api/health`. O `docker-compose.yml` é o do Dokploy: sem `ports:` publicadas, o
domínio é cadastrado na aba Domains. Variáveis obrigatórias: `SESSION_SECRET` e `SEED_PASSWORD`.

Versão e CHANGELOG saem do release-please, a partir das mensagens de commit em Conventional Commits.

## Criar um projeto a partir do template

1. "Use this template" no GitHub, ou copie o repositório.
2. Troque o nome em `package.json`, `app/config/app.ts` e no título do contrato em `server/app.ts`.
3. Gere um `SESSION_SECRET` novo por ambiente.
4. Crie o secret `RELEASE_PLEASE_TOKEN` no repositório, para o PR de release rodar o CI.
5. Apague ou adapte o que o projeto não usa. O domínio de usuários e a sessão ficam: o resto depende
   deles.

## Próxima etapa

- **Banco de dados:** Postgres com Prisma, um schema por escopo (`identity`, `audit`), tabela
  `identity.users`. A troca fica em `server/services/` e `server/lib/`; rotas e telas não mudam. O
  fluxo de dados de referência está em [docs/PATTERNS/REFERENCE-DATA.md](docs/PATTERNS/REFERENCE-DATA.md).
- Recuperação de senha por e-mail e upload de arquivo ficam fora.
