import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { cachedZip, cachedZipName, electronExecutable } from "../scripts/ensure-electron-binary.mjs";

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

test("cachedZipName monta o nome no padrao electron-v<versao>-<plataforma>-<arch>.zip", () => {
  assert.equal(
    cachedZipName("42.1.0"),
    `electron-v42.1.0-${process.platform}-${process.arch}.zip`,
  );
});

// [FORK] Este e o defeito real: o cache do Electron e global por maquina e pode
// ter zips de varios projetos ao mesmo tempo. Pegar "o primeiro que aparecer"
// em vez de filtrar pelo nome instalou Electron 44 onde o projeto exige
// 42.1.0. cachedZip precisa escolher a versao exigida mesmo com outras
// presentes.
test("cachedZip escolhe a versao certa entre varias no cache", async () => {
  const cacheRoot = await mkdtemp(path.join(tmpdir(), "grok-electron-cache-"));
  try {
    const wantedName = cachedZipName("42.1.0");
    const otherNames = [cachedZipName("44.0.0"), cachedZipName("41.2.3"), cachedZipName("43.0.0")];

    // Cada versao mora no seu proprio subdiretorio de hash, como o cache real
    // do Electron organiza (electron-cache/<hash>/<zip>).
    const wantedDir = path.join(cacheRoot, "hash-wanted");
    await mkdir(wantedDir, { recursive: true });
    await writeFile(path.join(wantedDir, wantedName), "fixture");

    for (const [index, name] of otherNames.entries()) {
      const dir = path.join(cacheRoot, `hash-other-${index}`);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, name), "fixture");
    }

    const result = await cachedZip("42.1.0", cacheRoot);
    assert.equal(result, path.join(wantedDir, wantedName));
  } finally {
    await rm(cacheRoot, { recursive: true, force: true });
  }
});

test("cachedZip devolve null quando a versao exigida nao esta no cache", async () => {
  const cacheRoot = await mkdtemp(path.join(tmpdir(), "grok-electron-cache-"));
  try {
    const dir = path.join(cacheRoot, "hash-other");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, cachedZipName("44.0.0")), "fixture");

    const result = await cachedZip("42.1.0", cacheRoot);
    assert.equal(result, null);
  } finally {
    await rm(cacheRoot, { recursive: true, force: true });
  }
});

test("cachedZip devolve null quando a raiz do cache nem existe", async () => {
  const cacheRoot = path.join(await mkdtemp(path.join(tmpdir(), "grok-electron-cache-")), "nao-existe");
  const result = await cachedZip("42.1.0", cacheRoot);
  assert.equal(result, null);
});
