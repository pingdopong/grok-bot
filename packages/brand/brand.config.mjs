// [FORK] Manifesto de marca deste fork.
//
// Concentra em um unico lugar todo valor dependente de marca, para que
// renomear o produto seja uma edicao aqui e nao uma varredura pela arvore
// inteira (GUIDE-FORK-WHITELABEL-UPSTREAM 5.1). O upstream ja deixava esses
// valores juntos em scripts/lib/config.mjs, entao a intrusao ficou em uma linha
// naquele arquivo.
//
// ESTADO ATUAL: a marca segue sendo a do upstream, por decisao explicita. O que
// mudou foi apenas o bundle identifier, que estava sob com.anysphere.* -- um
// namespace reverse-DNS que nao e nosso. Trocar isso nao exige escolher marca
// nenhuma e remove uma reivindicacao de identidade indevida.
//
// Ao renomear de fato, mude os valores abaixo e rode scripts/brand-sweep.sh:
// ele lista tudo que ainda carrega o nome do upstream e precisa mudar junto,
// inclusive strings de runtime e assets binarios que nenhuma busca por texto
// encontra sozinha.
//
// ESM .mjs porque scripts/ do upstream e ESM puro, sem bundler, e este manifesto
// e consumido em tempo de build -- nao entra no ASAR do aplicativo.

export const brand = {
  // Nome de exibicao do aplicativo empacotado (CFBundleDisplayName / .app).
  productName: "Grok Bot 0.18 Reconstructed",

  // Identificador do bundle macOS. Fora do namespace da Anysphere.
  bundleId: "com.pingdopong.grokbot.reconstructed",

  // Nome da build de desenvolvimento. Preservado como no upstream.
  devProductName: "Grok Bot 0.18 Dev",

  // Variante de fidelidade usada pelo diagnostico de empacotamento.
  fidelityProductName: "Grok Bot 0.18 Fidelity",
  fidelityBundleId: "com.pingdopong.grokbot.reconstructed.fidelity",

  // Organizacao responsavel por esta build. Nao e o autor do upstream.
  vendor: "Ping do Pong",

  // Marcas de terceiros que aparecem no codigo reconstruido e que uma
  // renomeacao futura tera de tratar. Consumido por scripts/brand-sweep.sh.
  upstreamMarks: ["Grok Bot", "GrokBot", "grokbot", "Anysphere", "anysphere", "Cursor"],
};

export default brand;
