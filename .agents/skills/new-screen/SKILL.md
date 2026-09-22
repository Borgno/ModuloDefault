---
name: new-screen
description: Cria ou modifica uma tela do frontend (app/routes) seguindo colocation, TanStack Query, o guard de sessão e o design system do projeto. Use ao adicionar uma página, uma lista com filtros, um drawer de detalhe, um formulário ou um widget de dashboard.
---

# Tela nova (React Router 8, framework mode, SPA)

Procedimento operacional. O racional está em `docs/PATTERNS/FRONTEND-ARCH.md` e o visual em
`docs/DESIGN-SYSTEM.md`. Para dúvida de API do React Router, use a skill `react-router` e os docs em
`node_modules/react-router/docs/`.

## Regras que não se negociam

- `app/` nunca importa `server/`. Todo dado passa por `app/lib/api.ts`.
- Nunca `useEffect` + fetch: dado assíncrono é `useQuery`/`useMutation`.
- Nunca cor hardcoded nem classe `dark:`. Números em `font-mono`.
- Erro de carregamento é `ErrorState`, nunca lista vazia.
- Nunca `queryClient.clear()` com tela autenticada montada (ver FRONTEND-ARCH, "Sessão e guard").

## Passos

1. **Rota** em `app/routes.ts`, dentro do `layout("routes/app-layout.tsx", [...])` se exigir sessão.
   Com partes privadas, vira pasta: `app/routes/<rota>/route.tsx` + `_components/` + `_hooks/`.
2. **Acesso restrito:** `export const clientMiddleware = [async ({ request }) => { await requireRole(request, "admin"); }]`.
3. **Queries** em `_hooks/<dominio>.queries.ts` com `queryOptions`. O `clientLoader` faz
   `void queryClient.prefetchQuery(...)` e a tela usa `useQuery` com a mesma função.
4. **Mutations** com `useMutation`, invalidando as chaves afetadas no `onSuccess` e `toast.success`.
5. **Tela:** `PageHeader` no topo. Lista com `DataTable`, sempre com busca (`search`, obrigatório) e
   os filtros em `filters`, dentro do card; estado na URL (`useListParams`). Detalhe em
   `EntityDrawer` com o id na URL. Criação em `FormDialog`. Confirmação com `useConfirm()`.
6. **Formulário:** react-hook-form + `zodResolver`, schema espelhando o do servidor, `FormField` para
   cada campo e `applyApiErrors` no `onError`. Todo select é `SearchableSelect` (o lint barra o
   `Select` simples).
7. **Navegação:** item em `app/config/navigation.ts`, com `roles` se for restrita.
8. **Tipos** do contrato em `app/types/`.
9. **e2e** em `e2e/<tela>.spec.ts` cobrindo o caminho do usuário.

## Antes de concluir

`bun run lint`, `bun run typecheck`, `bun run test:e2e`, e a tela conferida nos dois temas e em
viewport de celular.
