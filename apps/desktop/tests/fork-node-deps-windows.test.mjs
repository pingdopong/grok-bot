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
