# Log de sincronizacoes

Uma entrada por sync. Serve para responder "por que ainda estamos nesse commit?"
sem arqueologia, e para registrar commit deliberadamente excluido -- um revert ou
um skip e decisao, e decisao precisa de registro escrito (guia 7.3).

## 2026-08-30 -- fork inicial

- **De:** nada. **Para:** `a9f633e09d49a85829b8236331b9e21f7e612634`
- **Upstream:** arquivado (read-only) em 2026-08-23, sem tags, sem releases.
- **Conflitos:** nenhum, e um fork novo.
- **Decisoes tomadas:** ver `decisions/`.
- **Nenhum sync desde entao**, porque o upstream nao recebeu commits novos. O
  `upstream-watch.yml` roda semanalmente e abre issue se isso mudar.

## 2026-08-31 -- ensaio sintetico do procedimento de sync

Nao e um sync: o upstream nao mudou. E a prova de que o procedimento funciona
antes de precisarmos dele. Detalhes e resultado em `README.md`, secao "O
procedimento foi ensaiado". Resumo: `-X subtree=apps/desktop` redireciona
corretamente, so o arquivo com marca `[FORK]` conflita, e o `rerere` grava.
