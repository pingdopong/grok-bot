// [FORK] Arquivo novo deste fork.
//
// O build precisa dos binarios nativos que o upstream deixa fora do asar
// (dist/deps e dist/native). No macOS eles vivem dentro do bundle .app, em
// Contents/Resources/app.asar.unpacked/dist. No Windows nao existe bundle: os
// mesmos diretorios saem do payload do instalador NSIS, extraidos pelo
// scripts/bootstrap-windows.mjs.
//
// Este resolvedor concentra essa diferenca num lugar so, para que
// scripts/lib/build-asar.mjs mude em uma linha em vez de ganhar ramos de
// plataforma. O comportamento no macOS fica identico ao do upstream.

import { access } from "node:fs/promises";
import path from "node:path";

import { resolveRuntimeApp } from "./runtime.mjs";
import { extractedRoot } from "./windows-config.mjs";

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<{ runtimeRoot: string, unpackedDist: string }>}
 *   `runtimeRoot` e o bundle .app no macOS, ou a raiz da extracao no Windows.
 *   `unpackedDist` e o diretorio dist/ com deps/ e native/.
 */
export async function resolveRuntimeUnpackedDist() {
  if (process.platform === "win32") {
    const unpackedDist = path.join(extractedRoot, "resources", "app.asar.unpacked", "dist");
    if (!(await exists(unpackedDist))) {
      throw new Error(
        [
          `Runtime Windows 0.18.0 ausente em ${unpackedDist}.`,
          "Rode `node scripts/bootstrap-windows.mjs` primeiro.",
        ].join("\n"),
      );
    }
    for (const required of ["deps", "native"]) {
      if (!(await exists(path.join(unpackedDist, required)))) {
        throw new Error(`Runtime Windows 0.18.0 sem dist/${required} em ${unpackedDist}.`);
      }
    }
    return { runtimeRoot: extractedRoot, unpackedDist };
  }

  const runtimeApp = await resolveRuntimeApp();
  return {
    runtimeRoot: runtimeApp,
    unpackedDist: path.join(runtimeApp, "Contents", "Resources", "app.asar.unpacked", "dist"),
  };
}
