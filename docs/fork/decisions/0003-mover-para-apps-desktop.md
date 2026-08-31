# 0003 -- Mover a arvore do upstream para apps/desktop

**Data:** 2026-08-31 - **Status:** aceita

## Contexto

O objetivo era usar o projeto dentro de um monorepo Turborepo. Mover a arvore
inteira e, em tese, a maior superficie de diff possivel -- e o guia trata esse
numero como o que prediz a dor de um fork.

Duas coisas mudaram o calculo. O upstream esta arquivado, entao a probabilidade
de um merge futuro e baixa. E, mais importante, **o move e neutro em paths**:
scripts e testes ja resolviam a raiz relativamente a si mesmos
(`resolve(thisDir, "../..")` e `resolve(import.meta.dirname, "..")`), entao todos
continuam apontando certo sem nenhuma edicao.

## Decisao

Mover toda a arvore rastreada para `apps/desktop/`, em **um commit isolado**
contendo apenas o `git mv`. Resultado: 2096 arquivos detectados como rename 100%,
zero linhas alteradas.

`ATTRIBUTION.md` e `.github/` ficam na raiz -- o primeiro descreve o fork, nao o
app; o segundo porque o GitHub so le workflows na raiz.

## Como sincronizar depois disto

```sh
git merge -X subtree=apps/desktop <sha-fixado>
```

Sem `-X subtree`, o git tentaria aplicar as mudancas do upstream na raiz do
monorepo, onde os arquivos nao estao mais.

**Ensaio.** Nao da para ensaiar contra commits novos: `upstream/main` ja e
ancestral do nosso `main` e o merge seria no-op, o que nao prova nada. O ensaio
honesto e sintetico -- crie um branch a partir de `upstream-mirror`, edite um
arquivo no layout antigo, e faca o merge com `-X subtree=apps/desktop` no `main`.
Ele deve aterrissar em `apps/desktop/` e conflitar so onde ha marca `[FORK]`.

## Consequencias

- Merges futuros exigem a flag. Quem esquecer produz um resultado errado e
  visivel, nao silencioso.
- `apps/desktop` deixou de funcionar como projeto avulso.
- O `publication:check` do upstream passa a validar a arvore do monorepo inteiro,
  o que e efeito colateral bem-vindo.
