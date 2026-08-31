# Inventario de customizacoes

A metade legivel do `git diff upstream-mirror..main`. O diff diz **o que** mudou;
esta lista diz **por que**, e se da para devolver ao upstream.

Tiers vem do GUIDE-FORK-WHITELABEL-UPSTREAM 4, em ordem crescente de custo:
1 configuracao que o upstream ja suporta, 2 arquivo novo, 3 ponto de extensao
oficial, 4 edicao em arquivo do upstream -- o unico que cobra imposto para
sempre.

## Tier 4 -- edicoes em arquivos do upstream

Todas marcadas com `[FORK]` no proprio arquivo.

| Arquivo                                               | Linhas | Motivo                                     | Upstreamavel? |
| ----------------------------------------------------- | ------ | ------------------------------------------ | ------------- |
| `apps/desktop/scripts/apply-third-party-patches.mjs`  | +4 -1  | resolucao de `node_modules`                | sim           |
| `apps/desktop/scripts/build-tree-sitter-electron.mjs` | +7 -3  | idem                                       | sim           |
| `apps/desktop/scripts/build-tree-sitter-node.mjs`     | +6 -3  | idem                                       | sim           |
| `apps/desktop/scripts/lib/asar-integrity.mjs`         | +3 -1  | idem                                       | sim           |
| `apps/desktop/scripts/verify-publication-tree.mjs`    | +6 -1  | comparacao de arvore relativa ao diretorio | sim           |
| `apps/desktop/scripts/lib/config.mjs`                 | +14 -8 | identidade vem do manifesto de marca       | nao           |

**Resolucao de `node_modules`.** Os scripts fixavam `<repoRoot>/node_modules`,
que so existe em clone avulso. Qualquer workspace -- pnpm hasteado ou npm
workspaces -- move as dependencias para o `node_modules` da raiz. A correcao esta
concentrada em `apps/desktop/scripts/lib/node-modules.mjs` (arquivo novo), e cada
chamada virou substituicao de uma linha. Fazer o toolchain funcionar em monorepo
e melhoria geral: vale abrir upstream se o repositorio sair do arquivamento.

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

| Caminho                                                   | Para que serve                        |
| --------------------------------------------------------- | ------------------------------------- |
| `ATTRIBUTION.md`                                          | origem, baseline, nao-afiliacao       |
| `README.md` (raiz)                                        | face publica do fork                  |
| `SECURITY.md`, `CONTRIBUTING.md` (raiz)                   | politica deste fork                   |
| `packages/brand/`                                         | manifesto de marca                    |
| `scripts/brand-sweep.sh`                                  | varredura de marca, em modo relatorio |
| `apps/desktop/scripts/lib/node-modules.mjs`               | resolvedor de `node_modules`          |
| `apps/desktop/tests/fork-*.test.mjs`                      | testes de customizacao do fork        |
| `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` | monorepo                              |
| `.oxlintrc.json`, `.oxfmtrc.json`, `lefthook.yml`         | qualidade                             |
| `.github/workflows/*`, `.github/dependabot.yml`           | CI                                    |
| `docs/fork/`                                              | este dossie                           |

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
