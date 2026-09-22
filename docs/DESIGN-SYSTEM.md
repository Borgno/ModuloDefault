---
tags: [design-system, frontend]
status: current
updated: 2026-09-21
related:
  - ./PATTERNS/FRONTEND-ARCH.md
---

# Design System: Chronos Mono Blue

Referência visual de toda tela deste repositório. Existe para o resultado ser o mesmo, não importa quem
(ou qual agente) constrói. Não é decorativo: cada regra torna dado legível e ação clara. Suporta tema
claro e escuro pela classe `.dark` no `<html>`.

Os tokens ficam em `app/app.css`. Os componentes base são shadcn/Radix reestilizados com eles.

## Regras inegociáveis

1. **Nunca cor hardcoded.** Nada de `#0066ff`, `bg-white`, `text-gray-900` ou `rgba(...)` no JSX. Só
   classes de token (`bg-card`, `text-foreground`, `bg-primary`).
2. **Um único acento.** `primary` é a única cor de ação ou de estado ativo. `success` é o mesmo azul:
   não existe verde de sucesso. Só `destructive` (vermelho) e `warning` (âmbar) têm cor própria, e só
   para status, nunca para ação comum.
3. **Tipografia tripla.** UI em `font-sans` (Plus Jakarta Sans), texto corrido em `font-inter`, e todo
   número, valor, data, código ou métrica em `font-mono` (JetBrains Mono), sem exceção.
4. **Sem `dark:` no código do app.** Os tokens mudam de valor com a classe `.dark`, então a mesma
   classe já se adapta. Se você escreveu `dark:algumacoisa`, use um token. A exceção são os primitivos
   em `app/components/ui/`, que ficam como o shadcn gerou para poderem ser atualizados pela CLI.
5. **Botão primário é outline**: preenche no hover. Preenchido direto (`variant="solid"`) só na ação de
   maior prioridade da tela: entrar, criar, confirmar.
6. **Borda fina, sombra dá a profundidade**, principalmente no tema claro.

## Tokens

| Token (classe)                                                               | Uso                                    |
| :--------------------------------------------------------------------------- | :------------------------------------- |
| `bg-background`                                                              | fundo da página                        |
| `bg-card`, `bg-popover`                                                      | superfícies: card, drawer, modal, menu |
| `text-foreground`                                                            | texto principal                        |
| `text-muted-foreground`                                                      | texto secundário, rótulo               |
| `text-dim`                                                                   | texto terciário, ícone inativo, dica   |
| `bg-muted`                                                                   | fundo de input e de área rebaixada     |
| `bg-accent`                                                                  | hover de item, input em foco           |
| `border` (`border-border`)                                                   | toda borda                             |
| `bg-primary`, `text-primary`                                                 | ação e estado ativo                    |
| `text-destructive`                                                           | erro, ação que tira acesso             |
| `text-warning`                                                               | pendência, atenção                     |
| `bg-skeleton`                                                                | placeholder de carregamento            |
| `bg-badge-{primary,destructive,warning}-bg` + `text-badge-...-fg`            | badges de status                       |
| `shadow-card`, `shadow-card-elevated`, `shadow-modal`, `shadow-primary-glow` | profundidade                           |
| `--chart-1` a `--chart-5`                                                    | séries de gráfico, só para dado        |

Curvas de animação: `ease-ui` (hover e foco, o padrão), `ease-layout` (sidebar, estrutura) e
`ease-bounce` (entrada de modal e card de auth).

## Tipografia

| Papel                     | Classes                                                                 |
| :------------------------ | :---------------------------------------------------------------------- |
| Título de página          | `text-2xl font-bold tracking-tight` (via `PageHeader`)                  |
| Título de modal ou drawer | `text-xl font-bold tracking-tight`                                      |
| Rótulo de seção           | `text-[10px] font-bold uppercase tracking-widest text-muted-foreground` |
| Rótulo de campo           | `text-xs font-bold` (via `FormField`)                                   |
| Texto corrido             | `font-inter text-sm text-muted-foreground`                              |
| Número, data, código      | `font-mono`                                                             |

## Componentes

| Precisa de                                       | Use                                                                               |
| :----------------------------------------------- | :-------------------------------------------------------------------------------- |
| Topo de tela                                     | `PageHeader` (título, descrição, ações)                                           |
| Lista (sempre com busca; filtros dentro do card) | `DataTable` (`search` obrigatório, `filters`) + `useListParams`                   |
| Ver e editar um registro sem sair da lista       | `EntityDrawer` + `DrawerSection`                                                  |
| Formulário curto de criação                      | `FormDialog` + `FormField`                                                        |
| Escolher uma opção (select)                      | `SearchableSelect`: todo select tem busca; o `Select` simples é barrado pelo lint |
| Confirmar ação                                   | `useConfirm()`; `variant: "destructive"` quando tira acesso ou apaga              |
| Nada para mostrar                                | `EmptyState`                                                                      |
| Falha ao carregar                                | `ErrorState`, com "Tentar de novo". Nunca lista vazia no lugar                    |
| Número em destaque                               | `StatCard` (`tone="warning"` para pendência)                                      |
| Distribuição                                     | `DistributionCard` / `BarList`                                                    |
| Status                                           | `Badge`: `default` (azul), `warning`, `destructive`, `outline`, `secondary`       |
| Feedback de ação concluída                       | `toast.success(...)` (sonner)                                                     |

Botões: `variant="default"` (outline azul, preenche no hover), `solid` (ação principal), `outline`
(neutro), `ghost`, `destructive`, `link`. Tamanhos `sm`, `default` (h-9), `lg` e os de ícone.

Inputs e selects têm `h-10`, fundo `bg-muted`, e borda `primary` no foco. Todo select é o
`SearchableSelect`, com campo de busca no topo das opções.

## Layout

- **Sidebar** (`md` para cima): cartão do perfil no topo, categorias de `app/config/navigation.ts`
  filtradas pela role, e no rodapé o controle do menu lateral.
- **Menu do perfil** (`ProfileMenu`): abre no cartão do perfil, com nome, role e e-mail, tema escuro
  (switch, sem fechar o menu), meu perfil e sair.
- **Categorias** recolhem pelo título, e o estado fica no navegador. Recolhida com a página atual
  dentro, o título fica em `primary`.
- **Controle do menu lateral**: expandido (240px), recolhido (72px, com tooltip nos itens) e expandir
  ao passar o mouse (recolhida, abre por cima do conteúdo com o mouse ou com o foco do teclado).
- **Barra inferior** (abaixo de `md`): os itens de navegação e o ícone de perfil, que abre o mesmo menu.
- **Conteúdo** centralizado com `max-w-7xl`.
- **Faixa de progresso** fina no topo enquanto há requisição ou navegação pendente.
- **Splash** dentro do `index.html` enquanto o JavaScript carrega.

## Tema

O tema escuro é a classe `.dark` no `<html>`, gravada no `localStorage` (`theme`). Um script inline no
`<head>` aplica a classe antes do primeiro paint, então a página nunca pisca branco. Trocar o tema:
`useTheme().toggleTheme()` (`app/lib/theme.ts`).

## Checklist antes de dar um componente por pronto

- [ ] Nenhuma classe `dark:` e nenhuma cor hardcoded.
- [ ] Números, datas e códigos em `font-mono`.
- [ ] Ação principal outline, exceto a de maior prioridade da tela.
- [ ] Toda superfície interativa tem hover e foco visível.
- [ ] Estados de carregamento, vazio e erro distintos.
- [ ] Modal e drawer fecham no Esc e devolvem o foco.
- [ ] Conferido nos dois temas e em viewport de celular.
