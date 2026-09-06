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
