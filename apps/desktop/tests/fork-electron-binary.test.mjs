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
