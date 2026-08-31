#!/usr/bin/env bash
# [FORK] Varredura de marca do fork (GUIDE-FORK-WHITELABEL-UPSTREAM 5.4).
#
# MODO RELATORIO. A marca deste fork ainda e a do upstream, por decisao
# explicita e registrada em docs/fork/decisions. Enquanto for assim, este script
# NAO falha: ele inventaria tudo que carrega uma marca de terceiro, para que a
# renomeacao futura seja uma lista finita em vez de uma cacada.
#
# Quando a marca mudar, troque REPORT_ONLY para 0 e o script passa a falhar
# enquanto sobrar qualquer ocorrencia -- e vira um passo bloqueante do CI.
#
# O que uma busca por texto NUNCA vai achar, e que a renomeacao tera de tratar
# a mao: icones e imagens (apps/desktop/docs/assets/), o CFBundleDisplayName do
# app empacotado, e o renderer compilado em src/app/dist, que e binario da
# Anysphere e nao muda de marca por edicao nossa.
set -uo pipefail

REPORT_ONLY="${BRAND_SWEEP_REPORT_ONLY:-1}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

# Arquivos que DEVEM manter o nome do upstream: licenca, atribuicao e
# proveniencia. Remove-los de la seria apagar a origem, nao rebatizar o produto.
excluded=(
  ':(exclude)ATTRIBUTION.md'
  ':(exclude)apps/desktop/NOTICE.md'
  ':(exclude)apps/desktop/PROVENANCE.md'
  ':(exclude)apps/desktop/SECURITY.md'
  ':(exclude)apps/desktop/research-archives'
  ':(exclude)packages/brand/brand.config.mjs'
  ':(exclude)scripts/brand-sweep.sh'
  ':(exclude)pnpm-lock.yaml'
)

marks='Grok Bot|GrokBot|grokbot|Anysphere|anysphere|downloads\.cursor\.com'

echo "== varredura de marca =="
echo "raiz: $root"
echo "padroes: $marks"
echo

matches="$(git grep -InE "$marks" -- . "${excluded[@]}" || true)"

if [ -z "$matches" ]; then
  echo "Nenhuma ocorrencia fora dos arquivos de atribuicao."
  exit 0
fi

echo "$matches" | awk -F: '{print $1}' | sort | uniq -c | sort -rn
echo
echo "total de linhas: $(echo "$matches" | wc -l)"
echo "total de arquivos: $(echo "$matches" | awk -F: '{print $1}' | sort -u | wc -l)"
echo
echo "Alvos que nenhuma busca por texto encontra:"
echo "  - apps/desktop/docs/assets/ (imagens)"
echo "  - CFBundleDisplayName do .app empacotado"
echo "  - apps/desktop/src/app/dist (renderer compilado da Anysphere)"

if [ "$REPORT_ONLY" = "1" ]; then
  echo
  echo "Modo relatorio: nao falha. Defina BRAND_SWEEP_REPORT_ONLY=0 ao renomear."
  exit 0
fi

echo
echo "FALHA: ainda ha marca do upstream fora dos arquivos de atribuicao."
exit 1
