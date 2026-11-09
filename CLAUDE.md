# CLAUDE.md

Guia para agentes de código neste repositório. `AGENTS.md` é um symlink para este arquivo.

## O que é

Template de projeto web da organização: SPA em React Router 8 (framework mode, `ssr: false`), com
backend Hono no mesmo repo. Projetos novos nascem dele. Traz login, gestão de usuários com audit,
perfil e dashboard como domínio de referência: ao criar algo novo, copie o formato deles.

## Onde está cada regra

- `docs/PATTERNS/BACKEND-ARCH.md`: camadas do servidor e o módulo de domínio.
- `docs/PATTERNS/API-DESIGN.md`: desenho da API e a matriz de rotas.
- `docs/PATTERNS/FRONTEND-ARCH.md`: colocation, dados, sessão, formulários.
- `docs/DESIGN-SYSTEM.md`: tokens, tipografia, componentes.
- Skills em `.agents/skills/` (`.claude/skills` aponta para lá): `backend-domain` para endpoint ou
  recurso novo, `new-screen` para tela nova, `react-router` para dúvida do framework.

## Comandos

```bash
bun run dev           # front (Vite, PORT=3000) e API (Hono, API_PORT=3001) juntos
bun run build         # build/client (SPA) e build/api (servidor)
bun run start         # roda o build de produção
bun run typecheck     # tipos do front (gera os tipos das rotas antes)
bun run typecheck:api # tipos do servidor (tsx e esbuild não checam tipos)
bun run lint          # eslint, incluindo as regras de arquitetura
bun run lint:api      # gera o openapi.json e roda o Spectral com as regras de API
bun run format        # prettier --write
bun run format:check  # prettier --check (roda no CI)
bun run test          # vitest em watch
bun run test:run      # vitest uma vez (roda no CI)
bun run test:e2e      # playwright contra o build de produção, porta 4173 (roda no CI)
```

Gates antes de dar uma tarefa por concluída: `lint`, `lint:api`, `format:check`, `typecheck`,
`typecheck:api`, `test:run`, `build` e `test:e2e`. São os mesmos passos do `.github/workflows/ci.yml`.

## Arquitetura

- `app/`: frontend. Rotas em `app/routes.ts`, um route module por rota em `app/routes/`. Alias `~/`
  aponta para `app/`.
- `server/`: backend Hono, com `tsconfig.server.json` próprio (sem tipos do DOM).
- **Modo SPA.** O build renderiza só a rota root, uma vez, para gerar `build/client/index.html`. Dado de
  rota é carregado com `clientLoader`. Não use `loader` fora da rota root.
- **O primeiro render precisa ser SSR-safe.** Nada de `window`, `document` ou `localStorage` durante o
  render, porque a rota root é renderizada no build, fora do navegador.

### Servidor

- `server/app.ts` monta o app: `/api/health` (fora da versão), `/api/v1` com os módulos de
  `server/routes/index.ts`, contrato em `/api/v1/openapi.json`, Swagger em `/api/v1/docs`. Em produção
  também serve `build/client` e devolve o `index.html` para qualquer URL fora de `/api`.
- Todo módulo de rota nasce de `createRouter()` (`server/lib/router.ts`). Ele converte falha de
  validação do Zod em `422` com a lista de campos.
- **Erro nunca é montado à mão.** Handler e service lançam `ApiProblem(status, code, detail)`
  (`server/lib/problem.ts`), e o error handler do app responde em Problem Details (RFC 9457). `405`
  com `Allow` sai automático a partir das rotas declaradas no contrato.
- `dependencies` é só o que o servidor importa em runtime: o bundle usa `--packages=external` e a
  imagem instala só `dependencies`. Biblioteca de front vai em `devDependencies`. Exceção: `isbot`.
  Sem `app/entry.server.tsx`, o React Router usa o entry padrão, que precisa dele, e o plugin só o
  procura em `dependencies` (se não achar, adiciona sozinho no próximo build).

### Dados e sessão

- Sem banco nesta etapa: `server/lib/memoryStore.ts` guarda os dados em memória, e o start recria os
  usuários do seed (`SEED_PASSWORD`). Só `server/services/` importa o store. Quando o banco entrar, a
  troca fica nos services.
- Sessão: cookie `session` HttpOnly com `{ sub, sid, ver, exp }` assinado por HMAC (`SESSION_SECRET`). O
  `requireAuth` (`server/middleware/auth.ts`) relê o usuário a cada request, então role e status valem
  na hora. Rotas de admin usam `requireAuth()` seguido de `requireRole("admin")`.
- `ver` é o `sessionVersion` do usuário. Reset de senha, troca da própria senha e desativação
  incrementam, o que derruba as sessões abertas; na troca própria, o handler reemite o cookie da mesma
  sessão para quem trocou. `sid` identifica o login: o que fica preso a ele (a inscrição de Web Push) é
  apagado no logout. Cookie sem `sid`, emitido antes dele existir, continua valendo, com o id da sessão
  tirado do hash do token.
