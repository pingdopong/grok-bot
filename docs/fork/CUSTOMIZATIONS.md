# Inventario de customizacoes

A metade legivel do `git diff upstream-mirror..main`. O diff diz **o que** mudou;
esta lista diz **por que**, e se da para devolver ao upstream.

Tiers vem do GUIDE-FORK-WHITELABEL-UPSTREAM 4, em ordem crescente de custo:
1 configuracao que o upstream ja suporta, 2 arquivo novo, 3 ponto de extensao
oficial, 4 edicao em arquivo do upstream -- o unico que cobra imposto para
sempre.

## Tier 4 -- edicoes em arquivos do upstream

Todas marcadas com `[FORK]` no proprio arquivo.

| Arquivo                                                        | Linhas | Motivo                                                            | Upstreamavel? |
| -------------------------------------------------------------- | ------ | ----------------------------------------------------------------- | ------------- |
| `apps/desktop/scripts/apply-third-party-patches.mjs`           | +4 -1  | resolucao de `node_modules`                                       | sim           |
| `apps/desktop/scripts/electron-main-production-activation.mjs` | +4 -1  | resolucao de `node_modules` (5o call site da mesma classe)        | sim           |
| `apps/desktop/scripts/build-tree-sitter-electron.mjs`          | +7 -3  | idem                                                              | sim           |
| `apps/desktop/scripts/build-tree-sitter-node.mjs`              | +22 -5 | idem, e guarda `win32` para nao compilar ABI Node no Windows      | sim           |
| `apps/desktop/scripts/lib/build-asar.mjs`                      | +4 -3  | resolve o `dist/` unpacked por plataforma                         | sim           |
| `apps/desktop/scripts/lib/clean-build.mjs`                     | +5 -0  | nao sobrepoe `dist/node-deps` no Windows                          | sim           |
| `apps/desktop/scripts/lib/asar-integrity.mjs`                  | +17 -4 | idem, e normaliza separadores de caminho na verificacao (Windows) | sim           |
| `apps/desktop/scripts/verify-publication-tree.mjs`             | +6 -1  | comparacao de arvore relativa ao diretorio                        | sim           |
| `apps/desktop/scripts/lib/config.mjs`                          | +14 -8 | identidade vem do manifesto de marca                              | nao           |

**Resolucao de `node_modules`.** Os scripts fixavam `<repoRoot>/node_modules`,
que so existe em clone avulso. Qualquer workspace -- pnpm hasteado ou npm
workspaces -- move as dependencias para o `node_modules` da raiz. A correcao esta
concentrada em `apps/desktop/scripts/lib/node-modules.mjs` (arquivo novo), e cada
chamada virou substituicao de uma linha. Fazer o toolchain funcionar em monorepo
e melhoria geral: vale abrir upstream se o repositorio sair do arquivamento.
`electron-main-production-activation.mjs` e o quinto call site desta mesma
classe, corrigido durante o suporte a Windows (ADR 0008).

**Unpacked por plataforma.** `lib/build-asar.mjs` resolve o diretorio
`dist/` unpacked via `lib/runtime-unpacked.mjs` (arquivo novo) em vez de um
caminho fixo, porque o instalador Windows e o `.app` do macOS empacotam o
runtime em layouts diferentes. Esta linha faltava nesta tabela desde o
trabalho de bootstrap Windows; a contagem de arquivos editados ja a incluia.

**Nao compilar ABI Node no Windows.** `build-tree-sitter-node.mjs` ganhou uma
guarda de `process.platform === "win32"` em `stageNodeTreeSitterRuntime`: o
`link.exe` da Microsoft rejeita as flags que o `lld` do Node 26 produz
(`LNK1117`), e nao ha necessidade de compilar, porque `ELECTRON_RUN_AS_NODE=1`
preserva `process.versions.electron`, entao o run empacotado resolve
`dist/deps` -- que ja vem compilado no instalador Windows. Consequencia direta:
`lib/clean-build.mjs` parou de sobrepor `dist/node-deps` no Windows, senao a
limpeza apagaria o que a guarda decidiu nao reconstruir.

**Separadores de caminho na integridade do ASAR.** `lib/asar-integrity.mjs`
normaliza os caminhos que `listPackage()`/`statFile()` do `@electron/asar`
devolvem no Windows. Esta e a edicao mais sensivel desta leva: antes dela, a
verificacao de integridade acusava falsamente **todos os 934 arquivos** do
pacote como ausentes, porque `statFile()` anda a arvore interna do asar via
`path.sep` nativo, e converter tudo para `/` antes de chamar quebra esse
split no Windows. Uma revisao comprovou empiricamente que a correcao
**restaura** a verificacao -- adulteracao, ausencia e entrada extra continuam
sendo detectadas -- e ha teste cobrindo isso
(`apps/desktop/tests/fork-asar-integrity.test.mjs`).

