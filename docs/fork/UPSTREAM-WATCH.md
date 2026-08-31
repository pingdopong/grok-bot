# O que observar no upstream

O upstream esta **arquivado**. Isso muda a natureza da vigilancia: nao ha roadmap
para acompanhar, ha um evento binario para detectar.

## Automatizado

`.github/workflows/upstream-watch.yml`, semanal. Abre ou comenta uma issue se:

- o repositorio deixar de estar arquivado; ou
- o head do branch default divergir do nosso `fork.upstreamCommit`.

## Manual

| O que                                                             | Por que importa                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Advisories de seguranca** nas dependencias fixadas              | O `SECURITY.md` do upstream ja registra advisories presos por compatibilidade em Electron 42.1, Undici 5, Connect 1, AI SDK 4 e OpenTelemetry. Um fork stale entrega codigo vulneravel com a nossa marca, e nao ha upstream ativo para corrigir. |
| **A URL de download fixada** (`downloads.cursor.com/.../0.18.0/`) | **Ja caiu.** Ver abaixo.                                                                                                                                                                                                                         |
| **O que a Anysphere fizer sobre o upstream**                      | Um pedido de takedown ou mudanca de termos e fato relevante para o gate de distribuicao.                                                                                                                                                         |
| **Forks que continuem o trabalho**                                | Com o upstream arquivado, correcoes podem aparecer em outro fork da rede, nao no original.                                                                                                                                                       |

## Observado: a URL fixada do DMG esta fora do ar

**2026-08-31.** A primeira execucao do `package-macos.yml` falhou no `bootstrap`
com `Download failed: HTTP 403`. Verificado em seguida de um IP residencial, fora
do CI: `HEAD` e `GET` com range respondem **403**, e a propria raiz de
`downloads.cursor.com` tambem responde 403. Nao e bloqueio de IP de datacenter, e
nao e 404 -- o host simplesmente recusa.

**Consequencia pratica:** o caminho de bootstrap por rede nao funciona mais para
ninguem. Empacotar exige ter o artefato 0.18.0 localmente, seja por
`GROK_BOT_018_APP` apontando para uma copia instalada do app, seja por uma copia
do DMG em `apps/desktop/.cache/downloads/`.

**Isto interage com a decisao 0005**, que removeu os instaladores preservados do
nosso HEAD. A remocao continua correta -- nao redistribuimos binario proprietario
de terceiro -- mas o custo operacional dela ficou concreto: nao ha mais fallback
nenhum dentro deste repositorio. Quem for empacotar precisa trazer o artefato.

**Nao tente contornar o 403.** Um 403 e um controle de acesso da Anysphere sobre
a infraestrutura deles. Forjar cabecalho ou buscar espelho nao autorizado sairia
do terreno de "reconstrucao a partir de binario publicamente distribuido" -- que
e a premissa inteira do `PROVENANCE.md` do upstream -- e entraria em outro.
