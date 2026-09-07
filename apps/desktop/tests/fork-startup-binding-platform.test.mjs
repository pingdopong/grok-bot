import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadModule() {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "grok-fork-startup-binding-"));
  const output = path.join(temporary, "production-binding-providers.mjs");
  await build({
    entryPoints: [path.join(repoRoot, "source/electron-main/production-binding-providers.ts")],
    outfile: output,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    // "electron" is only touched by the require("electron")-in-a-factory-body
    // manifest-call exports (createElectronProduction*Binding), which these
    // tests never call. Marking it external keeps the bundle from needing a
    // real Electron runtime to resolve or execute.
    external: ["electron"],
  });
  const module = await import(`${pathToFileURL(output).href}?${Date.now()}`);
  return { module, dispose: () => rm(temporary, { recursive: true, force: true }) };
}

function baseApp(overrides = {}) {
  return {
    isPackaged: true,
    setPath() {},
    getPath() {
      return "C:/tmp/userData";
    },
    isInApplicationsFolder() {
      return true;
    },
    moveToApplicationsFolder() {
      return true;
    },
    relaunch() {},
    exit() {},
    ...overrides,
  };
}

function baseDialog() {
  return {
    async showMessageBox() {
      return { response: 0 };
    },
  };
}

test("win32 platform does not require the macOS Applications Folder APIs", async () => {
  const { module, dispose } = await loadModule();
  try {
    const { isInApplicationsFolder, moveToApplicationsFolder, ...appWithoutMacOnlyApis } = baseApp();
    const ports = {
      platform: "win32",
      app: appWithoutMacOnlyApis,
      dialog: baseDialog(),
    };
    assert.doesNotThrow(() => module.createProductionStartupBinding(ports));
  } finally {
    await dispose();
  }
});

test("darwin platform still requires the macOS Applications Folder APIs", async () => {
  const { module, dispose } = await loadModule();
  try {
    const { isInApplicationsFolder, moveToApplicationsFolder, ...appWithoutMacOnlyApis } = baseApp();
    const ports = {
      platform: "darwin",
      app: appWithoutMacOnlyApis,
      dialog: baseDialog(),
    };
    assert.throws(
      () => module.createProductionStartupBinding(ports),
      /isInApplicationsFolder/,
    );
  } finally {
    await dispose();
  }
});

test("win32 platform still requires APIs needed on every platform, such as setPath", async () => {
  const { module, dispose } = await loadModule();
  try {
    const { setPath, ...appWithoutSetPath } = baseApp();
    const ports = {
      platform: "win32",
      app: appWithoutSetPath,
      dialog: baseDialog(),
    };
    assert.throws(
      () => module.createProductionStartupBinding(ports),
      /setPath/,
    );
  } finally {
    await dispose();
  }
});
