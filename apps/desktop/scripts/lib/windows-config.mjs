// [FORK] Arquivo novo deste fork.
//
// Identidades e caminhos do build Windows do Grok Bot 0.18.0.
//
// O upstream reconstruiu a partir do artefato macOS arm64 e so suporta aquele
// alvo. Mas a Anysphere distribuiu o 0.18.0 tambem para Windows x64, e o codigo
// reconstruido preservou os ramos de plataforma do original -- `local-exec` ja
// consulta processos por PowerShell, o `box-exec-daemon` ja tem guardas
// `!== "win32"`. O que faltava era um caminho de bootstrap.
//
// Nada aqui enfraquece verificacao: o digest do instalador e o do app.asar
// Windows sao pinos NOVOS, ao lado dos pinos macOS que continuam intactos em
// config.mjs. Sao duas identidades verificadas, nao uma checagem relaxada.

import path from "node:path";

import { repoRoot } from "./config.mjs";

/** Instalador NSIS publicado pela Anysphere para Windows x64. */
export const windowsSetupSha256 =
  "464079a15ef5fa8b61ccea8fffcc78f63cfcf6df65fb0ad5e725d8b95f7e437e";

export const windowsSetupBytes = 125_825_552;

export const windowsSetupUrl =
  "https://downloads.cursor.com/grokbot/stable/win32-x64/0.18.0/Grok_Bot_0.18.0_Setup.exe";

/**
 * app.asar de dentro do instalador Windows. Diferente do macOS
 * (6665408168466f9cacc6087e917890c17f59d2e2e9c2404a5c4a59ad79c1de58) porque o
 * payload empacotado difere, mas o layout interno e o mesmo: dist/electron-main,
 * dist/host, dist/renderer.
 */
export const windowsAsarSha256 =
  "38e85c0e5042c0257db7925e1e55709d6d155d90d92fe26ad654127d509766e0";

/**
 * Onde o bootstrap procura o instalador. Mesmo lugar que o manifesto de
 * proveniencia ja declara, e ja coberto pelo .gitignore -- uma copia local
 * funciona e nao pode ser versionada por acidente.
 */
export const archivedSetup = path.join(
  repoRoot,
  "research-archives",
  "original",
  "0.18.0",
  "windows-x64",
  "Grok_Bot_0.18.0_Setup.exe",
);

export const windowsCacheDir = path.join(repoRoot, ".cache", "windows");
export const carvedPayload = path.join(windowsCacheDir, "app-payload.7z");
export const extractedRoot = path.join(windowsCacheDir, "extracted");
export const extractedAsar = path.join(extractedRoot, "resources", "app.asar");

/**
 * bsdtar, que a Microsoft passou a distribuir com o Windows 10 1803+ e o
 * Windows 11. Ele le 7z via libarchive, o que evita depender de um 7-Zip
 * instalado a parte.
 */
export const windowsTar = "C:\\Windows\\System32\\tar.exe";

/** Assinatura de um arquivo 7z, usada para localizar o payload dentro do NSIS. */
export const sevenZipSignature = Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
