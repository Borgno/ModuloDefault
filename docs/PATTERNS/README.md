# Patterns

Padrões de arquitetura da organização. Cada doc descreve uma regra, o motivo dela e como aplicá-la, com
exemplos que seguem o código deste repositório.

## Ordem de leitura

1. [BACKEND-ARCH.md](./BACKEND-ARCH.md): `server/` em camadas por domínio. A Regra de Ouro (só
   `services/` acessa dados) e o módulo em quatro arquivos com Hono + `@hono/zod-openapi`.
2. [API-DESIGN.md](./API-DESIGN.md): versionamento, recursos, camelCase, status, Problem Details e a
   matriz de rotas. Checado pelo Spectral no CI.
3. [FRONTEND-ARCH.md](./FRONTEND-ARCH.md): `app/` por colocation, TanStack Query, sessão e guard,
   formulários.
4. [REFERENCE-DATA.md](./REFERENCE-DATA.md): como versionar dados de referência. Vale quando o banco
   entrar.

O design system (tokens, tipografia, componentes) fica em [../DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md).

## Como escrever um pattern novo

- **Nome:** caixa alta, palavras separadas por hífen, em inglês, dizendo o escopo (`BACKEND-ARCH.md`).
  Sem sufixo `_PATTERN` e sem versão de biblioteca no nome.
- **Frontmatter:** `tags`, `status` (`current`, `planned` ou `deprecated`), `updated` e `related` com
  links relativos. Sem wikilinks.
- **Estrutura:** problema ou princípio, a regra, quando usar e quando não, e um exemplo que siga as
  próprias regras do doc.
- **Conteúdo:** descreve o padrão, não o estado de um projeto. Sem nome de projeto, empresa, task ou
  fase, e sem emoji.
