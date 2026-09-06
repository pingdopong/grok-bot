# Suporte a Windows 11 e macOS arm64 — Plano de Implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `subagent-driven-development` (recomendado) ou
> `superpowers:executing-plans` para executar tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** fazer o app reconstruído rodar em Windows 11 x64 e continuar empacotando em macOS
arm64, sem afrouxar nenhuma verificação de proveniência.

**Arquitetura:** o bootstrap Windows (já mergeado no PR #10) hidrata `src/app/dist` a partir do
instalador NSIS. O que falta é o build concluir e o app subir. A descoberta que orienta o plano:
`process.versions.electron` **sobrevive** ao `ELECTRON_RUN_AS_NODE=1`, então os daemons resolvem
suas dependências nativas para `dist/deps` — que vem do instalador — e **nunca** para
`dist/node-deps`. Logo o erro de link que bloqueia hoje não precisa ser consertado: precisa ser
evitado, deixando de compilar no Windows algo que o runtime empacotado não carrega.

**Stack:** Node 26.5.x, pnpm 10.27.x, Electron 42.1.0 (ABI 146), `@electron/asar`, `node --test`.

## Restrições globais

- **Nunca afrouxar verificação.** Digest novo é pino **adicional**, jamais substituição ou remoção.
  Regra herdada do `CONTRIBUTING.md` do upstream.
- **Toda edição em arquivo do upstream leva `[FORK]` em linha** e entra em
  `docs/fork/CUSTOMIZATIONS.md`.
- **Nunca reformatar `apps/desktop/**`** — está fora do Oxfmt de propósito (ADR 0004).
- **Nada é distribuído.** Nenhum workflow publica artefato (ADR 0006).
- **O caminho macOS não pode regredir.** Toda tarefa termina com a suíte verde.
- **Cada worktree precisa do próprio `pnpm install`** antes do primeiro commit, senão os hooks do
  Lefthook não acham `oxlint`/`oxfmt`.
- Node fixado em `>=26.5.0 <27`; ative com `eval "$(fnm env --shell bash)"`.

## Estrutura de arquivos

Onde cada responsabilidade mora. Base atual, medida: **25 testes passando** e **9 arquivos do
upstream editados** (`git grep -l "\[FORK\]" -- apps/desktop`, cruzado com `upstream-mirror` para
separar edição de arquivo novo).

| Arquivo                                                            | Responsabilidade                                      | Tarefa |
| ------------------------------------------------------------------ | ----------------------------------------------------- | ------ |
| `apps/desktop/scripts/ensure-electron-binary.mjs`                  | provisionar o Electron e validar o resultado          | 1      |
| `apps/desktop/scripts/build-tree-sitter-node.mjs`                  | **modificar**: pular o estágio de ABI Node no Windows | 2      |
| `apps/desktop/scripts/run-windows.mjs`                             | executar o app montado, sem empacotar                 | 4      |
| `apps/desktop/package.json`                                        | **modificar**: registrar `run:windows`                | 4      |
| `.github/workflows/ci.yml`                                         | **modificar**: job de smoke no `windows-latest`       | 5      |
| `docs/fork/decisions/0008-suporte-a-windows.md`                    | registrar as três escolhas de arquitetura             | 6      |
| `README.md`, `docs/fork/WINDOWS.md`, `docs/fork/CUSTOMIZATIONS.md` | **modificar**: documentação das duas plataformas      | 6      |

Testes, um por tarefa, todos em `apps/desktop/tests/`: `fork-electron-binary`,
`fork-node-deps-windows`, `fork-windows-build-contract`, `fork-platform-parity`.

Cada arquivo novo é tier 2 e não conflita com o upstream. A única modificação em arquivo do upstream
é `build-tree-sitter-node.mjs`, na Tarefa 2 — e ele **já está** na lista dos nove editados, desde a
correção do `node-gyp` no PR #10. Ou seja: este plano não abre nenhuma frente tier 4 nova, só
aprofunda uma existente. A superfície de manutenção contra o upstream não cresce em número de
arquivos.

## Fatos verificados que o plano assume

Medidos nesta máquina, não inferidos:

| Fato                                                                | Evidência                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| `process.versions.electron` = `42.1.0` sob `ELECTRON_RUN_AS_NODE=1` | `electron.exe -p`                                              |
| ABI do Electron 42.1.0 = `146`                                      | `process.versions.modules`                                     |
| Daemons sobem via `process.execPath` + `ELECTRON_RUN_AS_NODE=1`     | `source/node-agent-coordinator/local-exec/supervisor.ts:158`   |
| Empacotado resolve `dist/deps`, não `node-deps`                     | `source/packages/shell-exec/shell-parser.ts:47-49`             |
| Instalador Windows traz os nativos compilados                       | `app.asar.unpacked/dist/deps/tree-sitter/build/Release/*.node` |
| Bootstrap Windows funciona ponta a ponta                            | PR #10                                                         |
| `install.js` do Electron falha silenciosamente aqui; bsdtar extrai  | seção da Tarefa 1                                              |

### Armadilha conhecida em `build-tree-sitter-electron.mjs`

`run(command, args, options)` lê `options.env`, mas aquele arquivo chama
`run(gyp, [...], env)` passando o **mapa de env diretamente** como terceiro argumento. Então
`options.env` é `undefined` e o `spawnProcess` cai para `process.env`: as variáveis
`npm_config_runtime`, `npm_config_target` e `npm_config_disturl` **nunca chegam ao node-gyp**. O que
sustenta aquele build é o `--nodedir` explícito na linha de comando.

É defeito do upstream, preservado como está. Não bloqueia este plano — a Tarefa 2 deixa de usar esse
caminho no Windows, e os nativos de ABI Electron vêm do instalador. Mas quem for mexer naquele
arquivo precisa saber, porque "corrigir" o env sem entender isso muda o alvo do build em silêncio.

---

### Tarefa 1: Provisionar o binário do Electron de forma confiável

O `install.js` do Electron sai com código 0 mas extrai só `locales/` nesta máquina — o
`extract-zip` aborta sem erro. O `tar.exe` nativo do Windows extrai o mesmo zip inteiro. Sem o
binário não há como rodar nada, então isto vem primeiro.

**Arquivos:**

- Criar: `apps/desktop/scripts/ensure-electron-binary.mjs`
- Criar: `apps/desktop/tests/fork-electron-binary.test.mjs`

**Interfaces:**

- Produz: `ensureElectronBinary(): Promise<string>` — caminho absoluto do executável do Electron,
  garantindo que existe. Usado pela Tarefa 4.

- [ ] **Passo 0: Preparar o worktree**

```bash
eval "$(fnm env --shell bash)" && pnpm install --frozen-lockfile
```

Esperado: `Done in ...`. Sem isto os hooks do Lefthook falham no primeiro commit por não acharem
`oxlint`/`oxfmt`, e os testes não resolvem `@electron/asar`.

- [ ] **Passo 1: Escrever o teste que falha**

```js
// apps/desktop/tests/fork-electron-binary.test.mjs
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { electronExecutable } from "../scripts/ensure-electron-binary.mjs";

// [FORK] Arquivo novo deste fork.
//
// Testa comportamento, nao o texto do arquivo: grep no proprio fonte passa assim
// que a string e escrita, e nao prova nada.

test("o caminho do executavel segue a convencao da plataforma", () => {
  const executable = electronExecutable();
  assert.ok(path.isAbsolute(executable), "precisa ser caminho absoluto");
  assert.ok(
    executable.includes(path.join("node_modules", "electron", "dist")),
    "precisa apontar para o Electron do workspace",
  );
  if (process.platform === "win32") {
    assert.ok(executable.endsWith("electron.exe"));
  } else if (process.platform === "darwin") {
    assert.ok(executable.endsWith(path.join("Contents", "MacOS", "Electron")));
  }
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Rodar: `node --test apps/desktop/tests/fork-electron-binary.test.mjs`
Esperado: FAIL com `ERR_MODULE_NOT_FOUND` — `scripts/ensure-electron-binary.mjs` ainda não existe.

- [ ] **Passo 3: Implementar**

```js
// apps/desktop/scripts/ensure-electron-binary.mjs
// [FORK] Arquivo novo deste fork.
//
// O install.js do Electron sai com codigo 0 mesmo quando o extract-zip aborta no
// meio da extracao -- observado nesta base: restaram apenas locales/, sem o
// executavel. Este provisionador valida o RESULTADO em vez do codigo de saida, e
// cai para o bsdtar que ja vem no Windows quando a extracao ficou incompleta.
import { access, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { nodeModulesPath } from "./lib/node-modules.mjs";
import { run } from "./lib/process.mjs";

const electronDist = nodeModulesPath("electron", "dist");

export function electronExecutable() {
  if (process.platform === "win32") return path.join(electronDist, "electron.exe");
  if (process.platform === "darwin") {
    return path.join(electronDist, "Electron.app", "Contents", "MacOS", "Electron");
  }
  return path.join(electronDist, "electron");
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

// So Windows e macOS interessam: sao as duas plataformas que este fork suporta.
function electronCacheRoot() {
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA ?? "", "electron", "Cache");
  }
  return path.join(process.env.HOME ?? "", "Library", "Caches", "electron");
}

async function cachedZip() {
  const cacheRoot = electronCacheRoot();
  if (!(await exists(cacheRoot))) return null;
  for (const entry of await readdir(cacheRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const file of await readdir(path.join(cacheRoot, entry.name))) {
      if (file.endsWith(".zip")) return path.join(cacheRoot, entry.name, file);
    }
  }
  return null;
}

export async function ensureElectronBinary() {
  const executable = electronExecutable();
  if (await exists(executable)) return executable;

  await run(process.execPath, [nodeModulesPath("electron", "install.js")]);
  if (await exists(executable)) return executable;

  // Extracao incompleta: refaz a partir do zip ja baixado e validado por
  // checksum pelo proprio install.js.
  const zip = await cachedZip();
  if (zip == null) {
    throw new Error(
      "Electron nao instalado e nenhum zip em cache. Rode `node node_modules/electron/install.js`.",
    );
  }
  const tar = process.platform === "win32" ? "C:\\Windows\\System32\\tar.exe" : "tar";
  await rm(electronDist, { recursive: true, force: true });
  await mkdir(electronDist, { recursive: true });
  await run(tar, ["-xf", zip, "-C", electronDist]);

  if (!(await exists(executable))) {
    throw new Error(`Extracao do Electron falhou: ${executable} continua ausente.`);
  }
  return executable;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(await ensureElectronBinary());
}
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Rodar: `node --test apps/desktop/tests/fork-electron-binary.test.mjs`
Esperado: PASS.

- [ ] **Passo 5: Exercitar de verdade**

Rodar: `cd apps/desktop && node scripts/ensure-electron-binary.mjs`
Esperado: imprime o caminho do executável, e o arquivo existe com ~226 MB no Windows.

- [ ] **Passo 6: Commit**

```bash
git add apps/desktop/scripts/ensure-electron-binary.mjs apps/desktop/tests/fork-electron-binary.test.mjs
git commit -m "feat: provisiona o binario do Electron validando o resultado

O install.js do Electron sai com codigo 0 mesmo quando o extract-zip aborta no
meio: observado nesta base restando apenas locales/, sem executavel. O
provisionador valida o resultado e cai para o bsdtar do proprio Windows, que
extrai o mesmo zip inteiro.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarefa 2: Não compilar tree-sitter de ABI Node no Windows

O build para em `LNK1117` compilando tree-sitter para o ABI do Node. Verificado que num run
empacotado esse artefato **nunca é carregado**: `runtimeDependencyDomain()` devolve
`"electron dist/deps"` porque `process.versions.electron` sobrevive ao `ELECTRON_RUN_AS_NODE=1`.

A escolha é **não estagiar** em vez de estagiar binários de ABI errado. Se algum caminho futuro
rodar sob Node de sistema, o próprio projeto falha com `SAND_TREE_SITTER_RUNTIME_UNAVAILABLE`, que
é explícito — em vez de carregar um `.node` incompatível.

**Arquivos:**

- Modificar: `apps/desktop/scripts/build-tree-sitter-node.mjs` (função `stageNodeTreeSitterRuntime`)
- Criar: `apps/desktop/tests/fork-node-deps-windows.test.mjs`

**Interfaces:**

- Consome: nada de tarefas anteriores.
- Produz: `stageNodeTreeSitterRuntime(outputRoot)` passa a devolver `null` no Windows em vez de um
  caminho. A Tarefa 3 depende desse contrato.

- [ ] **Passo 1: Escrever o teste que falha**

```js
// apps/desktop/tests/fork-node-deps-windows.test.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

// [FORK] Arquivo novo deste fork.
//
// Num run empacotado, shell-parser.ts escolhe as dependencias nativas por
// dominio: com process.versions.electron definido usa dist/deps, senao
// node-deps. Verificado que ELECTRON_RUN_AS_NODE=1 PRESERVA
// process.versions.electron (42.1.0, modules 146), entao os daemons usam
// dist/deps -- que vem do instalador. node-deps nao e carregado.
const desktopRoot = path.resolve(import.meta.dirname, "..");

test(
  "no Windows o estagiamento de node-deps e pulado",
  { skip: process.platform === "win32" ? false : "comportamento especifico do Windows" },
  async () => {
    const { stageNodeTreeSitterRuntime } = await import("../scripts/build-tree-sitter-node.mjs");
    const outputRoot = await mkdtemp(path.join(tmpdir(), "fork-node-deps-"));
    try {
      // Sem o guarda, isto dispararia o node-gyp e quebraria em LNK1117.
      assert.equal(await stageNodeTreeSitterRuntime(outputRoot), null);
    } finally {
      await rm(outputRoot, { recursive: true, force: true });
    }
  },
);

test("o contrato do shell-parser que justifica isso continua valendo", async () => {
  const parser = await readFile(
    path.join(desktopRoot, "source", "packages", "shell-exec", "shell-parser.ts"),
    "utf8",
  );
  // Se o upstream mudar esta escolha, a premissa da Tarefa 2 cai junto.
  assert.match(parser, /process\.versions\.electron !== undefined/);
  assert.match(parser, /electron dist\/deps/);
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Rodar: `node --test apps/desktop/tests/fork-node-deps-windows.test.mjs`
Esperado no Windows: FAIL no primeiro teste — sem o guarda, `stageNodeTreeSitterRuntime` dispara o
node-gyp e quebra em `LNK1117` em vez de devolver `null`. No macOS o primeiro teste é pulado e só o
segundo roda.

- [ ] **Passo 3: Implementar**

Substituir o corpo de `stageNodeTreeSitterRuntime` em
`apps/desktop/scripts/build-tree-sitter-node.mjs` por:

```js
export async function stageNodeTreeSitterRuntime(outputRoot) {
  // [FORK] No Windows nao compilamos tree-sitter para o ABI do Node.
  //
  // shell-parser.ts escolhe o dominio de dependencia nativa em runtime: com
  // process.versions.electron definido usa dist/deps, senao node-deps. Os
  // daemons sobem via process.execPath com ELECTRON_RUN_AS_NODE=1, e nesse modo
  // process.versions.electron CONTINUA definido (verificado: 42.1.0, ABI 146).
  // Logo o run empacotado resolve dist/deps -- que vem do instalador fixado --
  // e node-deps nunca e carregado.
  //
  // Estagiar binarios de ABI errado seria pior que nao estagiar: se algum
  // caminho futuro rodar sob Node de sistema, o proprio projeto falha com
  // SAND_TREE_SITTER_RUNTIME_UNAVAILABLE, que e explicito.
  if (process.platform === "win32") return null;

  const cacheRoot = await ensureNodeTreeSitterRuntime();
  const destination = path.join(outputRoot, "dist", "node-deps");
  await rm(destination, { recursive: true, force: true });
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(cacheRoot, destination, { recursive: true, dereference: true });
  const runtimeNodeModules = path.join(destination, "node_modules");
  await mkdir(runtimeNodeModules, { recursive: true });
  for (const packageName of dependencies) {
    await cp(path.join(cacheRoot, packageName), path.join(runtimeNodeModules, packageName), {
      recursive: true,
      dereference: true,
    });
  }
  return destination;
}
```

- [ ] **Passo 4: Rodar os testes e ver passar**

Rodar: `node --test apps/desktop/tests/fork-node-deps-windows.test.mjs`
Esperado: PASS nos dois.

- [ ] **Passo 5: Rodar a suíte inteira**

Rodar: `pnpm turbo run typecheck source:typecheck test`
Esperado: `Tasks: 3 successful`. Contagem: base 25 + 1 (Tarefa 1) + 2 (Tarefa 2) = **28** no
Windows; no macOS, **27 pass e 1 skipped**, porque o teste do guarda `win32` é pulado fora do
Windows.

- [ ] **Passo 6: Commit**

```bash
git add apps/desktop/scripts/build-tree-sitter-node.mjs apps/desktop/tests/fork-node-deps-windows.test.mjs
git commit -m "fix: nao compila tree-sitter de ABI Node no Windows

O build parava em LNK1117 compilando tree-sitter para o ABI do Node. Verificado
que esse artefato nunca e carregado num run empacotado: ELECTRON_RUN_AS_NODE=1
preserva process.versions.electron, entao shell-parser resolve dist/deps -- que
vem do instalador fixado.

Nao estagiar e melhor que estagiar ABI errado: se algum caminho rodar sob Node
de sistema, o projeto falha com SAND_TREE_SITTER_RUNTIME_UNAVAILABLE, explicito.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarefa 3: Concluir o build no Windows

Com a Tarefa 2, `build.mjs` deve chegar ao fim e produzir o ASAR reconstruído. Esta tarefa é
verificação, e existe separada porque um revisor pode aprovar a Tarefa 2 e rejeitar o resultado.

**Arquivos:**

- Criar: `apps/desktop/tests/fork-windows-build-contract.test.mjs`

**Interfaces:**

- Consome: `stageNodeTreeSitterRuntime` devolvendo `null` no Windows (Tarefa 2).
- Produz: `.build/fidelity/app.asar` e `.build/fidelity/app/`. A Tarefa 4 consome
  `fidelityStagedAppDir`.

> **Atenção ao caminho.** `build.mjs` chama `buildFidelityReconstructedAsar`, cujos defaults são
> `stageRoot = fidelityStagedAppDir` e `archivePath = fidelityBuiltAsar` — ou seja,
> `.build/fidelity/app` e `.build/fidelity/app.asar`. As constantes `stagedAppDir` e `builtAsar`
> (`.build/app`, `.build/app.asar`) existem mas pertencem ao caminho `buildAsar` direto, que
> `build.mjs` **não** usa. Confundir os dois faz a Tarefa 4 falhar com "nenhum app montado".

- [ ] **Passo 1: Rodar o bootstrap Windows**

Rodar: `cd apps/desktop && node scripts/bootstrap-windows.mjs`
Esperado:

```
app.asar Windows verificado: 38e85c0e5042c0257db7925e1e55709d6d155d90d92fe26ad654127d509766e0
src/app/dist hidratado a partir do payload Windows 0.18.0.
```

- [ ] **Passo 2: Rodar o build**

Rodar: `cd apps/desktop && node scripts/build.mjs`
Esperado, nesta ordem:

```
Fidelity hybrid ASAR ready: ...\.build\fidelity\app.asar
Fail-closed composition audit embedded: ...
Reconstructed ASAR: ...\.build\fidelity\app.asar
Renderer mode: checksum-pinned upstream 0.18.0 payload
```

- [ ] **Passo 3: Confirmar o que foi montado**

Rodar: `ls apps/desktop/.build/fidelity/app/dist`
Esperado: contém `deps/` e `native/`, e **não** contém `node-deps/` (é isso que a Tarefa 2 decidiu).

Se o build ainda falhar, **pare e leia o erro**. Dois suspeitos, nesta ordem: `dist/deps` ausente no
staging (o bootstrap Windows não rodou), ou o patch do renderer não encontrando os chunks esperados
no payload Windows — que é um risco conhecido e registrado em `docs/fork/WINDOWS.md`.

- [ ] **Passo 4: Escrever o teste de contrato**

```js
// apps/desktop/tests/fork-windows-build-contract.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

// [FORK] Arquivo novo deste fork.
const desktopRoot = path.resolve(import.meta.dirname, "..");

test("o bootstrap Windows fixa uma identidade propria, sem substituir a do macOS", async () => {
  const windows = await readFile(
    path.join(desktopRoot, "scripts", "lib", "windows-config.mjs"),
    "utf8",
  );
  const config = await readFile(path.join(desktopRoot, "scripts", "lib", "config.mjs"), "utf8");

  assert.match(windows, /38e85c0e5042c0257db7925e1e55709d6d155d90d92fe26ad654127d509766e0/);
  assert.match(windows, /464079a15ef5fa8b61ccea8fffcc78f63cfcf6df65fb0ad5e725d8b95f7e437e/);
  // O pino macOS tem de continuar intacto: sao duas identidades, nao uma trocada.
  assert.match(config, /6665408168466f9cacc6087e917890c17f59d2e2e9c2404a5c4a59ad79c1de58/);
});

test("o payload 7z e localizado por assinatura, nao por offset fixo", async () => {
  const bootstrap = await readFile(
    path.join(desktopRoot, "scripts", "bootstrap-windows.mjs"),
    "utf8",
  );
  assert.match(bootstrap, /sevenZipSignature/);
  assert.doesNotMatch(bootstrap, /507722/);
});
```

- [ ] **Passo 5: Rodar e ver passar**

Rodar: `node --test apps/desktop/tests/fork-windows-build-contract.test.mjs`
Esperado: PASS nos dois.

- [ ] **Passo 6: Commit**

```bash
git add apps/desktop/tests/fork-windows-build-contract.test.mjs
git commit -m "test: fixa o contrato do bootstrap Windows

Duas identidades verificadas convivendo (instalador e asar Windows, com o pino
macOS intacto) e o payload localizado por assinatura, para que um refactor futuro
nao volte a fixar offset.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarefa 4: Rodar o app no Windows

Executar o Electron contra o diretório montado. Sem bundle `.app`, sem `codesign`, sem
notarização — é onde mora todo o macOS, e nada disso é necessário para rodar.

**Arquivos:**

- Criar: `apps/desktop/scripts/run-windows.mjs`
- Modificar: `apps/desktop/package.json` (adicionar script `run:windows`)

**Interfaces:**

- Consome: `ensureElectronBinary()` (Tarefa 1); `fidelityStagedAppDir` (Tarefa 3).

- [ ] **Passo 1: Implementar o runner**

```js
// apps/desktop/scripts/run-windows.mjs
// [FORK] Arquivo novo deste fork.
//
// Roda o app reconstruido no Windows sem empacotar. O upstream so tem caminho de
// execucao via bundle .app do macOS; aqui o Electron aponta direto para o
// diretorio montado por build.mjs.
//
// SAND_PACKAGED=1 e deliberado: e o que faz shell-parser resolver as
// dependencias nativas para dist/deps (as do instalador) em vez do dominio
// "developer". Sem isso o app procura tree-sitter no lugar errado.
import { access } from "node:fs/promises";
import path from "node:path";

import { fidelityStagedAppDir } from "./lib/config.mjs";
import { ensureElectronBinary } from "./ensure-electron-binary.mjs";
import { run } from "./lib/process.mjs";

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

if (process.platform !== "win32") {
  throw new Error("run-windows.mjs e especifico do Windows; no macOS use `npm run package`.");
}

// build.mjs monta em fidelityStagedAppDir (.build/fidelity/app), nao em
// stagedAppDir (.build/app) -- este ultimo pertence ao caminho buildAsar direto,
// que build.mjs nao usa.
if (!(await exists(path.join(fidelityStagedAppDir, "package.json")))) {
  throw new Error(
    [
      `Nenhum app montado em ${fidelityStagedAppDir}.`,
      "Rode antes: node scripts/bootstrap-windows.mjs && node scripts/build.mjs",
    ].join("\n"),
  );
}

const electron = await ensureElectronBinary();
console.log(`Electron: ${electron}`);
console.log(`App:      ${fidelityStagedAppDir}`);

await run(electron, [fidelityStagedAppDir], {
  env: { ...process.env, SAND_PACKAGED: "1" },
  stdio: "inherit",
});
```

- [ ] **Passo 2: Registrar o script**

Em `apps/desktop/package.json`, dentro de `"scripts"`, logo após a linha do `"publication:check"`:

```json
    "run:windows": "node scripts/run-windows.mjs",
```

- [ ] **Passo 3: Rodar**

Rodar: `cd apps/desktop && node scripts/run-windows.mjs`
Esperado: uma janela do Electron abre. **Este é o momento de verdade do plano.**

- [ ] **Passo 4: Registrar o que acontecer**

Anote em `docs/fork/WINDOWS.md`, seção nova "Resultado da execução", exatamente um destes:

- **subiu e a UI renderizou** — registre a versão e o que funciona;
- **subiu e quebrou em runtime** — cole o erro completo e o stack; o suspeito nº 1 é
  `packages/shell-exec/sandbox/macos` sem contraparte;
- **não subiu** — cole a saída; o suspeito nº 1 é `dist/deps` não estagiado.

Não maquie o resultado. O valor deste plano é saber onde para.

- [ ] **Passo 5: Commit**

```bash
git add apps/desktop/scripts/run-windows.mjs apps/desktop/package.json docs/fork/WINDOWS.md
git commit -m "feat: roda o app reconstruido no Windows sem empacotar

Electron apontando direto para o diretorio montado, com SAND_PACKAGED=1 para que
shell-parser resolva os nativos em dist/deps. Sem bundle, sem codesign, sem
notarizacao -- nada disso e necessario para executar.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Ponto de decisão — depois da Tarefa 4

O plano existe para chegar até aqui com uma resposta. As Tarefas 5 e 6 só valem a pena em dois dos
três resultados possíveis. **Decida antes de continuar.**

| Resultado da Tarefa 4          | O que fazer                                                                                                                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A UI subiu**                 | Siga para as Tarefas 5 e 6. Registre no ADR 0008 o que funciona e o que não foi testado.                                                                                                                                                                         |
| **Subiu e quebrou em runtime** | Siga para 5 e 6 assim mesmo — o código funciona o bastante para merecer os testes de paridade e a documentação. Registre a falha em `docs/fork/WINDOWS.md` com o stack completo, e abra a questão do sandbox como trabalho separado.                             |
| **Não subiu**                  | **Pare.** Não faça as Tarefas 5 e 6. Registre em `docs/fork/WINDOWS.md` onde parou e execute a recomendação que já está lá: reverter em vez de manter código não exercitado. Um branch com bootstrap e runner que ninguém consegue usar é dívida, não progresso. |

Essa terceira linha não é pessimismo: é a regra que o próprio dossiê já estabeleceu, e ela existe
para que abandonar seja uma escolha barata em vez de uma derrota.

---

### Tarefa 5: Provar que o macOS não regrediu

Todas as mudanças anteriores tocam código compartilhado. Esta tarefa fecha o contrato das duas
plataformas.

**Arquivos:**

- Criar: `apps/desktop/tests/fork-platform-parity.test.mjs`
- Modificar: `.github/workflows/ci.yml`

- [ ] **Passo 1: Escrever o teste de paridade**

```js
// apps/desktop/tests/fork-platform-parity.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

// [FORK] Arquivo novo deste fork.
//
// O suporte a Windows nao pode ter sido comprado com regressao no macOS. Estes
// testes fixam que os caminhos macOS continuam intactos.
const desktopRoot = path.resolve(import.meta.dirname, "..");

test("o bootstrap macOS continua fixando o DMG e o asar originais", async () => {
  const config = await readFile(path.join(desktopRoot, "scripts", "lib", "config.mjs"), "utf8");
  assert.match(config, /a253ccd8aab01e083f9812a0264354c5034d8ba7f0610bbb557e82ae77d203eb/);
  assert.match(config, /6665408168466f9cacc6087e917890c17f59d2e2e9c2404a5c4a59ad79c1de58/);
});

test("o resolvedor de runtime preserva o caminho do bundle no macOS", async () => {
  const resolver = await readFile(
    path.join(desktopRoot, "scripts", "lib", "runtime-unpacked.mjs"),
    "utf8",
  );
  assert.match(resolver, /Contents/);
  assert.match(resolver, /app\.asar\.unpacked/);
  assert.match(resolver, /resolveRuntimeApp/);
});

test("o caminho de compilacao do node-deps foi guardado, nao removido", async () => {
  // Contrato de modulo em vez de offsets de texto: comparar posicoes com indexOf
  // quebra a cada reformatacao e nao prova nada sobre comportamento.
  const module = await import("../scripts/build-tree-sitter-node.mjs");
  assert.equal(typeof module.stageNodeTreeSitterRuntime, "function");
  assert.equal(
    typeof module.ensureNodeTreeSitterRuntime,
    "function",
    "o compilador de ABI Node precisa continuar existindo para macOS e Linux",
  );
});
```

- [ ] **Passo 2: Rodar e ver passar**

Rodar: `node --test apps/desktop/tests/fork-platform-parity.test.mjs`
Esperado: PASS nos três.

- [ ] **Passo 3: Rodar a suíte inteira**

Rodar: `pnpm turbo run format:check lint typecheck source:typecheck frontend:build test`
Esperado: `Tasks: 6 successful`. Contagem: 25 + 1 + 2 + 2 + 3 = **33** no Windows; **32 pass e 1
skipped** no macOS.

- [ ] **Passo 4: Acrescentar o smoke Windows ao CI**

Em `.github/workflows/ci.yml`, acrescentar um **job novo** sob `jobs:`, irmão de `quality` — não um
passo dentro dele. Os dois rodam em paralelo:

```yaml
windows-smoke:
  name: Smoke do bootstrap Windows
  runs-on: windows-latest
  timeout-minutes: 20
  steps:
    - name: Checkout
      uses: actions/checkout@v6
      with:
        persist-credentials: false

    - name: Setup pnpm
      uses: pnpm/action-setup@v6

    - name: Setup Node
      uses: actions/setup-node@v6
      with:
        node-version-file: .node-version
        cache: pnpm

    - name: Install
      run: pnpm install --frozen-lockfile

    # Sem o instalador da Anysphere nao da para bootstrapar, e este
    # repositorio nao o hospeda. O que o CI pode provar sem o artefato e que
    # os scripts carregam, tipam e falham com a mensagem certa.
    - name: Contratos e tipos
      run: pnpm turbo run typecheck source:typecheck test

    - name: O bootstrap falha com mensagem util quando nao ha artefato
      shell: bash
      run: |
        cd apps/desktop
        if node scripts/bootstrap-windows.mjs 2>err.txt; then
          echo "::error::bootstrap deveria falhar sem o instalador"
          exit 1
        fi
        grep -q "Instalador 0.18.0 nao encontrado" err.txt
        grep -q "docs/fork/PACKAGING.md" err.txt
```

> **Risco conhecido deste job.** `pnpm install` no `windows-latest` executa os scripts de install de
> `tree-sitter` e `tree-sitter-bash`. Se eles caírem no `node-gyp` em vez de usar prebuilds, o job
> bate no mesmo `LNK1117` da Tarefa 2 — que ali é evitado no _build_, não no _install_. Se isso
> acontecer, a correção é acrescentar `--ignore-scripts` a este job específico e registrar o motivo
> em `docs/fork/WINDOWS.md`; não é para "consertar" o linker.

- [ ] **Passo 5: Validar o YAML**

Rodar: `python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml', encoding='utf-8')); print('ok')"`
Esperado: `ok`.

- [ ] **Passo 6: Commit**

```bash
git add apps/desktop/tests/fork-platform-parity.test.mjs .github/workflows/ci.yml
git commit -m "test: fixa paridade de plataforma e adiciona smoke Windows no CI

O suporte a Windows nao pode ter custado regressao no macOS: os testes fixam os
pinos do DMG e do asar originais, o caminho do bundle no resolvedor, e que o
node-deps segue estagiado fora do Windows -- guardado, nao removido.

O job windows-latest prova o que da para provar sem o artefato da Anysphere: que
os scripts carregam, tipam, e falham com a mensagem que manda o leitor ao
runbook.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarefa 6: Fechar a documentação das duas plataformas

**Arquivos:**

- Modificar: `README.md` (tabela "What runs where")
- Modificar: `docs/fork/WINDOWS.md`
- Modificar: `docs/fork/CUSTOMIZATIONS.md`
- Criar: `docs/fork/decisions/0008-suporte-a-windows.md`

- [ ] **Passo 1: Escrever o ADR**

```markdown
# 0008 -- Suporte a Windows

**Data:** 2026-09-06 - **Status:** aceita

## Contexto

O upstream suporta um alvo so, macOS arm64. Mas a Anysphere distribuiu o 0.18.0
tambem para Windows x64, e o codigo reconstruido preservou os ramos de plataforma
do original. O que era macOS-only era a toolchain, nao o produto.

## Decisao

Suportar Windows x64 para **execucao**, nao para empacotamento. O bundle .app, o
codesign e a notarizacao continuam macOS-only, e e neles que mora toda a
dependencia de plataforma.

Tres escolhas sustentam isso:

1. **Duas identidades fixadas, nao uma trocada.** O digest do instalador e do
   asar Windows sao pinos novos ao lado dos do macOS.
2. **Nao compilar tree-sitter de ABI Node no Windows.** Verificado que
   ELECTRON_RUN_AS_NODE=1 preserva process.versions.electron, entao o run
   empacotado resolve dist/deps -- que vem do instalador. Estagiar ABI errado
   seria pior que nao estagiar.
3. **Rodar sem empacotar.** Electron apontando para o diretorio montado.

## Consequencias

- A superficie de diff cresceu: edicoes tier 4 em build-asar, nos dois
  build-tree-sitter, e arquivos novos de bootstrap e runner.
- `packages/shell-exec/sandbox/macos` nao tem contraparte. O que depender de
  Seatbelt falha ou fica desligado no Windows.
- Se o Windows for abandonado, reverter e melhor que manter codigo nao
  exercitado.
```

- [ ] **Passo 2: Atualizar a tabela do README**

Em `README.md`, na tabela "What runs where", substituir as três últimas linhas por:

```markdown
| `publication:check` | no — needs `/usr/bin/git` and `tar` | yes |
| `bootstrap-windows` + `build` | **yes** (Windows) | não se aplica |
| `run:windows` | **yes** | não se aplica |
| `bootstrap`, `package`, `verify` | **no** | yes |
```

E substituir o parágrafo final da seção por:

```markdown
Windows executa o app pelo caminho `bootstrap-windows` → `build` → `run:windows`, sem empacotar.
macOS continua sendo a única plataforma que produz um `.app` distribuível. Detalhes em
[`docs/fork/WINDOWS.md`](docs/fork/WINDOWS.md).
```

- [ ] **Passo 3: Registrar as edições no inventário**

Em `docs/fork/CUSTOMIZATIONS.md`, na tabela "Tier 4", acrescentar:

```markdown
| `apps/desktop/scripts/build-tree-sitter-node.mjs` | guarda `win32` em `stageNodeTreeSitterRuntime` | não compila ABI Node no Windows | sim |
```

E em "Tier 2 -- arquivos novos":

```markdown
| `apps/desktop/scripts/ensure-electron-binary.mjs` | provisiona o Electron validando o resultado |
| `apps/desktop/scripts/run-windows.mjs` | executa o app no Windows sem empacotar |
```

- [ ] **Passo 4: Rodar a suíte e formatar**

Rodar: `pnpm exec oxfmt && pnpm turbo run format:check lint typecheck source:typecheck test`
Esperado: `Tasks: 5 successful`, mesma contagem da Tarefa 5 (**33** no Windows, **32 + 1 skipped** no
macOS).

- [ ] **Passo 5: Commit**

```bash
git add README.md docs/fork/
git commit -m "docs: fecha a documentacao das duas plataformas

ADR 0008 registra as tres escolhas que sustentam o suporte a Windows: duas
identidades fixadas em vez de uma trocada, nao compilar ABI Node, e rodar sem
empacotar. README e inventario atualizados.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verificação final

- [ ] `pnpm turbo run format:check lint typecheck source:typecheck frontend:build test` verde
- [ ] `cd apps/desktop && node scripts/bootstrap-windows.mjs && node scripts/build.mjs` conclui
- [ ] `node scripts/run-windows.mjs` — resultado registrado em `docs/fork/WINDOWS.md`, qualquer
      que seja, e o ponto de decisão acima aplicado
- [ ] `git diff --find-renames --numstat upstream-mirror..HEAD | awk '$1!="0" || $2!="0"'` — a
      superfície cresceu de forma explicável e está em `CUSTOMIZATIONS.md`
- [ ] `bash scripts/brand-sweep.sh` continua passando
- [ ] CI verde nos dois jobs
- [ ] Nenhum digest do macOS foi alterado ou removido

## O que este plano não faz

- **Não empacota no Windows.** Não há instalador, nem `.exe` distribuível. Isso exigiria
  electron-builder, assinatura e um gate jurídico que continua fechado (ADR 0006).
- **Não resolve o sandbox.** `packages/shell-exec/sandbox/macos` é Seatbelt e não tem contraparte.
  O que depender dele vai degradar no Windows, e só se mede com o app rodando.
- **Não toca o gate de distribuição.** Um derivado Windows é _mais_ derivação, não menos.
