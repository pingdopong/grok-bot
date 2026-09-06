// [FORK] Arquivo novo deste fork.
//
// O install.js do Electron sai com codigo 0 mesmo quando o extract-zip aborta no
// meio da extracao -- observado nesta base: restaram apenas locales/, sem o
// executavel. Este provisionador valida o RESULTADO em vez do codigo de saida, e
// cai para o bsdtar que ja vem no Windows quando a extracao ficou incompleta.
import { access, mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { nodeModulesPath } from "./lib/node-modules.mjs";
import { run } from "./lib/process.mjs";

// [FORK] Resolve a partir do package.json, que sempre existe: resolver
// diretamente "electron/dist" falharia na primeira execucao, quando o dist
// ainda nao foi baixado, e cairia no fallback do repoRoot -- um diretorio
// diferente daquele onde o install.js do Electron escreve.
const electronPackageJson = nodeModulesPath("electron", "package.json");
const electronRoot = path.dirname(electronPackageJson);
const electronDist = path.join(electronRoot, "dist");

// [FORK] Versao exigida pelo pacote "electron" instalado (== devDependency do
// projeto). E o alvo contra o qual o binario em dist/ e o zip em cache
// precisam ser conferidos -- ver comentario de cachedZip() sobre o porque.
async function requiredVersion() {
  const pkg = JSON.parse(await readFile(electronPackageJson, "utf8"));
  return pkg.version;
}

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

// [FORK] O cache do Electron e global por maquina (~/.../electron/Cache ou
// %LOCALAPPDATA%\electron\Cache), compartilhado por qualquer projeto que use
// Electron nesta maquina. Ele pode conter zips de varias versoes ao mesmo
// tempo -- e pegar "o primeiro que aparecer" instala silenciosamente a versao
// errada. O nome do arquivo (electron-v<versao>-<plataforma>-<arch>.zip) e a
// unica pista disponivel sem abrir o zip, entao filtramos por ele.
function cachedZipName(version) {
  return `electron-v${version}-${process.platform}-${process.arch}.zip`;
}

async function cachedZip(version) {
  const cacheRoot = electronCacheRoot();
  if (!(await exists(cacheRoot))) return null;
  const wanted = cachedZipName(version);
  for (const entry of await readdir(cacheRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const file of await readdir(path.join(cacheRoot, entry.name))) {
      if (file === wanted) return path.join(cacheRoot, entry.name, file);
    }
  }
  return null;
}

// [FORK] Confere a versao do binario existente, nao so a existencia. O cache
// global (ver cachedZip) pode ter deixado dist/ com o Electron de outro
// projeto: os nativos deste projeto sao compilados para a ABI da versao
// declarada em package.json, e sob a versao errada eles nao carregam --
// silenciosamente, sem erro nesta etapa. O Electron distribui dist/version em
// texto puro exatamente para essa checagem.
async function installedVersion() {
  try {
    return (await readFile(path.join(electronDist, "version"), "utf8")).trim();
  } catch {
    return null;
  }
}

export async function ensureElectronBinary() {
  const executable = electronExecutable();
  const version = await requiredVersion();
  if ((await exists(executable)) && (await installedVersion()) === version) return executable;

  await run(process.execPath, [nodeModulesPath("electron", "install.js")]);
  if ((await exists(executable)) && (await installedVersion()) === version) return executable;

  // Extracao incompleta ou versao errada em dist/: refaz a partir do zip ja
  // baixado e validado por checksum pelo proprio install.js.
  const zip = await cachedZip(version);
  if (zip == null) {
    throw new Error(
      `Electron ${version} nao esta em cache (${cachedZipName(version)}). Rode \`node node_modules/electron/install.js\`.`,
    );
  }
  const tar = process.platform === "win32" ? "C:\\Windows\\System32\\tar.exe" : "tar";
  await rm(electronDist, { recursive: true, force: true });
  await mkdir(electronDist, { recursive: true });
  await run(tar, ["-xf", zip, "-C", electronDist]);

  if (!(await exists(executable)) || (await installedVersion()) !== version) {
    throw new Error(`Extracao do Electron falhou: ${executable} nao ficou na versao ${version}.`);
  }
  return executable;
}

// [FORK] `file://${process.argv[1]}` so bate em POSIX -- no Windows argv[1]
// vem com barras invertidas e letra de unidade, entao a comparacao textual
// nunca e verdadeira e este bloco nunca roda. pathToFileURL normaliza os dois
// lados antes de comparar; mesmo idioma ja usado em audit-renderer-closure.mjs
// e audit-ui-provenance.mjs neste fork.
if (process.argv[1] != null && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  console.log(await ensureElectronBinary());
}