- Usuário nunca é apagado, só desativado (`active: false`): o audit precisa do autor.
- Toda mudança que um admin precise rastrear grava `recordAudit()` no service.
- Usuário com `mustChangePassword` só acessa `GET /me` e `PUT /me/password`; o resto responde `403`
  `PASSWORD_CHANGE_REQUIRED`.
- Erros de contrato de uma rota são declarados com `...problemResponses(401, 422)`.

### Notificações

- Outro módulo avisa alguém com `notifyUser(userId, { title, body, url, senderName, important })`
  (`server/services/notifications/notifications.service.ts`). O exemplo do template está no
  `updateUser`: cargo mudado e conta reativada por um admin. `senderName` é o que a notificação mostra
  com a prévia desligada; `important` avisa mesmo com os avisos silenciados.
- O aviso fica no store (tela `/notifications`, contador na sidebar e `(N)` na aba) e chega por dois
  caminhos: as abas abertas pelo stream SSE de `GET /events`, e os navegadores sem o app
  aberto por Web Push (`public/sw.js`). O par VAPID vem do `.env` (`VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), obrigatório em produção; em dev, sem ele, um par é gerado a
  cada start e os navegadores se inscrevem de novo ao abrir o app.
- Cada usuário arquiva avisos (saem da lista e do contador) e silencia os avisos por 8 horas, 1 semana
  ou sempre (`PUT /noticeMute`): silenciados chegam na lista, sem notificação nem som, e o contador
  fica cinza. O menu de cada aviso abre pela seta ou pelo clique direito.
- Avisos em sequência e grupo agitado: depois de avisar, 15 s sem notificação nem som daquele tipo
  (`SQUELCH_MS`, igual na página e no push). Conversa de duas pessoas avisa toda mensagem.
- Texto e preferências da notificação ficam em `shared/` (`notificationText.ts`,
  `notificationPreferences.ts`), importados pela página (`~shared/...`) e pelo servidor. `shared/` não
  importa `app/` nem `server/` (regra do ESLint). As regras: "Fulano: texto" em grupo, "Mencionou você:",
  "Respondeu a você:", "Fulano reagiu ❤️ a: …" e, sem prévia, "N novas mensagens", "Mensagem de
  Fulano" ou "Notificação de Fulano".
- As abas abertas ficam na memória do processo (`stream.service.ts`). Com mais de um processo, o
  evento precisa de um canal entre eles (Redis, LISTEN/NOTIFY) antes de escalar.
- No front, `NotificationConnection` (montado pelo layout) cuida do stream, da notificação do sistema
  (só com a janela sem foco), do som, da inscrição de push, do cache do chat e do `(N)`, que soma os
  avisos não silenciados e as conversas não lidas. As configurações ficam no `localStorage` de cada
  usuário, separadas para mensagens, grupos e avisos, e vão junto com a inscrição de push.
- `SINGLE_TAB` (`app/config/app.ts`) deixa uma aba do app por navegador, com "Usar aqui" na segunda.

### Conversas

- Chat entre os usuários do app, de duas pessoas ou em grupo (`server/services/chat/chat.service.ts`,
  rotas `/conversations` e `/contacts`, tela `app/routes/chat/`). Conversa de duas pessoas é uma só:
  pedir de novo devolve a que existe.
- Não lidas, "marcar como não lida" (só a bolinha), silenciar e arquivar são de cada pessoa
  (`MemberStateRecord`) e valem só para ela. Responder lê a conversa só para quem respondeu. Arquivada
  só volta ao desarquivar.
- Silenciada ou arquivada só avisa a mensagem dirigida à pessoa: menção a ela, `@todos` ou resposta a
  uma mensagem dela. Reação de outra pessoa a uma mensagem sua avisa e vira a prévia, mas não fura
  silêncio nem arquivo. O `(N)` conta conversas com mensagem não lida, fora as arquivadas e as
  silenciadas sem menção.
- A conversa aberta (`ConversationView`) só é lida com a janela em foco há 2,5 s e a rolagem no fim, e
  só até a última mensagem que estava na tela (`readUntil`, que nunca volta atrás); aberta sem foco,
  espera o primeiro clique ou tecla. Abre na faixa "N mensagens não lidas", buscando páginas
  antigas se preciso, e a faixa fica até sair ou mandar mensagem. Só a própria mensagem rola até o fim.
  Esc cancela a citação e depois fecha a conversa.
- As mensagens ficam no cache do TanStack Query por conversa (`app/lib/chat/chat.queries.ts`); o
  stream acrescenta as novas, e voltar à conversa mantém as páginas antigas já carregadas.

### Frontend: sessão e dados

- `app/lib/api.ts` é a única camada de fetch. Ela lança `ApiError` com o Problem Details, e
  `error.fieldError("campo")` dá a mensagem de validação de um campo.
- O guard é o `clientMiddleware` da rota de layout (`app/routes/app-layout.tsx`). Ele revalida o `/me`
  em segundo plano a cada navegação. Rota restrita tem o próprio `clientMiddleware` com `requireRole`.
- **"Sem sessão" é dado, não erro:** `meQuery` devolve `null` no `401`. Nunca chame
  `queryClient.clear()` com uma tela autenticada montada: os `useQuery` montados buscam de novo,
  recebem `401` e entram em ciclo. Use `markSignedOut()` e deixe `clearSessionData()` para a tela de
  login.
- Depois de mudar algo que o guard lê, busque o `/me` com `fetchQuery({ ...meQuery, staleTime: 0 })`
  antes de navegar: `invalidateQueries` não refaz query que nenhuma tela observa.
- Query definida uma vez com `queryOptions` em `_hooks/`, usada pelo `clientLoader` (prefetch) e pelo
  `useQuery`. Estado de lista (busca, filtros, página, item aberto) na URL com `useListParams`.
- Formulário: react-hook-form + `zodResolver` + `FormField`, e `applyApiErrors` no `onError`.
- O frontend não importa tipos do servidor: o contrato é repetido em `app/types/`.

### Frontend: UI

- Design system Chronos Mono Blue (do Logicell). Tokens em `app/app.css`, com os nomes que o shadcn
  espera (`bg-background`, `bg-card`, `text-muted-foreground`, `border`) mais os próprios (`text-dim`,
  `text-warning`, `bg-skeleton`, `bg-badge-*`, `shadow-card`, `shadow-card-elevated`).
- **Nunca cor hardcoded** (`#0066ff`, `bg-white`, `text-gray-900`) e **nunca `dark:`** no código do app:
  os tokens mudam de valor com a classe `.dark` no `<html>`. Os primitivos em `app/components/ui/` são
  do shadcn e ficam como vieram, para poderem ser atualizados pela CLI.
- Um único acento: `primary` é a única cor de ação. `success` é o mesmo azul; só `destructive` e
  `warning` têm cor própria, e só para status.
- Tipografia: UI em `font-sans` (Plus Jakarta Sans), texto corrido em `font-inter`, número, valor e código
  em `font-mono`.
- Botão: `variant="default"` é outline e preenche no hover; `variant="solid"` só para a ação de maior
  prioridade da tela.
- Tela nova: `PageHeader` no topo, item em `app/config/navigation.ts` (com `roles` se for restrita).
- Toda lista é pesquisável: o `DataTable` exige `search` e mostra busca e filtros dentro do card, e a
  rota da API aceita `?search=`. Os filtros vão num `FilterButton` (popover com contador e "Limpar
  filtros"), cada um num `FilterField`. O valor padrão de um filtro fica fora da URL.
- **Todo select tem busca:** use `SearchableSelect` (`app/components/patterns/`). O `Select` simples do
  shadcn é barrado pelo ESLint.
- Na interface, o termo para `role` é "cargo".
- Padrões prontos em `app/components/patterns/` (`DataTable`, `EntityDrawer`, `FormDialog`,
  `useConfirm`, `FormField`, `EmptyState`, `ErrorState`) e widgets em `app/components/widgets/`.
- Abaixo de `md` a sidebar vira barra inferior (`MobileNav`). Confira toda tela em viewport de celular.
- O dashboard (`app/routes/dashboard/`) muda com a role. `UserDashboard` é o ponto de troca de cada
  projeto: o que o usuário comum precisa ver ao entrar.
- Primitivo novo: `bunx shadcn@latest add <nome>`, depois `bun run format`.

## Regras de arquitetura (garantidas pelo ESLint)

- `app/` nunca importa nada de `server/`. O frontend fala com o backend só por `app/lib/api.ts`.
- Acesso a dados só em `server/services/`. `server/routes/` e `server/middleware/` não importam o
  store nem client de banco.

Uma violação aparece no lint como `ARCHITECTURE_VIOLATION`. Não contorne com `eslint-disable`: mova o
código para a camada certa.

## Convenções

- Aspas duplas em tudo. Formatação é do Prettier; não ajuste estilo à mão.
- Sem emoji em código, comentário, log ou teste.
- Nomes de arquivo: componente React em PascalCase (`Sidebar.tsx`), hook com prefixo `use` em camelCase
  (`useAuth.ts`), o resto em camelCase (`memoryStore.ts`). Service com sufixo `.service.ts`.
- TypeScript strict, sem `any`.
- Só bun. O único lockfile é o `bun.lock`.
- Commits em Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`), com o corpo dizendo o que mudou
  e por quê.

## React Router

A skill em `.agents/skills/react-router/` orienta como trabalhar com o framework. A fonte da verdade
são os docs instalados em `node_modules/react-router/docs/`, que batem com a versão do pacote. Confira o
marcador `[MODES: framework]` antes de aplicar um doc.
