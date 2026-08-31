import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

// [FORK] Arquivo novo deste fork.
//
// Este repositorio carrega dois lockfiles, e isso e deliberado:
//
//   - pnpm-lock.yaml, na raiz do monorepo, e o lockfile de instalacao;
//   - apps/desktop/package-lock.json NAO e artefato de instalacao, e evidencia
//     de build. scripts/clean-build.mjs o lista entre os deterministicInputs do
//     manifesto, e scripts/host-production-activation.mjs junto com
//     scripts/electron-main-production-activation.mjs o leem para afirmar
//     versoes exatas de piscina, undici, ws e @fastify/busboy.
//
// O risco de manter os dois e a deriva silenciosa: alguem atualiza uma
// dependencia pelo pnpm, o package-lock.json fica para tras, e as afirmacoes de
// supply chain do upstream passam a validar um grafo que ninguem mais instala.
// Este teste fecha essa porta para exatamente os pacotes que aquelas checagens
// afirmam.

const desktopRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(desktopRoot, "../..");

// Dependencias diretas de apps/desktop: comparaveis pelo bloco importers.
const directlyAsserted = ["piscina", "undici", "ws"];

// @fastify/busboy nao e dependencia direta -- chega via undici 5 e so existe no
// grafo hasteado. A checagem do upstream a le pela chave node_modules do
// package-lock.json, entao aqui basta provar que o pnpm resolveu a mesma versao.
const transitivelyAsserted = ["@fastify/busboy"];

function importerVersion(lockfile, name) {
  const lines = lockfile.split("\n");
  let inside = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === "  apps/desktop:") {
      inside = true;
      continue;
    }
    if (!inside) continue;
    if (/^  \S/.test(line)) break;
    const key = line.trim().replace(/[':]/g, "");
    if (key !== name) continue;
    const versionLine = lines[index + 2] ?? "";
    if (!versionLine.trim().startsWith("version:")) continue;
    return versionLine.trim().slice("version:".length).trim().split("(")[0];
  }
  return undefined;
}

test("both lockfiles agree on every version the activation checks assert", async () => {
  const [npmLockText, pnpmLockText] = await Promise.all([
    readFile(path.join(desktopRoot, "package-lock.json"), "utf8"),
    readFile(path.join(workspaceRoot, "pnpm-lock.yaml"), "utf8"),
  ]);
  const npmLock = JSON.parse(npmLockText);

  for (const name of directlyAsserted) {
    const fromNpm = npmLock.packages?.[`node_modules/${name}`]?.version;
    const fromPnpm = importerVersion(pnpmLockText, name);
    assert.ok(fromNpm, `package-lock.json must pin ${name}`);
    assert.ok(fromPnpm, `pnpm-lock.yaml must resolve ${name} for apps/desktop`);
    assert.equal(
      fromPnpm,
      fromNpm,
      `${name}: pnpm-lock resolves ${fromPnpm} but package-lock.json pins ${fromNpm}. ` +
        "They must agree, otherwise the production activation checks validate a " +
        "dependency graph nobody installs.",
    );
  }

  for (const name of transitivelyAsserted) {
    const fromNpm = npmLock.packages?.[`node_modules/${name}`]?.version;
    assert.ok(fromNpm, `package-lock.json must pin ${name}`);
    assert.ok(
      pnpmLockText.includes(`
  '${name}@${fromNpm}':`),
      `pnpm-lock.yaml must resolve ${name}@${fromNpm}, the version package-lock.json pins`,
    );
  }
});

test("package-lock.json is still a declared deterministic build input", async () => {
  const cleanBuild = await readFile(path.join(desktopRoot, "scripts", "clean-build.mjs"), "utf8");
  assert.match(cleanBuild, /"package-lock\.json",/);
});
