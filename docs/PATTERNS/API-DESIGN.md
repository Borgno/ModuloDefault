---
tags: [patterns, backend, api]
status: current
updated: 2026-09-21
related:
  - ./BACKEND-ARCH.md
---

# Desenho da API

Regras de toda API da organização. As que dá para checar no contrato estão no `.spectral.yaml` e rodam
no CI (`bun run lint:api`): rota fora do padrão quebra o build.

## Regras

- **Versionamento no path.** Tudo sob `/api/v1`. Mudança aditiva (campo novo, rota nova) fica na v1;
  mudança que quebra cliente abre `/api/v2`. O health check fica fora da versão (`/api/health`),
  porque é contrato de infraestrutura.
- **Prefixo `/api`.** SPA e API dividem a mesma origem: o prefixo é o que separa as rotas da API das
  URLs do SPA, que caem no `index.html`.
- **Recurso, não ação.** Path é substantivo no plural (`/users`). A ação é o método HTTP. Nada de
  verbo no path (`/users/{id}/deactivate` é `PATCH /users/{id}` com `{ "active": false }`).
- **camelCase em tudo:** path (`/auditEvents`), JSON e query string. Path diferencia maiúscula de
  minúscula, então a grafia é uma só. O banco pode usar outra convenção; a API nunca expõe nome de
  coluna.
- **Método pelo propósito.** `GET` lê e não altera nada; `POST` cria; `PATCH` altera parte; `PUT`
  substitui inteiro; `DELETE` remove.
- **Filtro, busca, ordenação e paginação na query string**, nunca no path:
  `GET /api/v1/users?search=ana&role=admin&active=true&sort=-createdAt&page=2&pageSize=20`.
  Ordenação é o nome do campo, com `-` para decrescente. `pageSize` tem teto de 100.
- **Toda lista aceita `search`**, porque toda lista da interface é pesquisável. A busca é feita no
  servidor, nunca filtrando no navegador a página que chegou.
- **Sucesso sem envelope redundante.** Recurso único volta direto. Lista volta
  `{ data: [...], meta: { page, pageSize, total } }`. Nada de `{ success: true }`: o status HTTP já
  diz isso. Datas em ISO 8601 UTC.
- **Erro num formato só:** Problem Details (RFC 9457), `application/problem+json`.

## Status

| Status | Quando                                                                        |
| :----- | :---------------------------------------------------------------------------- |
| `200`  | leitura e alteração com corpo                                                 |
| `201`  | criação. Com header `Location` quando o recurso criado tem endereço próprio   |
| `204`  | sucesso sem corpo (logout, troca de senha)                                    |
| `400`  | JSON malformado                                                               |
| `401`  | sem sessão, ou sessão expirada                                                |
| `403`  | sem permissão                                                                 |
| `404`  | recurso inexistente                                                           |
| `405`  | path existe, método não. Com header `Allow`                                   |
| `409`  | conflito com o estado atual (e-mail já usado, admin tirando o próprio acesso) |
| `422`  | corpo ou query válidos como JSON, mas fora das regras                         |
| `429`  | excesso de tentativas. Com header `Retry-After`                               |
| `500`  | erro inesperado. Sem detalhe interno no corpo                                 |

## Formato de erro

```json
{
  "type": "about:blank",
  "title": "Unprocessable Content",
  "status": 422,
  "code": "VALIDATION_FAILED",
  "detail": "Os dados enviados são inválidos.",
  "errors": [{ "field": "email", "message": "Informe um e-mail válido." }]
}
```

- `code` é estável e é o que o front usa para decidir (`EMAIL_TAKEN`, `SELF_LOCKOUT`). `detail` é
  texto para pessoa e pode mudar.
- `errors` lista a falha de cada campo; o front leva cada uma para o campo do formulário.
- No servidor, handler nem service montam esse corpo: lançam `ApiProblem` e o error handler responde.

## Documentar as rotas: matriz de path por método

Cada domínio documenta suas rotas numa matriz. A linha é o **path**, não o recurso, porque coleção e
item aceitam métodos diferentes. Célula vazia responde `405`.

Rotas atuais, sob `/api/v1`:

| Path                         | GET                                        | POST                   | PUT                | PATCH                      | DELETE       |
| ---------------------------- | ------------------------------------------ | ---------------------- | ------------------ | -------------------------- | ------------ |
| `/sessions`                  |                                            | login `201`            |                    |                            |              |
| `/sessions/current`          |                                            |                        |                    |                            | logout `204` |
| `/me`                        | usuário da sessão `200`                    |                        |                    | editar nome `200`          |              |
| `/me/password`               |                                            |                        | trocar senha `204` |                            |              |
| `/users`                     | listar `200`                               | criar `201`            |                    |                            |              |
| `/users/{id}`                | ver `200`                                  |                        |                    | nome, role, `active` `200` |              |
| `/users/{id}/passwordResets` |                                            | senha temporária `201` |                    |                            |              |
| `/auditEvents`               | listar por `targetType` e `targetId` `200` |                        |                    |                            |              |
| `/userStats`                 | números do dashboard `200`                 |                        |                    |                            |              |

`DELETE /users/{id}` fica vazio de propósito: usuário é desativado, nunca apagado, para o histórico de
audit não perder o autor. O reset de senha é um recurso criado (`POST`) sem endereço próprio, por isso
responde `201` sem `Location`.

O contrato completo, gerado das rotas, fica em `/api/v1/openapi.json`, e o Swagger em `/api/v1/docs`.
