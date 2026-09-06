import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createPackage } from "@electron/asar";

import {
  packStagedAppWithIntegrity,
  snapshotFiles,
  verifyStagedPackageIntegrity,
} from "../scripts/lib/asar-integrity.mjs";

// [FORK] Arquivo novo deste fork.
//
// archiveFileEntries() normaliza separadores de caminho ao ler o ASAR: antes
// da correcao, a verificacao acusava falsamente todos os 934 arquivos como
// ausentes. O bug so se manifesta em caminhos ANINHADOS (statFile precisa do
// separador nativo para andar na arvore de diretorios) -- por isso todo teste
// aqui usa arquivos em subdiretorios, nunca so na raiz.

async function writeNestedFixture(root, relative, content) {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

const nestedFixtures = [
  ["dist/electron-main/main.cjs", "fixture:electron-main\n"],
  ["dist/host/host-main.cjs", "fixture:host-main\n"],
  ["dist/renderer/assets/app.js", "fixture:renderer-assets\n"],
];

test("caminho feliz: pacote com arquivos aninhados fecha sem erro", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "grok-asar-integrity-happy-"));
  try {
    const stageRoot = path.join(root, "stage");
    for (const [relative, content] of nestedFixtures) await writeNestedFixture(stageRoot, relative, content);

    const archivePath = path.join(root, "app.asar");
    const unpackedRoot = `${archivePath}.unpacked`;

    const result = await packStagedAppWithIntegrity({ stageRoot, archivePath, unpackedRoot });
    assert.equal(result.fileCount, nestedFixtures.length);
    assert.equal(result.archiveFileCount, nestedFixtures.length);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("adulteracao: conteudo divergente num arquivo aninhado do ASAR falha a verificacao", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "grok-asar-integrity-tamper-"));
  try {
    const stageRoot = path.join(root, "stage");
    for (const [relative, content] of nestedFixtures) await writeNestedFixture(stageRoot, relative, content);
    const before = await snapshotFiles(stageRoot);

    // O ASAR real e empacotado a partir de uma copia com um arquivo aninhado
    // alterado -- simula um archive que ficou fora de sincronia com o
    // snapshot registrado (before), sem precisar reabrir/reescrever o .asar.
    const tamperedSourceRoot = path.join(root, "tampered-source");
    await cp(stageRoot, tamperedSourceRoot, { recursive: true });
    await writeFile(path.join(tamperedSourceRoot, "dist/host/host-main.cjs"), "fixture:host-main-ADULTERADO\n");

    const archivePath = path.join(root, "app.asar");
    await createPackage(tamperedSourceRoot, archivePath);
    const unpackedRoot = `${archivePath}.unpacked`;

    await assert.rejects(
      verifyStagedPackageIntegrity({ stageRoot, archivePath, unpackedRoot, before }),
      /archive-mutation/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ausencia: arquivo aninhado esperado que nao esta no ASAR falha a verificacao", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "grok-asar-integrity-missing-"));
  try {
    const stageRoot = path.join(root, "stage");
    for (const [relative, content] of nestedFixtures) await writeNestedFixture(stageRoot, relative, content);
    const before = await snapshotFiles(stageRoot);

    // O ASAR real e empacotado a partir de uma copia sem um dos arquivos
    // aninhados esperados.
    const incompleteSourceRoot = path.join(root, "incomplete-source");
    await cp(stageRoot, incompleteSourceRoot, { recursive: true });
    await rm(path.join(incompleteSourceRoot, "dist/renderer/assets/app.js"), { force: true });

    const archivePath = path.join(root, "app.asar");
    await createPackage(incompleteSourceRoot, archivePath);
    const unpackedRoot = `${archivePath}.unpacked`;

    await assert.rejects(
      verifyStagedPackageIntegrity({ stageRoot, archivePath, unpackedRoot, before }),
      /missing-archive-entry/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
