# 0008 -- Suporte a Windows

**Data:** 2026-09-06 - **Status:** aceita, com a UI renderizando

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

Quatro escolhas sustentam isso:

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
4. **Exigir as APIs de Applications Folder só no macOS.** `createProductionStartupBinding`,
   em `source/electron-main/production-binding-providers.ts`, validava
   incondicionalmente que `electron.app.isInApplicationsFolder` e
   `electron.app.moveToApplicationsFolder` existem, mas as duas são
   exclusivas do macOS e isso derrubava o boot no Windows antes de criar
   janela. Não é afrouxamento: o único consumidor,
   `moveToApplicationsFolderIfNeeded` em
   `source/electron-main/startup/move-to-applications-folder.ts:19`, já
   retornava cedo fora do `darwin` e nunca chamava essas funções -- a
   pré-condição passou a espelhar o gate que já existia no ponto de uso. Esta
   escolha é de categoria diferente das três anteriores: é a primeira edição
   deste dossiê em `source/`, o código reconstruído do **produto**, e não em
   `scripts/`, a toolchain de build. Foi autorizada pontualmente pelo usuário
   para reavaliar depois -- ver "Estado alcançado" abaixo.

## Estado alcançado

**O build conclui no Windows.** As três primeiras correções acima destravam
`node scripts/build.mjs` de ponta a ponta -- o bloqueio `LNK1117` registrado
neste mesmo dossiê em uma investigação anterior está resolvido.

**Registro histórico (2026-09-06): o app inicializava e morria antes de criar
janela.** Rodando `node scripts/run-windows.mjs`, o processo Electron subia,
mas a saída terminava em:

```
[sand-electron-main] fatal composition failure: Error: Electron production binding requires electron.app.isInApplicationsFolder()..
```

A causa estava isolada em `source/electron-main/production-binding-providers.ts`,
função `createProductionStartupBinding` (por volta da linha 464-475), que
validava incondicionalmente que `ports.app.isInApplicationsFolder` e
`ports.app.moveToApplicationsFolder` existem como funções. Essas duas APIs são
**exclusivas do macOS** -- no Electron para Windows a propriedade nem existe
no objeto `app`, então a validação lançava antes de qualquer janela ser
criada. O uso real dessas APIs, em
`source/electron-main/startup/move-to-applications-folder.ts`, já estava
corretamente condicionado a `options.platform !== "darwin"`; o defeito era só
na checagem prévia de composição, que nunca tinha sido tornada
platform-aware. Não era o risco que a investigação anterior deste suporte
apontava como suspeito principal (`packages/shell-exec/sandbox/macos`) --
esse caminho nem chegava a ser exercitado antes da falha.

**Estado atual (2026-09-07): a UI renderiza.** A quarta escolha acima --
exigir `isInApplicationsFolder`/`moveToApplicationsFolder` só quando
`platform === "darwin"` -- foi implementada e destravou a janela. Rodando
`node scripts/run-windows.mjs`, o app abre a janela "Grok Bot" e renderiza a
tela de login. Confirmado via DevTools Protocol lendo o DOM do processo
renderer: `firstHeading: "Grok Bot"`, botão `"Sign in"`, e o texto `"Your team
of always-on agents that you can give real work to."`, todos carregados de
`.build/fidelity/app/dist/renderer/index.html`. Screenshot em
[`docs/fork/assets/grok-bot-windows-render.png`](../assets/grok-bot-windows-render.png).
Detalhe completo, incluindo por que a edição não é um afrouxamento, em
[`docs/fork/WINDOWS.md`](../WINDOWS.md).

O que isto **não** cobre: login de verdade (a tela renderiza, mas ninguém
autenticou), qualquer funcionalidade além da tela inicial, e o sandbox
(`packages/shell-exec/sandbox/macos`) continua sem contraparte Windows -- o
que depender dele só se mede exercitando essas funcionalidades, o que ainda
não aconteceu.

## Consequências

- **A superfície de diff cresceu de 9 para 11 arquivos do upstream editados**
  na leva de bootstrap/build, além de sete arquivos novos (scripts e
  testes) -- e agora mais uma edição pontual em `source/`
  (`production-binding-providers.ts`), de categoria diferente das demais
  porque toca o produto reconstruído, não a toolchain. O detalhe está em
  `docs/fork/CUSTOMIZATIONS.md`.
- Windows tem hoje um caminho de desenvolvimento completo -- instalar, lint,
  typecheck, testar, buildar -- e agora também um caminho de uso até a tela de
  login: o app mostra UI. `docs/fork/WINDOWS.md` documenta o estado exato e o
  que ainda não foi exercitado.
- **O sandbox continua sem contraparte.** `packages/shell-exec/sandbox/macos`
  é Seatbelt; nada disso foi exercitado, porque nenhuma funcionalidade além da
  tela inicial foi testada.
- **Se o Windows for abandonado**, o ponto de reversão é claro: os 11
  arquivos marcados `[FORK]` mais os sete novos, listados em
  `docs/fork/CUSTOMIZATIONS.md`, mais a edição em
  `production-binding-providers.ts`. Nenhum deles altera comportamento em
  `darwin`, então reverter é seguro a qualquer momento sem tocar o caminho
  macOS.
- Se alguém retomar isto, o próximo passo é exercitar login real e o restante
  da superfície do app -- inclusive qualquer caminho que dependa do sandbox --
  que esta tarefa não chegou a testar.
