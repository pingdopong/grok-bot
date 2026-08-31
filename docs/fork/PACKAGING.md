# Como empacotar

Empacotar este projeto exige **macOS em Apple Silicon** e uma **cópia local do
artefato Grok Bot 0.18.0**. As duas restrições são do upstream, não do fork, mas
a segunda mudou de natureza e por isso este documento existe.

## A URL fixada saiu do ar

O `scripts/bootstrap-runtime.mjs` do upstream busca o DMG em
`downloads.cursor.com` quando não encontra cópia local. Desde 2026-08-31 essa URL
responde **HTTP 403** — verificado do CI e de IP residencial, em `HEAD` e em `GET`
com range; a própria raiz do host também responde 403. Não é bloqueio de IP de
datacenter e não é 404.

Ou seja: **o caminho por rede não funciona mais para ninguém**, e trazer o
artefato deixou de ser conveniência offline para virar pré-requisito. Detalhes em
[`UPSTREAM-WATCH.md`](UPSTREAM-WATCH.md).

Este repositório **não hospeda o artefato**, por decisão registrada em
[`decisions/0005-remocao-dos-instaladores-lfs.md`](decisions/0005-remocao-dos-instaladores-lfs.md).
Não tente contornar o 403: é controle de acesso da Anysphere sobre a
infraestrutura deles.

## Pré-requisitos

|             |                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------- |
| Sistema     | macOS em Apple Silicon (arm64)                                                                    |
| Node        | 26.5.x — fixado em `.node-version`                                                                |
| pnpm        | 10.27.x — fixado em `packageManager`                                                              |
| Ferramentas | Xcode Command Line Tools (os módulos nativos compilam no install)                                 |
| Artefato    | `Grok_Bot_0.18.0.dmg`, SHA-256 `a253ccd8aab01e083f9812a0264354c5034d8ba7f0610bbb557e82ae77d203eb` |

Confira o digest antes de usar. Um artefato que não bate é rejeitado pelo
`bootstrap`, mas é melhor descobrir isso antes:

```sh
shasum -a 256 Grok_Bot_0.18.0.dmg
```

## Passos

```sh
pnpm install
```

Coloque o DMG onde o `bootstrap` procura. O caminho abaixo é **ignorado pelo
`.gitignore`** de propósito: a cópia local funciona e não pode ser versionada por
acidente.

```sh
mkdir -p apps/desktop/research-archives/original/0.18.0/macos-arm64
cp /caminho/para/Grok_Bot_0.18.0.dmg apps/desktop/research-archives/original/0.18.0/macos-arm64/
```

Alternativa, se você já tem o app 0.18.0 instalado: exporte
`GROK_BOT_018_APP` apontando para ele, e pule a cópia.

```sh
pnpm --filter @pingdopong/desktop run bootstrap
pnpm --filter @pingdopong/desktop run package
pnpm --filter @pingdopong/desktop run verify
```

## O que esperar

O `bootstrap` confere o SHA-256 do DMG e do `app.asar` extraído, guarda o runtime
Electron em cache e hidrata `apps/desktop/src/app/dist` — que é o **renderer
compilado da Anysphere**, não código nosso.

O `package` compila os runtimes reconstruídos, aplica o transform de renderer,
monta o bundle, atribui a identidade e assina ad-hoc. A saída é:

```
apps/desktop/dist/Grok Bot 0.18 Reconstructed.app
```

O `verify` lê o `Info.plist` do app gerado e compara com as constantes de
`scripts/lib/config.mjs`, que por sua vez vêm de
[`packages/brand`](../../packages/brand/brand.config.mjs). Confirme o
identificador — é a única mudança de identidade que este fork faz:

```sh
plutil -extract CFBundleIdentifier raw "apps/desktop/dist/Grok Bot 0.18 Reconstructed.app/Contents/Info.plist"
```

Deve responder `com.pingdopong.grokbot.reconstructed`. Se responder algo sob
`com.anysphere.*`, o manifesto de marca não está sendo lido e isso é um defeito.

## Se falhar

O suspeito mais provável é a camada que este fork mexeu: a conversão de npm para
pnpm e o resolvedor de `node_modules`. Quatro scripts do upstream fixavam
`<repoRoot>/node_modules`, que num monorepo não existe — ver
[`decisions/0007-pnpm-com-node-linker-hoisted.md`](decisions/0007-pnpm-com-node-linker-hoisted.md)
e o inventário em [`CUSTOMIZATIONS.md`](CUSTOMIZATIONS.md).

Diagnóstico rápido: confirme que os caminhos resolvem.

```sh
node --input-type=module -e 'import fs from "node:fs"; const { nodeModulesPath } = await import("./apps/desktop/scripts/lib/node-modules.mjs"); for (const s of [["@electron","asar","bin","asar.mjs"],[".bin","node-gyp"],["tree-sitter"],["electron"]]) { const p = nodeModulesPath(...s); console.log((fs.existsSync(p) ? "ok    " : "FALTA ") + p); }'
```

Se algum aparecer como `FALTA`, o problema é o resolvedor. Se todos estiverem
`ok` e ainda assim falhar, o problema está em outro lugar: guarde a saída
completa dos três comandos.

Issues estão desabilitadas neste fork (padrão do GitHub para forks). Enquanto
continuarem assim, relatos vão por canal privado — ver
[`SECURITY.md`](../../SECURITY.md) para o que é vulnerabilidade, e o mantenedor
do repositório para o resto.

## Sem publicação

Nenhum workflow deste repositório publica artefato. O `package-macos.yml` é
`workflow_dispatch` apenas, sem `--publish`, e retém a saída como artefato do
Actions. Isso é decisão bloqueante, não omissão — ver
[`decisions/0006-gate-juridico-de-distribuicao.md`](decisions/0006-gate-juridico-de-distribuicao.md).
