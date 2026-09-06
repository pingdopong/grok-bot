// [FORK] Arquivo novo deste fork.
//
// Roda o app reconstruido no Windows sem empacotar. O upstream so tem caminho de
// execucao via bundle .app do macOS; aqui o Electron aponta direto para o
// diretorio montado por build.mjs.
//
// SAND_PACKAGED=1 e deliberado: e o que faz shell-parser resolver as
// dependencias nativas para dist/deps (as do instalador) em vez do dominio
// "developer". Sem isso o app procura tree-sitter no lugar errado.
import { access } from "node:fs/promises";
import path from "node:path";

import { fidelityStagedAppDir } from "./lib/config.mjs";
import { ensureElectronBinary } from "./ensure-electron-binary.mjs";
import { run } from "./lib/process.mjs";

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

if (process.platform !== "win32") {
  throw new Error("run-windows.mjs e especifico do Windows; no macOS use `npm run package`.");
}

// build.mjs monta em fidelityStagedAppDir (.build/fidelity/app), nao em
// stagedAppDir (.build/app) -- este ultimo pertence ao caminho buildAsar direto,
// que build.mjs nao usa.
if (!(await exists(path.join(fidelityStagedAppDir, "package.json")))) {
  throw new Error(
    [
      `Nenhum app montado em ${fidelityStagedAppDir}.`,
      "Rode antes: node scripts/bootstrap-windows.mjs && node scripts/build.mjs",
    ].join("\n"),
  );
}

const electron = await ensureElectronBinary();
console.log(`Electron: ${electron}`);
console.log(`App:      ${fidelityStagedAppDir}`);

await run(electron, [fidelityStagedAppDir], {
  env: { ...process.env, SAND_PACKAGED: "1" },
  stdio: "inherit",
});