**Comparacao de arvore.** `verify-publication-tree.mjs` comparava o export com
`HEAD^{tree}`, que e sempre a arvore da **raiz** do repositorio, enquanto o
`git archive` e o `git ls-tree` do mesmo script sao relativos ao diretorio
atual. Em clone avulso os dois coincidem; em monorepo, nunca. Trocado para
`HEAD:./`, que e a arvore do diretorio atual e continua identico a
`HEAD^{tree}` quando o cwd e a raiz. Foi o CI que pegou -- o loop local no
Windows nao roda este script.

**Identidade.** `config.mjs` le `@pingdopong/brand` em vez de literais. Especifico
deste fork por definicao.

## Tier 4 -- remocoes

| Arquivo                                         | Motivo                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `.github/workflows/check.yml`                   | disparava em `on: push` sem filtro de branch; um fork nao roda o CI do upstream sem auditar (guia 8) |
| `research-archives/original/**/*.dmg` e `*.exe` | instaladores proprietarios da Anysphere; este fork nao os redistribui                                |
| `tests/research-archives.test.mjs`              | substituido: a versao do upstream exigia os binarios presentes                                       |

## Tier 4 -- edicoes menores

| Arquivo                     | Motivo                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/desktop/.gitignore`   | ignora os dois padroes de instalador, para que copia local siga suportada sem poder ser versionada |
| `apps/desktop/package.json` | renomeado para `@pingdopong/desktop`; ganhou `@pingdopong/brand` como devDependency                |

## Tier 2 -- arquivos novos

Nao conflitam com o upstream: ele nao conhece esses caminhos.

| Caminho                                                   | Para que serve                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `ATTRIBUTION.md`                                          | origem, baseline, nao-afiliacao                                       |
| `README.md` (raiz)                                        | face publica do fork                                                  |
| `SECURITY.md`, `CONTRIBUTING.md` (raiz)                   | politica deste fork                                                   |
| `packages/brand/`                                         | manifesto de marca                                                    |
| `scripts/brand-sweep.sh`                                  | varredura de marca, em modo relatorio                                 |
| `apps/desktop/scripts/lib/node-modules.mjs`               | resolvedor de `node_modules`                                          |
| `apps/desktop/scripts/lib/windows-config.mjs`             | identidades e caminhos do build Windows                               |
| `apps/desktop/scripts/lib/node-gyp.mjs`                   | invoca o entrypoint JS do node-gyp (spawn de `.cmd` falha no Windows) |
| `apps/desktop/scripts/lib/runtime-unpacked.mjs`           | resolve o `dist/` unpacked por plataforma                             |
| `apps/desktop/scripts/ensure-electron-binary.mjs`         | provisiona o binario do Electron, validando o resultado               |
| `apps/desktop/scripts/run-windows.mjs`                    | executa o app reconstruido no Windows sem empacotar                   |
| `apps/desktop/scripts/bootstrap-windows.mjs`              | bootstrap Windows a partir do instalador NSIS                         |
| `apps/desktop/tests/fork-*.test.mjs`                      | testes de customizacao do fork                                        |
| `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` | monorepo                                                              |
| `.oxlintrc.json`, `.oxfmtrc.json`, `lefthook.yml`         | qualidade                                                             |
| `.github/workflows/*`, `.github/dependabot.yml`           | CI                                                                    |
| `docs/fork/`                                              | este dossie                                                           |

## Acoplamentos que este fork criou

Coisas que nao aparecem como linha de diff mas mudam como o projeto se comporta:

- **`apps/desktop` deixou de funcionar sozinho.** `scripts/lib/config.mjs`
  importa `@pingdopong/brand`, entao o app depende do workspace. Extrair a pasta
  isolada quebra o toolchain de build.
- **Dois lockfiles convivem.** `pnpm-lock.yaml` instala;
  `apps/desktop/package-lock.json` e evidencia de build, lida pelos scripts de
  production activation e listada entre os `deterministicInputs` do
  `clean-build.mjs`. `tests/fork-lockfile-parity.test.mjs` impede a deriva.
- **`packageImportMethod: copy` e obrigatorio.** O postinstall do upstream
  reescreve arquivos em `node_modules`; com o hard link padrao do pnpm isso
  corromperia o store global compartilhado com outros projetos da maquina.
- **Cada worktree precisa do proprio `pnpm install`** antes do primeiro commit,
  ou os hooks do Lefthook falham por nao achar os binarios.
