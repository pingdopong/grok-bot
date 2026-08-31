import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { capture, run } from "./lib/process.mjs";
import { repoRoot } from "./lib/config.mjs";

const git = "/usr/bin/git";
const tar = "/usr/bin/tar";
const scratch = await mkdtemp(path.join(os.tmpdir(), "grok-bot-publication-"));
const archive = path.join(scratch, "repository.tar");
const exported = path.join(scratch, "exported");

try {
  await run(git, ["archive", "--format=tar", `--output=${archive}`, "HEAD"], { cwd: repoRoot });
  await mkdir(exported);
  await run(tar, ["-xf", archive, "-C", exported]);
  await run(git, ["init", "--quiet"], { cwd: exported });
  await run(git, ["add", "--all"], { cwd: exported });

  const [sourceTree, exportedTree, sourceFiles, exportedFiles] = await Promise.all([
    // [FORK] "HEAD:./" e a arvore do diretorio atual; "HEAD^{tree}" e sempre a
    // arvore da RAIZ do repositorio. Num clone avulso os dois sao identicos,
    // mas neste monorepo o repoRoot e apps/desktop: o git archive e o ls-tree
    // acima sao relativos ao diretorio, entao comparar com a arvore da raiz
    // falharia sempre, com as listas de arquivos batendo e os hashes nao.
    capture(git, ["rev-parse", "HEAD:./"], { cwd: repoRoot }),
    capture(git, ["write-tree"], { cwd: exported }),
    capture(git, ["ls-tree", "-r", "--name-only", "HEAD"], { cwd: repoRoot }),
    capture(git, ["ls-files"], { cwd: exported }),
  ]);
  if (sourceTree !== exportedTree) {
    const sourceSet = new Set(sourceFiles.split("\n").filter(Boolean));
    const exportedSet = new Set(exportedFiles.split("\n").filter(Boolean));
    const omitted = [...sourceSet].filter(file => !exportedSet.has(file));
    const unexpected = [...exportedSet].filter(file => !sourceSet.has(file));
    throw new Error(`Fresh publication export changed the tracked tree. Omitted: ${omitted.slice(0, 20).join(", ") || "none"}. Unexpected: ${unexpected.slice(0, 20).join(", ") || "none"}.`);
  }

  const ignoredSource = "frontend/src/recovered/ui/sand-form-primitives.css";
  if (!(await readFile(path.join(exported, ignoredSource))).byteLength) {
    throw new Error(`Fresh publication export omitted ${ignoredSource}`);
  }
  console.log(`Publication export preserves ${sourceFiles.split("\n").filter(Boolean).length} files and tree ${sourceTree}.`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
