# Dossie do fork

O que um fork acumula e nao cabe no codigo: por que um patch existe, por que uma
mudanca foi feita de um jeito e nao de outro, e o que um sync futuro precisa
saber. Sem isto, daqui a seis meses o contexto sumiu e a proxima pessoa
re-litiga tudo.

## Linha de base

|                               |                                            |
| ----------------------------- | ------------------------------------------ |
| Upstream                      | `b-nnett/grok-bot-0.18-reconstructed`      |
| Commit de baseline            | `a9f633e09d49a85829b8236331b9e21f7e612634` |
| Versao do pacote no upstream  | `0.18.0-reconstructed.1`                   |
| Tags publicadas pelo upstream | nenhuma                                    |
| Estado do upstream            | **arquivado** (read-only) desde 2026-08-23 |
| Fork criado em                | 2026-08-30                                 |

O upstream nao publica tags, entao a baseline e um **SHA fixado**, nao um ref
movel: qualquer pessoa consegue reproduzir exatamente o ponto de partida
(GUIDE-FORK-WHITELABEL-UPSTREAM 6.2).

## Como medir a superficie de customizacao

```sh
git diff --find-renames --numstat upstream-mirror..main | awk '$1!="0" || $2!="0"'
```

`upstream-mirror` e um branch com a historia do upstream intocada. Ele nunca e
editado; a unica escrita legitima nele e um fast-forward vindo do upstream.

Estado em 2026-08-31: **cinco arquivos do upstream editados**, todos em
`apps/desktop/scripts/`, somando cerca de trinta linhas. O resto e arquivo novo
nosso ou remocao registrada.

## Como sincronizar, se o upstream voltar a andar

O `upstream-watch.yml` avisa se isso acontecer. Quando acontecer:

```sh
git fetch upstream
git log --oneline main..upstream/main          # leia o que vai entrar
git checkout -b sync/upstream-<sha-curto> main
git merge -X subtree=apps/desktop <sha-fixado> # nunca o ref do branch
```

Tres regras que nao mudam:

1. **Merge de SHA fixado, nunca de `upstream/main`.** Merge de ref movel nao e
   reproduzivel e nao da o que registrar no `SYNC-LOG.md`.
2. **`-X subtree=apps/desktop` e obrigatorio**, por causa do layout de monorepo.
   Ver `decisions/0003-mover-para-apps-desktop.md`.
3. **Nunca faca squash de um merge de sync.** Squash destroi a base do merge, e
   o proximo sync reapresenta todos os conflitos que voce ja resolveu.

Depois do merge: rode a suite, rode `scripts/brand-sweep.sh` e registre a entrada
no `SYNC-LOG.md`, incluindo cada conflito resolvido e por que voce escolheu o que
escolheu.

### O procedimento foi ensaiado (2026-08-31)

Nao da para ensaiar contra commits reais -- `upstream/main` ja e ancestral do
nosso `main`, entao o merge seria no-op e nao provaria nada. O ensaio foi
sintetico: um branch a partir de `upstream-mirror`, com o layout antigo, recebeu
duas mudancas ficticias em `scripts/lib/config.mjs` -- uma colidindo com a nossa
edicao `[FORK]` de identidade e outra nao.

Resultado do `git merge -X subtree=apps/desktop`:

- a mudanca aterrissou em **`apps/desktop/scripts/lib/config.mjs`**, nao na raiz;
- a mudanca nao colidente entrou limpa;
- **exatamente um arquivo** conflitou, e o hunk era precisamente o bloco marcado
  `[FORK]`;
- o `rerere` gravou preimage e resolucao (`Recorded resolution for ...`).

Os branches e a entrada de `rr-cache` do ensaio foram removidos: uma resolucao
sintetica no cache poderia ser reaplicada por engano num merge real.

## Arquivos

| Arquivo             | Para que serve                                                  |
| ------------------- | --------------------------------------------------------------- |
| `PACKAGING.md`      | como empacotar, e por que trazer o artefato virou pre-requisito |
| `CUSTOMIZATIONS.md` | inventario de toda edicao em arquivo do upstream, com o motivo  |
| `SYNC-LOG.md`       | uma entrada por sync                                            |
| `UPSTREAM-WATCH.md` | o que observar no upstream                                      |
| `decisions/`        | ADRs das escolhas de nivel de fork                              |
