# 0002 -- Upstream arquivado e cadencia de sync

**Data:** 2026-08-30 - **Status:** aceita

## Contexto

O guia recomenda sync mensal a partir de tags de release, porque o custo de merge
cresce mais que linearmente com a deriva. Duas premissas falham aqui: o upstream
nunca publicou tags, e esta arquivado desde 2026-08-23.

## Decisao

Sem cadencia. A maquinaria de sync -- remote com push desabilitado,
`upstream-mirror`, `rerere` -- fica montada como seguro, nao como rotina. O
`upstream-watch.yml` roda semanalmente e abre issue se o upstream for
desarquivado ou receber commits.

A baseline e registrada como **SHA fixado** em
`package.json#fork.upstreamCommit`, nao como tag, porque nao ha tag.

## Consequencias

- Nao ha sync para ensaiar contra commits reais. O ensaio precisa ser sintetico
  -- ver `0003-mover-para-apps-desktop.md`.
- Se o upstream nunca voltar, a decisao de nao reformatar a arvore (`0004`) perde
  a premissa e deve ser revisitada.
- Correcao de seguranca vira trabalho nosso, sem upstream para onde escalar.
