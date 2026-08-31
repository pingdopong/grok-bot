# 0001 -- Por que forkamos

**Data:** 2026-08-30 - **Status:** aceita

## Contexto

O guia de fork abre perguntando se da para evitar o fork: configuracao, ponto de
extensao, ou contribuir upstream sao todos mais baratos. Aqui nenhum se aplica.

O upstream esta **arquivado**: nao aceita PR, entao contribuir esta fora de
questao. Ele tambem nao expoe ponto de extensao nem camada de configuracao para
o que se pretende fazer -- o objetivo e usa-lo como fundacao de produto, nao
customizar aparencia.

## Decisao

Forkar, publico, na org `pingdopong`, mantendo `upstream` como remote com push
desabilitado e `upstream-mirror` como historia pristina.

## Consequencias

- O custo de manutencao passa a ser nosso, proporcional a superficie de diff. Por
  isso a disciplina de tiers e o inventario em `CUSTOMIZATIONS.md`.
- Vulnerabilidades do upstream passam a ser nossas, e nao ha upstream ativo para
  corrigi-las. Ver `UPSTREAM-WATCH.md`.
- O upstream **nao concede licenca de codigo-fonte** (`NOTICE.md`). Forkar dentro
  do GitHub esta coberto pelos termos da plataforma; distribuir produto derivado
  e outra questao. Ver `0006-gate-juridico-de-distribuicao.md`.
