---
tags: [patterns, database, migration, seed]
status: planned
updated: 2026-09-21
related:
  - ./BACKEND-ARCH.md
---

# Dados de referência: Prototype, Crystallize

> **Vale quando o banco entrar.** Nesta etapa o template guarda os dados em memória
> (`server/lib/memoryStore.ts`). A decisão para a próxima etapa é Postgres com Prisma.

Como semear **dados de referência** (catálogos, lookups, grafos de configuração) no Postgres durante
o desenvolvimento, com Prisma.

## Problema

Dado de referência (ex.: catálogo de permissões, roles e a herança entre elas) precisa ser
**iterado** até ficar certo. O ciclo "editar migration, `prisma migrate reset`, conferir" é lento:
cada rodada recria o banco inteiro só para testar um `INSERT`. Ao mesmo tempo, o resultado **não pode
ficar só no banco**, porque o próximo reset apaga tudo que não está em arquivo.

## Fluxo

1. **Prototipar direto no banco.** Iterar com `psql "$DATABASE_URL"` contra o Postgres local, sem
   tocar em arquivo nem resetar. Inserir, ajustar, reinserir.
2. **Validar com a query real.** Rodar a consulta que o app vai rodar (ex.: a CTE recursiva que
   resolve as permissões efetivas de cada role) e conferir os números contra o esperado. Ajustar na
   bancada até bater.
3. **Cristalizar em migration.** Gerar uma migration vazia com
   `prisma migrate dev --create-only --name seed_<x>` e colar nela o SQL validado, **idempotente**
   (`ON CONFLICT DO NOTHING`), referenciando por chave natural (`code`) via subquery, sem UUID ou id
   literal. Aplicar com `prisma migrate dev`. É dado que vai para produção.
4. **Dado de teste vai para o seed.** O que é só local (ex.: dar a role `admin` ao usuário de teste)
   fica em `prisma/seed.ts`. O seed roda em `prisma migrate reset` e `prisma db seed`, e nunca em
   `prisma migrate deploy`, que é o comando de produção.

## Regra de ouro

- **Nada de referência fica só no banco** (o reset apaga) **nem só no seed** (o seed não vai para
  produção).
- **Catálogo e referência vão para migration. Dado de teste vai para o seed. Estrutura vai para
  migration.**
- Referência por `code` ou outra chave natural, nunca por id literal: sobrevive à recriação do banco
  e é legível no diff.
- **Não edite migration já aplicada em outro ambiente.** O Prisma guarda checksum de cada migration
  aplicada e acusa drift. Correção de dado de referência entra numa migration nova.
- Mapeie os models para nome de tabela em snake_case (`@@map("role_permission")`). Assim o SQL da
  bancada e da migration não precisa de aspas em `"RolePermission"`.

## Quando usar e quando não

- **Use** para referência de baixa frequência atrelada ao código: catálogos (`permission`, `role`),
  lookups (`status`, `prioridade`), grafos de configuração. O código referencia esses `code`
  literalmente, então eles precisam ser versionados junto.
- **Não use** para **atribuição operacional de alta frequência** (quem tem qual role, acesso por
  objeto). Isso muda toda hora, feito por admin não técnico, e passa pela API: `services/` com
  validação, controle de quem pode conceder, audit e invalidação de cache. Escrever isso direto no
  banco pula todas essas camadas e viola a Regra de Ouro do [backend](./BACKEND-ARCH.md).

## Exemplo

Bancada: depois de inserir permissões, roles, herança e vínculos via `psql`, validar o efetivo de
cada role.

```sql
WITH RECURSIVE ancestry AS (
  SELECT id AS role_id, id AS eff_role_id FROM role
  UNION
  SELECT a.role_id, rp.parent_id
  FROM ancestry a
  JOIN role_parent rp ON rp.role_id = a.eff_role_id
)
SELECT r.code, count(DISTINCT p.code) AS permissoes
FROM role r
JOIN ancestry a ON a.role_id = r.id
JOIN role_permission rpm ON rpm.role_id = a.eff_role_id
JOIN permission p ON p.id = rpm.permission_id
GROUP BY r.code;
-- esperado: admin=12, manager=7, user=3
```

Validado, o SQL vira a migration `prisma/migrations/<timestamp>_seed_catalogo/migration.sql`:

```sql
INSERT INTO permission (code, description) VALUES
  ('cliente:view', 'Ver clientes'),
  ('cliente:manage', 'Criar e editar clientes')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN ('cliente:view', 'cliente:manage')
WHERE r.code = 'manager'
ON CONFLICT DO NOTHING;
```

A atribuição da role ao usuário de teste vai para `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // O usuário de teste é criado antes, neste mesmo seed; a role vem da migration.
  const admin = await prisma.role.findUniqueOrThrow({
    where: { code: "admin" },
  });
  await prisma.user.update({
    where: { email: "admin@local.test" },
    data: { roles: { connect: { id: admin.id } } },
  });
}

main().finally(() => prisma.$disconnect());
```
