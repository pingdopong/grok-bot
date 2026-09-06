// [FORK] Arquivo novo deste fork.
//
// O upstream invoca o node-gyp pelo shim de plataforma: `node-gyp` no POSIX,
// `node-gyp.cmd` no Windows. Desde a correcao de seguranca do Node para
// CVE-2024-27980, `spawn` de um `.cmd` sem `shell: true` falha com EINVAL, e
// era exatamente ai que o build parava no Windows.
//
// A saida obvia seria `shell: true`, mas isso troca um problema por outro: com
// shell o Node passa os argumentos como string para o cmd.exe sem citar, e
// qualquer caminho com espaco quebra -- e estes caminhos sao de diretorios de
// build, que costumam ter espaco.
//
// Em vez disso invocamos o entrypoint JS do proprio node-gyp com o Node que ja
// esta rodando. Sem shim, sem shell, sem quoting: funciona igual nas tres
// plataformas e elimina a diferenca em vez de ramifica-la.

import { nodeModulesPath } from "./node-modules.mjs";

/**
 * @param {string[]} args argumentos do node-gyp, ex.: ["rebuild", "--release"]
 * @returns {{ command: string, args: string[] }} pronto para `spawn`.
 */
export function nodeGypInvocation(args) {
  return {
    command: process.execPath,
    args: [nodeModulesPath("node-gyp", "bin", "node-gyp.js"), ...args],
  };
}
