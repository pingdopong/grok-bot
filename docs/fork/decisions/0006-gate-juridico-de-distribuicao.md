# 0006 -- Gate juridico de distribuicao

**Data:** 2026-08-30 - **Status:** aceita - **bloqueante**

## Contexto

Este e o fato que molda o projeto inteiro, e nao e opiniao de engenharia -- esta
escrito nos arquivos do proprio upstream.

O `NOTICE.md` do upstream diz que **nenhuma licenca de codigo-fonte e concedida**
e que quem publicar ou distribuir deve revisar por conta propria direitos
autorais, marcas, dependencias de terceiros e termos de servico. O
`PROVENANCE.md` registra que o projeto e reconstrucao do aplicativo proprietario
Grok Bot 0.18.0 da Anysphere, feita a partir do binario publicamente distribuido.

E ha um fato tecnico que o white-label nao resolve: o `bootstrap` baixa o DMG
oficial e hidrata `src/app/dist` com o **renderer compilado da Anysphere**. O
artefato final e hibrido por construcao. Trocar a marca muda o nome, nao o
conteudo.

## Decisao

Toda a infraestrutura ate o empacotamento e construida. **Distribuir, nao.**

Fora do escopo ate haver decisao com apoio juridico:

- workflow de release que publique instaladores;
- assinatura ou notarizacao com certificado da pingdopong;
- pagina ou material que ofereca o app para download.

O `package-macos.yml` e `workflow_dispatch` apenas, sem publish, e retem o
resultado como artefato do Actions. O `README.md` da raiz documenta **como
construir localmente**; nao oferece binario.

## O unico caminho que remove a dependencia

Terminar o `frontend/` -- a reconstrucao React legivel que o upstream deixou
parcial -- e substituir o renderer fixado. E projeto proprio, do tamanho do que o
README do upstream chama de "separate, much larger reverse-engineering project".
Esta fora do escopo atual, mas e o que separa "fork rebatizado" de produto
proprio.

## Consequencias

- Nenhum artefato sai deste repositorio sem revisao juridica explicita.
- O bundle identifier saiu do namespace `com.anysphere.*`, o que e correcao de
  identidade, nao de licenca. Nao muda nada nesta decisao.
