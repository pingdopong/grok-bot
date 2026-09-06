# 0008 -- Suporte a Windows

**Data:** 2026-09-06 - **Status:** aceita, com o app ainda não renderizando

## Contexto

O upstream suporta um alvo só, macOS arm64. Mas a Anysphere distribuiu o 0.18.0
também para Windows x64, e o código reconstruído preservou os ramos de
plataforma do original: `local-exec-native.ts` já consulta processos via
`Get-CimInstance Win32_Process`, o `box-exec-daemon` já tem guardas
`!== "win32"`, e de 1722 arquivos em `source/` um único diretório é
exclusivamente macOS (`packages/shell-exec/sandbox/macos`). O que era
macOS-only era a toolchain de reconstrução que este fork herdou, não o
produto.

## Decisão

Suportar Windows x64 para **execução**, não para empacotamento. O bundle
`.app`, o `codesign` e a notarização continuam macOS-only, e é neles que mora
toda a dependência de plataforma que este fork não tenta remover.

Três escolhas sustentam isso:

1. **Duas identidades fixadas, não uma trocada.** O instalador NSIS e o
   `app.asar` do Windows ganharam um `expectedSha256` próprio, ao lado do
   macOS, que continua intacto. Nenhuma verificação foi afrouxada para
   acomodar a segunda plataforma.
2. **Não compilar tree-sitter de ABI Node no Windows.** `stageNodeTreeSitterRuntime`
   agora tem uma guarda de `win32` em vez de compilar contra o `link.exe` da
   Microsoft, que rejeita as flags que o `lld` do Node 26 produz
   (`LNK1117`). A justificativa é que `ELECTRON_RUN_AS_NODE=1` preserva
   `process.versions.electron`, então o processo empacotado resolve
   `dist/deps` -- que já vem compilado no instalador -- em vez de precisar de
   um `dist/node-deps` reconstruído localmente. Estagiar o ABI errado seria
   pior do que não estagiar nada.
3. **Rodar sem empacotar.** `scripts/run-windows.mjs` aponta o Electron
   provisionado direto para o diretório que `build.mjs` monta, sem produzir
   instalador nem bundle. É o mesmo raciocínio da Decisão 1 do ADR 0007:
   resolver o suficiente para executar, sem herdar a maquinaria de
   empacotamento que só faz sentido em macOS.

## Estado alcançado

**O build conclui no Windows.** As três correções acima destravam
`node scripts/build.mjs` de ponta a ponta -- o bloqueio `LNK1117` registrado
neste mesmo dossiê em uma investigação anterior está resolvido.

**O app inicializa e morre antes de criar janela.** Rodando
`node scripts/run-windows.mjs`, o processo Electron sobe, mas a saída termina
em:

```
[sand-electron-main] fatal composition failure: Error: Electron production binding requires electron.app.isInApplicationsFolder()..
```

A causa está isolada: `source/electron-main/production-binding-providers.ts`,
função `createProductionStartupBinding` (por volta da linha 464-475), valida
incondicionalmente que `ports.app.isInApplicationsFolder` e
`ports.app.moveToApplicationsFolder` existem como funções. Essas duas APIs são
**exclusivas do macOS** -- no Electron para Windows a propriedade nem existe
no objeto `app`, então a validação lança antes de qualquer janela ser criada.
O uso real dessas APIs, em
`source/electron-main/startup/move-to-applications-folder.ts`, já está
corretamente condicionado a `options.platform !== "darwin"`; o defeito é só
na checagem prévia de composição, que nunca foi tornada platform-aware.

Não é o risco que a investigação anterior deste suporte apontava como suspeito
principal (`packages/shell-exec/sandbox/macos`) -- esse caminho nem chega a
ser exercitado antes da falha.

**O próximo passo é conhecido e não foi feito.** Tornar
`createProductionStartupBinding` ciente de plataforma -- pular a exigência de
`isInApplicationsFolder`/`moveToApplicationsFolder` fora do `darwin`, do
mesmo jeito que `moveToApplicationsFolderIfNeeded` já faz -- resolveria o
bloqueio. Mas isso é edição em `source/`, o código reconstruído do
**produto**, categoria diferente de editar scripts de build: os scripts são
ferramenta deste fork, `source/` é a reconstrução que o dossiê inteiro trata
como superfície a tocar o mínimo possível. Por isso fica registrado aqui como
decisão pendente, e não como trabalho desta tarefa.

## Consequências

- **A superfície de diff cresceu de 9 para 11 arquivos do upstream editados**,
  além de sete arquivos novos (scripts e testes). O detalhe está em
  `docs/fork/CUSTOMIZATIONS.md`.
- Windows tem hoje um caminho de desenvolvimento completo -- instalar, lint,
  typecheck, testar, buildar -- mas não um caminho de uso: o app não chega a
  mostrar UI. `docs/fork/WINDOWS.md` documenta o estado exato e o próximo
  passo.
- **O sandbox continua sem contraparte.** `packages/shell-exec/sandbox/macos`
  é Seatbelt; nada disso foi exercitado, porque o processo morre antes de
  qualquer funcionalidade rodar.
- **Se o Windows for abandonado**, o ponto de reversão é claro: os 11
  arquivos marcados `[FORK]` mais os sete novos, listados em
  `docs/fork/CUSTOMIZATIONS.md`. Nenhum deles altera comportamento em
  `darwin`, então reverter é seguro a qualquer momento sem tocar o caminho
  macOS.
- Se alguém retomar isto, o próximo passo é a correção pendente acima em
  `production-binding-providers.ts`, seguida de exercitar renderização,
  autenticação e o restante da superfície que esta tarefa não chegou a
  testar.
