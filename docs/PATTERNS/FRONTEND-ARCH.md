---
tags: [patterns, frontend, react-router]
status: current
updated: 2026-09-21
related:
  - ./BACKEND-ARCH.md
  - ./API-DESIGN.md
  - ../DESIGN-SYSTEM.md
---

# Frontend: Domain-Colocated, Query-Driven

O `app/` espelha a filosofia do backend: **colocation, organização por domínio e acesso a dados
centralizado**. O app é uma SPA em React Router 8 (framework mode, `ssr: false`), com TanStack Query
como fonte e cache de todo dado assíncrono.

## Princípios

1. **Colocation primeiro.** O código de uma rota mora junto da rota. Vira global só quando duas ou
   mais rotas usam.
2. **Global por domínio, não num balde `shared/`.** O que é compartilhado se organiza por papel
   (`components/patterns/`, `components/widgets/`) ou por domínio. Não existe `components/shared/`.
3. **Zero acesso a dados no frontend.** Todo dado passa por `app/lib/api.ts`. Nada em `app/` importa
   o servidor, o store ou client de banco (regra do ESLint).
4. **TanStack Query para todo dado assíncrono.** Nunca `useEffect` + `setState` + fetch manual.

## Estrutura

```text
app/
├── root.tsx              # layout HTML, providers, HydrateFallback, ErrorBoundary
├── routes.ts             # configuração das rotas
├── routes/
│   ├── app-layout.tsx    # rota de layout: guard, sidebar, barra inferior no mobile
│   ├── profile.tsx       # rota simples: um arquivo
│   ├── dashboard/        # conteúdo por role: AdminDashboard e UserDashboard
│   └── users/            # rota com partes privadas: uma pasta
│       ├── route.tsx
│       ├── _components/  # componentes EXCLUSIVOS da rota
│       └── _hooks/       # queries e mutations EXCLUSIVAS da rota
├── components/
│   ├── ui/               # primitivos shadcn/Radix (atualizáveis pela CLI)
│   ├── layout/           # Sidebar, MobileNav, PageHeader, AuthCard, Splash
│   ├── patterns/         # DataTable, EntityDrawer, FormDialog, useConfirm, FormField, EmptyState
│   └── widgets/          # StatCard, BarList, DistributionCard
├── config/               # nome do app, navegação da sidebar
├── hooks/                # hooks transversais (useListParams, useDebouncedValue)
├── lib/                  # api.ts, auth.ts, queryClient.ts, theme.ts, format.ts, forms.ts
└── types/                # contrato da API repetido no front
```

O prefixo `_` marca o que é privado da rota: nada fora de `routes/<rota>/` importa dali.

## Rotas e dados

- Rotas declaradas em `app/routes.ts`. Rota com partes privadas vira pasta com `route.tsx`.
- **Query definida uma vez com `queryOptions`**, em `_hooks/<dominio>.queries.ts`, e usada pelo
  `clientLoader` (para começar a buscar junto com a navegação) e pelo `useQuery` da tela. Os dois
  usam a mesma chave, então não há busca dupla.
- **Toda lista é pesquisável.** O `DataTable` exige a prop `search` (sem ela, não compila), e a busca
  vai para a API como `?search=`, com debounce. Busca e filtros ficam dentro do card da tabela.
- **Estado de lista na URL** (`useListParams`): busca, filtros, ordenação, página e o item aberto no
  drawer. Sobrevive ao reload, dá para mandar o link, e o voltar do navegador desfaz.
- Mutations em `useMutation`, invalidando as queries afetadas no `onSuccess`.
- Com `ssr: false`, não use `loader` fora da rota root: em SPA ele só roda no build.

```typescript
// app/routes/users/_hooks/users.queries.ts (trecho)
export const usersQuery = (params: UsersParams) =>
  queryOptions({
    queryKey: ["users", "list", params],
    queryFn: ({ signal }) => api.get<Page<User>>(`/users?${toQueryString(params)}`, { signal }),
    placeholderData: keepPreviousData,
  });
```

```typescript
// app/routes/users/route.tsx (trecho)
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  void queryClient.prefetchQuery(usersQuery(usersParamsFrom(new URL(request.url).searchParams)));
  return null;
}

export default function UsersPage() {
  const { searchParams, set } = useListParams();
  const list = useQuery(usersQuery(usersParamsFrom(searchParams)));
  // ...
}
```

