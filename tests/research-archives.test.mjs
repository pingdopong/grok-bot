import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

// [FORK] Substitui o teste do upstream, que exigia os dois instaladores originais
// presentes via Git LFS e conferia bytes e SHA-256 de cada um. Este fork nao
// redistribui esses binarios proprietarios: o inventario e a proveniencia
// continuam versionados, os arquivos nao. Ver ATTRIBUTION.md e
// docs/fork/decisions/0005-remocao-dos-instaladores-lfs.md.

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const archiveRoot = path.join(repositoryRoot, "research-archives", "original", "0.18.0");

async function manifest() {
  return JSON.parse(await readFile(path.join(archiveRoot, "artifacts.json"), "utf8"));
}

test("the preserved release inventory still describes both 0.18.0 installers", async () => {
  const inventory = await manifest();
  assert.deepEqual(Object.keys(inventory).sort(), ["artifacts", "product", "schemaVersion", "version"]);
  assert.equal(inventory.schemaVersion, 1);
  assert.equal(inventory.product, "Grok Bot");
  assert.equal(inventory.version, "0.18.0");
  assert.equal(inventory.artifacts.length, 2);

  const sums = await readFile(path.join(archiveRoot, "SHA256SUMS"), "utf8");
  for (const artifact of inventory.artifacts) {
    assert.deepEqual(
      Object.keys(artifact).sort(),
      ["architecture", "bytes", "path", "platform", "sha256", "sourceUrl"],
    );
    assert.match(artifact.path, /^(macos-arm64\/[^/]+\.dmg|windows-x64\/[^/]+\.exe)$/);
    assert.match(artifact.sha256, /^[0-9a-f]{64}$/);
    assert.ok(Number.isInteger(artifact.bytes) && artifact.bytes > 0);
    assert.match(artifact.sourceUrl, /^https:\/\/downloads\.cursor\.com\/grokbot\/stable\//);
    assert.ok(
      sums.includes(`${artifact.sha256}  ${artifact.path}`),
      `SHA256SUMS must list ${artifact.path} with the manifest digest`,
    );
  }
});

test("this fork does not track the upstream installers", async () => {
  const inventory = await manifest();
  const tracked = execFileSync("git", ["ls-files", "--", "research-archives/original"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);

  for (const artifact of inventory.artifacts) {
    const relative = `research-archives/original/0.18.0/${artifact.path}`;
    assert.ok(
      !tracked.includes(relative),
      `${relative} must not be versioned in this fork; a local copy stays supported but untracked`,
    );
  }

  const ignore = await readFile(path.join(repositoryRoot, ".gitignore"), "utf8");
  assert.match(ignore, /^\/research-archives\/original\/\*\*\/\*\.dmg$/m);
  assert.match(ignore, /^\/research-archives\/original\/\*\*\/\*\.exe$/m);
});

test("bootstrap prefers a local archive and falls back to the pinned URL", async () => {
  const [attributes, config, bootstrap] = await Promise.all([
    readFile(path.join(repositoryRoot, ".gitattributes"), "utf8"),
    readFile(path.join(repositoryRoot, "scripts", "lib", "config.mjs"), "utf8"),
    readFile(path.join(repositoryRoot, "scripts", "bootstrap-runtime.mjs"), "utf8"),
  ]);
  assert.match(attributes, /research-archives\/original\/\*\*\/\*\.dmg filter=lfs diff=lfs merge=lfs -text/);
  assert.match(attributes, /research-archives\/original\/\*\*\/\*\.exe filter=lfs diff=lfs merge=lfs -text/);
  assert.match(
    config,
    /export const archivedDmg = path\.join\(repoRoot, "research-archives", "original", "0\.18\.0", "macos-arm64", "Grok_Bot_0\.18\.0\.dmg"\)/,
  );
  assert.match(bootstrap, /if \(await exists\(archivedDmg\)\)/);
  assert.match(bootstrap, /await copyFile\(archivedDmg, cachedDmg\)/);
  assert.match(bootstrap, /await fetch\(dmgUrl/);
  assert.ok(
    bootstrap.indexOf("await copyFile(archivedDmg, cachedDmg)") < bootstrap.indexOf("await fetch(dmgUrl"),
    "the archived copy must be preferred over the network",
  );
});
