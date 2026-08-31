// [FORK] Arquivo novo deste fork.
//
// Os scripts do upstream assumiam que as dependencias ficam sempre em
// <repoRoot>/node_modules, o que vale para um clone avulso. Dentro de um
// monorepo isso deixa de ser verdade: tanto o pnpm com nodeLinker hoisted
// quanto o npm workspaces hasteiam as dependencias para o node_modules da raiz
// do workspace, e <repoRoot>/node_modules passa a conter apenas .bin e links.
//
// Este resolvedor sobe a arvore a partir do repoRoot ate encontrar o
// node_modules que realmente contem o alvo -- a mesma busca que o Node faz para
// resolver um import. Num clone avulso o primeiro candidato ja e o certo, entao
// o comportamento original fica preservado. Se nada for encontrado, devolve o
// caminho original, para que a mensagem de erro continue apontando para onde o
// upstream esperava o arquivo.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Aceita tanto ("@electron", "asar") quanto ("node_modules/@electron/asar"),
// para que cada chamada no upstream vire uma substituicao de uma linha so.
function withoutNodeModulesPrefix(...segments) {
  const parts = path.join(...segments).split(path.sep).filter(Boolean);
  if (parts[0] === "node_modules") parts.shift();
  return path.join(...parts);
}

export function nodeModulesPath(...segments) {
  const relative = withoutNodeModulesPrefix(...segments);
  let current = repoRoot;
  for (;;) {
    const candidate = path.join(current, "node_modules", relative);
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return path.join(repoRoot, "node_modules", relative);
    current = parent;
  }
}