## A camada de fetch

`app/lib/api.ts` é o único lugar que chama `fetch`. Em resposta de erro, ele **lança** `ApiError` com o
Problem Details da API.

Lançar não é detalhe. Se o fetch devolvesse `null` na falha, a query resolveria como sucesso com
`data: null`: `isError` nunca dispararia, não haveria retry e a tela mostraria lista vazia em vez de
erro. O `QueryClient` só trata erro que foi lançado.

- `error.fieldError("email")` dá a mensagem de validação de um campo; `applyApiErrors` leva os
  `errors[]` do Problem Details para o formulário.
- Falha de rede e `5xx` viram **um** toast por janela de 10s (`lib/notifications.ts`), não um por
  query em paralelo. `4xx` é tratado pela tela.
- `4xx` não tem retry: é resposta definitiva da API.

## Sessão e guard

- O guard é o `clientMiddleware` da rota de layout: sem sessão vai para `/login?redirectTo=...`; com
  troca de senha pendente, para `/change-password`.
- Rota restrita por role tem seu próprio `clientMiddleware` com `requireRole(request, "admin")`.
  Esconder o item da sidebar não basta: a URL pode ser digitada. **O backend é o gate real**; o front
  só evita mostrar uma tela que vai falhar.
- O guard revalida o `/me` em segundo plano a cada navegação, então quem foi desativado cai para o
  login na navegação seguinte, mesmo numa tela sem requisição.
- **"Sem sessão" é dado, não erro:** `meQuery` devolve `null` no `401`. Nunca chame
  `queryClient.clear()` com uma tela autenticada montada: os `useQuery` montados buscam de novo,
  recebem `401` e entram em ciclo. Use `markSignedOut()`, e deixe `clearSessionData()` para o login.
- Depois de mudar algo que o guard lê (trocar a senha pendente), busque o `/me` de novo com
  `fetchQuery({ ...meQuery, staleTime: 0 })` antes de navegar. `invalidateQueries` não refaz query que
  nenhuma tela está observando.

## Formulários

react-hook-form com `zodResolver`. Todo select é o `SearchableSelect` (`components/patterns/`), com
busca no topo das opções; o `Select` simples do shadcn é barrado pelo ESLint. O schema do front espelha o do servidor para dar o erro antes do
envio; o servidor valida de novo, e os erros dele chegam pelos mesmos campos. `FormField` liga rótulo,
campo e mensagem de erro por `aria-describedby`.

## Primeiro render

Com `ssr: false`, a rota root é renderizada uma vez no build, fora do navegador, para gerar o
`index.html`. Nada em `root.tsx` pode acessar `window`, `document` ou `localStorage` durante o render.
Rotas com `clientLoader` só renderizam no navegador.

## Onde mora cada coisa

| Situação                               | Vai para                                    |
| :------------------------------------- | :------------------------------------------ |
| Componente usado em 1 rota             | `routes/<rota>/_components/`                |
| Query ou mutation de 1 rota            | `routes/<rota>/_hooks/`                     |
| Padrão de tela (tabela, drawer, modal) | `components/patterns/`                      |
| Card de número ou gráfico              | `components/widgets/`                       |
| Primitivo de UI                        | `components/ui/` (`bunx shadcn@latest add`) |
| Hook transversal                       | `hooks/`                                    |
| Cliente HTTP, formatação, util         | `lib/`                                      |
| Item da sidebar                        | `config/navigation.ts`                      |
| Tipo do contrato da API                | `types/`                                    |

## Checklist de tela nova

- [ ] Rota em `app/routes.ts`; pasta própria se tiver partes privadas.
- [ ] `PageHeader` no topo e item em `config/navigation.ts` (com `roles` se for restrita).
- [ ] Rota restrita com `clientMiddleware` + `requireRole`.
- [ ] Dados via `queryOptions` compartilhado entre `clientLoader` e `useQuery`.
- [ ] Estados de carregamento (skeleton), vazio e erro distintos. Erro nunca vira lista vazia.
- [ ] Lista com busca (prop `search` do `DataTable`) e filtros dentro do card.
- [ ] Todo select é `SearchableSelect`.
- [ ] Estado de lista na URL.
- [ ] Testada nos dois temas e em viewport de celular.
