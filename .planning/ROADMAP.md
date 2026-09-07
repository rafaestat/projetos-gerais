# Roadmap — Finanças da Casa

## Fase 1 — Leitura confiável da planilha ✅

Parsers tolerantes às convenções misturadas da planilha, três modos de leitura
(conta de serviço, link público, dados de exemplo) e detecção de cabeçalho por
nome de coluna. Coberto por testes.

## Fase 2 — As cinco telas ✅

Início, Extrato, Evolução, Futuro e Revisar; filtro único no topo (mês, regime,
transferências) valendo para todas as telas.

## Fase 3 — Uso real (próxima)

Conectar a planilha de verdade com conta de serviço, rodar um mês inteiro em
casa e ajustar o que aparecer:

- conferir os nomes reais das abas (`SHEET_TAB_*`) contra a planilha
- validar os totais do app contra a aba de resumo e explicar cada diferença
- decidir com a Laise o que falta na tela inicial

## Fase 4 — Ideias em espera

- Orçamento por categoria (teto mensal e quanto já foi gasto)
- Alerta de gasto fora do padrão para uma categoria
- Comparar o mês contra a média dos últimos três
- Instalável como PWA no celular
