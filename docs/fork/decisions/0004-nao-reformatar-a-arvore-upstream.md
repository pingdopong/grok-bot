# 0004 -- Nao reformatar a arvore do upstream

**Data:** 2026-08-31 - **Status:** aceita, **com gatilho de revisao**

## Contexto

O padrao da casa e Oxlint + Oxfmt em todo o repositorio. O guia de fork proibe o
contrario: rodar o formatador sobre a arvore do upstream reescreve toda linha e
transforma qualquer merge futuro em conflito total.

Sao 26 MB de TypeScript reconstruido em `apps/desktop`.

## Decisao

Escopos separados, nao excecao vaga:

| Comando         | Escopo                       | Bloqueia?         |
| --------------- | ---------------------------- | ----------------- |
| `lint`          | `packages/**`                | sim               |
| `format:check`  | tudo menos `apps/desktop/**` | sim               |
| `lint:upstream` | `apps/desktop/**`            | nao -- inventario |

A exclusao do Oxfmt e feita com `ignorePatterns` dentro do `.oxfmtrc.json`. Nao
existe `.oxfmtignore`: o Oxc so reconhece `ignorePatterns` e, por
compatibilidade, `.prettierignore`.

`react/react-in-jsx-scope` fica desligada: sozinha respondia por 2381 dos ~3500
achados e e falso positivo com o JSX transform automatico do React 19.

## Gatilho de revisao

Se o upstream continuar arquivado em **2027-03**, esta decisao perde a premissa e
deve ser reavaliada: sem merge futuro possivel, o codigo e efetivamente nosso e a
homogeneidade passa a valer mais que a mergeabilidade. A reavaliacao produz um
ADR novo, nao uma edicao deste.

## Consequencias

- O inventario de `lint:upstream` e diagnostico, nao lista de tarefas. Corrigir
  aqueles achados seria editar em massa arquivos do upstream.
- Codigo novo nosso segue o padrao da casa desde o primeiro dia.
