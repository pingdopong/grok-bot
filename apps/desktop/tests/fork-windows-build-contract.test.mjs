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
