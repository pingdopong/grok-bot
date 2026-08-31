# 0007 -- pnpm com nodeLinker hoisted e packageImportMethod copy

**Data:** 2026-08-31 - **Status:** aceita

## Contexto

O upstream instalava com npm. O padrao da casa e pnpm. A conversao esbarrou em
dois comportamentos que nao sao preferencia, sao restricao.

## Decisao 1 -- `nodeLinker: hoisted`

O `node_modules` simbolico padrao do pnpm quebra empacotamento de Electron.
`hoisted` mantem um `node_modules` real.

Efeito colateral que exigiu correcao: com qualquer workspace -- pnpm hasteado ou
npm workspaces -- as dependencias vao para o `node_modules` da **raiz**, e quatro
scripts do upstream fixavam `<repoRoot>/node_modules`. Corrigido em
`apps/desktop/scripts/lib/node-modules.mjs`. Nao havia rollback para isso: npm
workspaces tem o mesmo comportamento.

## Decisao 2 -- `packageImportMethod: copy`

Por padrao o pnpm materializa `node_modules` com **hard link** para o store
global. Medido neste repositorio: link count **7** em `@connectrpc/connect`,
apontando para o store compartilhado da maquina.

O `postinstall` do upstream reescreve arquivos dentro de `node_modules`. Com hard
link, essa escrita corromperia o store para **todos os outros projetos pnpm da
maquina**. Com `copy`, link count cai para 1 e a escrita fica contida.

Custa disco. A alternativa seria trocar o mecanismo de patch do upstream pelo
`patchedDependencies` do pnpm, o que mexeria em maquinaria de proveniencia com
verificacao de SHA-256 -- risco maior que o disco.

## Decisao 3 -- configuracao no `pnpm-workspace.yaml`

Nao em `.npmrc` + `package.json#pnpm`. A documentacao do pnpm mostra que a v11
deixa de ler o campo `pnpm` do `package.json`, e do `.npmrc` passa a ler apenas
auth e registry; todo o resto migra para o `pnpm-workspace.yaml` em camelCase. O
formato adotado funciona na 10.27 de hoje e sobrevive a v11.

## Consequencias

- `pnpm store status` lista todos os pacotes como "modified", porque compara
  identidade de inode e nao conteudo. E efeito do `copy`, nao dano.
- Cada worktree precisa do proprio `pnpm install` antes do primeiro commit, ou os
  hooks do Lefthook falham por nao achar os binarios.
