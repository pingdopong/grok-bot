// [FORK] Arquivo novo deste fork.
//
// Equivalente Windows do bootstrap-runtime.mjs do upstream.
//
// O upstream monta o DMG com hdiutil e extrai o app.asar de dentro do bundle
// .app. Aqui o insumo e o instalador NSIS que a Anysphere publicou para
// Windows x64: o payload da aplicacao vem embutido nele como um arquivo 7z, que
// o bsdtar do proprio Windows sabe ler.
//
// A partir do app.asar extraido, o caminho volta a ser o do upstream: a
// hidratacao usa hydrateSourcePayloadFromAsar, sem alteracao, so com o digest
// Windows no lugar do macOS. O layout interno dos dois asars e identico
// (dist/electron-main, dist/host, dist/renderer), o que e a razao de isto
// funcionar sem tocar no codigo reconstruido.
//
// Uso:
//   node scripts/bootstrap-windows.mjs
//
// O instalador precisa estar em research-archives/original/0.18.0/windows-x64/
// ou apontado por GROK_BOT_018_SETUP. Este repositorio nao o hospeda; ver
// docs/fork/PACKAGING.md.

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, mkdir, rm, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

import { hydrateSourcePayloadFromAsar } from "./lib/runtime.mjs";
import { run } from "./lib/process.mjs";
import {
  archivedSetup,
  carvedPayload,
  extractedAsar,
  extractedRoot,
  sevenZipSignature,
  windowsAsarSha256,
  windowsCacheDir,
  windowsSetupBytes,
  windowsSetupSha256,
  windowsSetupUrl,
  windowsTar,
} from "./lib/windows-config.mjs";

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function sha256(target) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(target)) hash.update(chunk);
  return hash.digest("hex");
}

function fail(message) {
  throw new Error(message);
}

async function resolveSetup() {
  const supplied = process.env.GROK_BOT_018_SETUP?.trim();
  const candidate = supplied != null && supplied.length > 0 ? supplied : archivedSetup;

  if (!(await exists(candidate))) {
    fail(
      [
        `Instalador 0.18.0 nao encontrado em ${candidate}.`,
        "",
        "Este repositorio nao hospeda o binario da Anysphere, e a URL publica",
        `(${windowsSetupUrl}) responde HTTP 403 desde 2026-08-31.`,
        "Traga sua propria copia: coloque o instalador no caminho acima, ou aponte",
        "GROK_BOT_018_SETUP para ele. Ver docs/fork/PACKAGING.md.",
      ].join("\n"),
    );
  }

  const info = await stat(candidate);
  if (info.size !== windowsSetupBytes) {
    fail(`Instalador com tamanho inesperado: esperado ${windowsSetupBytes}, obtido ${info.size}.`);
  }

  const digest = await sha256(candidate);
  if (digest !== windowsSetupSha256) {
    fail(`Instalador com checksum divergente: esperado ${windowsSetupSha256}, obtido ${digest}.`);
  }

  console.log(`Instalador verificado: ${candidate}`);
  return candidate;
}

/**
 * O electron-builder embute o payload da aplicacao como um 7z dentro do
 * executavel NSIS. Localizamos por assinatura em vez de offset fixo: o offset
 * muda entre versoes, a assinatura nao.
 */
async function carvePayload(setup) {
  await mkdir(windowsCacheDir, { recursive: true });

  if (await exists(carvedPayload)) {
    console.log(`Payload ja extraido: ${carvedPayload}`);
    return carvedPayload;
  }

  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile(setup);
  const offset = bytes.indexOf(sevenZipSignature);
  if (offset < 0) fail("Nenhuma assinatura 7z encontrada no instalador.");

  const second = bytes.indexOf(sevenZipSignature, offset + 1);
  if (second >= 0) {
    fail(`Assinatura 7z ambigua: encontrada em ${offset} e ${second}. Recuse em vez de adivinhar.`);
  }

  console.log(`Payload 7z em offset ${offset.toLocaleString()}`);
  const partial = `${carvedPayload}.partial`;
  await rm(partial, { force: true });
  await pipeline(createReadStream(setup, { start: offset }), createWriteStream(partial));

  const { rename } = await import("node:fs/promises");
  await rename(partial, carvedPayload);
  return carvedPayload;
}

async function extractAsar(payload) {
  if (await exists(extractedAsar)) {
    console.log(`app.asar ja extraido: ${extractedAsar}`);
    return extractedAsar;
  }

  if (!(await exists(windowsTar))) {
    fail(
      [
        `bsdtar nao encontrado em ${windowsTar}.`,
        "O bootstrap Windows depende dele para ler o 7z embutido no instalador.",
        "Ele acompanha o Windows 10 1803+ e o Windows 11.",
      ].join("\n"),
    );
  }

  await mkdir(extractedRoot, { recursive: true });

  // app.asar.unpacked tem de vir junto: o electron-builder deixa fora do
  // arquivo os binarios nativos (sand-webauthn-signer.exe, better-sqlite3,
  // tree-chunk-napi), e o extractAll do @electron/asar os le do diretorio
  // irmao. Sem ele a hidratacao falha no primeiro arquivo unpacked.
  await run(windowsTar, [
    "-xf",
    payload,
    "-C",
    extractedRoot,
    "resources/app.asar",
    "resources/app.asar.unpacked",
  ]);

  if (!(await exists(extractedAsar))) fail("O instalador nao continha resources/app.asar.");
  return extractedAsar;
}

const setup = await resolveSetup();
const payload = await carvePayload(setup);
const asar = await extractAsar(payload);

const result = await hydrateSourcePayloadFromAsar(asar, { expectedSha256: windowsAsarSha256 });
console.log(`app.asar Windows verificado: ${result.sha256}`);
console.log("src/app/dist hidratado a partir do payload Windows 0.18.0.");
