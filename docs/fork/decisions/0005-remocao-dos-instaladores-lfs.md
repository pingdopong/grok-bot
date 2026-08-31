# 0005 -- Remocao dos instaladores preservados

**Data:** 2026-08-30 - **Status:** aceita

## Contexto

O upstream versionava, via Git LFS, os dois instaladores originais do Grok Bot
0.18.0: o DMG de 155.793.020 bytes e o EXE de 125.825.552 bytes. Sao binarios
distribuidos pela **Anysphere**, nao artefatos da reconstrucao.

Medido na pratica: ate a remocao, um `git worktree add` neste fork materializava
268 MB de conteudo LFS.

## Decisao

Remover os dois do `HEAD`. Preservar todo o registro de proveniencia:
`artifacts.json`, `SHA256SUMS` e o README do diretorio continuam versionados, com
URL de origem e digest de cada um.

O `.gitignore` passa a ignorar os dois padroes, de modo que uma copia local segue
**suportada** pelo bootstrap -- ela so nao pode voltar a ser versionada.

## O que esta decisao nao faz

**Nao e reescrita de historia.** Um fork compartilha o object store com a rede do
upstream: reescrever nao apagaria nada e ainda quebraria o vinculo do fork. Os
objetos seguem alcancaveis pela historia do upstream. O que muda e que o nosso
branch deixa de distribui-los.

## Consequencias

- `tests/research-archives.test.mjs` foi reescrito: a versao do upstream exigia
  os dois binarios presentes e conferia bytes e SHA-256 de cada um.
- O bootstrap continua funcionando. Verificado no codigo: `downloadDmg()` trata a
  ausencia com `if (await exists(archivedDmg))` e cai para a URL fixada, com
  validacao de SHA-256.
- O `pre-push` do Git LFS foi substituido pelo do Lefthook. Como nao ha mais
  conteudo LFS rastreado, nada se perde na pratica.

## Consequencia observada depois (2026-08-31)

A URL publica que servia de fallback **saiu do ar**: responde HTTP 403, tanto do
CI quanto de IP residencial. Sem os arquivos preservados e sem a URL, este
repositorio nao tem nenhuma forma propria de obter o artefato 0.18.0.

Isso **nao reverte** a decisao: hospedar binario proprietario de terceiro
continua fora de questao. Mas muda o que precisa estar escrito para quem for
empacotar -- ver `../UPSTREAM-WATCH.md`.
