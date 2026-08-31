import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { brand } from "@pingdopong/brand";

import {
  fidelityBundleId,
  fidelityName,
  reconstructedBundleId,
  reconstructedName,
} from "../scripts/lib/config.mjs";

// [FORK] Arquivo novo deste fork.
//
// Teste de customizacao (GUIDE-FORK-WHITELABEL-UPSTREAM 9): existe para que um
// sync futuro do upstream nao reverta a marca em silencio. A suite do upstream
// nao sabe que packages/brand existe.

const desktopRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(desktopRoot, "../..");

test("the packaged identity comes from the brand manifest, not from literals", () => {
  assert.equal(reconstructedName, brand.productName);
  assert.equal(reconstructedBundleId, brand.bundleId);
  assert.equal(fidelityName, brand.fidelityProductName);
  assert.equal(fidelityBundleId, brand.fidelityBundleId);
});

test("no bundle identifier claims Anysphere's reverse-DNS namespace", () => {
  for (const identifier of [reconstructedBundleId, fidelityBundleId]) {
    assert.ok(
      !identifier.startsWith("com.anysphere"),
      `${identifier} claims a namespace this fork does not own`,
    );
  }
  assert.match(reconstructedBundleId, /^com\.pingdopong\./);
});

test("config.mjs reads the manifest instead of hardcoding the identity", async () => {
  const config = await readFile(path.join(desktopRoot, "scripts", "lib", "config.mjs"), "utf8");
  assert.match(config, /import \{ brand \} from "@pingdopong\/brand";/);
  assert.doesNotMatch(config, /"com\.anysphere/);
});

test("the brand sweep script is present for the eventual rename", async () => {
  const sweep = await readFile(path.join(workspaceRoot, "scripts", "brand-sweep.sh"), "utf8");
  // Precisa continuar excluindo os arquivos que devem manter o nome do upstream.
  for (const kept of ["ATTRIBUTION.md", "NOTICE.md", "PROVENANCE.md"]) {
    assert.ok(sweep.includes(kept), `brand-sweep.sh must keep excluding ${kept}`);
  }
});
