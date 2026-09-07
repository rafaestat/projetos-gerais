# Notas sobre a planilha (fonte da verdade)

Levantado em 2026-09-07 lendo a planilha
`1M5g_V8PXcmfsyL4QLs625TfdBkGy4mrK10h0OOzRc-Y` inteira.

O app foi escrito para **conviver** com tudo isto sem quebrar — nada aqui
impede o uso. Mas são pontos que, arrumados na origem, deixam a planilha mais
confiável para qualquer coisa que a leia (o app, a Laise, uma fórmula futura).

## 1. A aba de resumo conta transferência como receita

A linha `Receita` soma ~R$ 589 mil em nove meses. Boa parte disso é resgate de
cofrinho/CDB e transferência entre contas — dinheiro que já era da casa e só
mudou de lugar. Contado como receita, ele infla o topo; e a mesma quantia sai
de novo do outro lado, inflando a despesa.

**Como o app trata:** recalcula tudo a partir da aba de transações e deixa as
categorias de tipo `Neutro` fora de receitas e despesas, mostrando o total
delas à parte. O botão *Mostrar transferências* reexibe quando você quiser
conferir.

**Na planilha:** vale checar se a linha `Receita` do resumo deveria excluir os
lançamentos de categoria `Saldo`.

## 2. Três linhas diferentes chamadas "Saldo"

Na aba de resumo, `Saldo` aparece duas vezes (uma logo depois de `Lazer`, outra
depois de `Outros`) e ainda existe a categoria `Saldo` na aba de categorias.
Um nome, três significados: categoria de transferência, subtotal parcial e
subtotal geral. Qualquer leitura automática — e qualquer leitura humana
apressada — erra aqui.

**Sugestão:** renomear os subtotais para `Subtotal despesas` e
`Resultado do mês`, deixando `Saldo` só para a categoria.

Os totais das três linhas também não fecham entre si
(−R$ 398.922,56, −R$ 44.360,74 e −R$ 152.491,52 na coluna Total), o que reforça
que são coisas diferentes com o mesmo rótulo.

## 3. Categoria "Saldo" duplicada na aba de categorias

Existe uma segunda linha `Saldo` com `Descricao_Padrao` e `Tipo` vazios. O app
ignora a duplicata vazia e fica com a primeira, mas a linha extra pode fazer um
`PROCV`/`XLOOKUP` cair na versão sem tipo.

## 4. Colunas trocadas na aba de arquivos processados

A partir da linha do `Santander_Fatura_032026.pdf`, o conteúdo de
`Nome_Arquivo` e `ID_Drive` está invertido — o ID do Drive está na coluna do
nome e vice-versa. As linhas anteriores estão certas. Só afeta rastreabilidade,
não os números.

## 5. `#VALUE!` no painel

A aba de painel mostra `#VALUE!` e os três totais (Receitas, Gastos, Saldo)
zerados em R$ 0,00 — a fórmula está quebrada. O app não depende dessa aba, mas
quem abrir a planilha vê zero e pode achar que perdeu os dados.

## 6. Sobras de dados em colunas soltas

Na aba de termos aprendidos há conteúdo perdido nas colunas F–H
(`1223`, `Pix enviado - Ana Carolina...`, `1000`), fora de qualquer cabeçalho.
Parece resto de um teste.

## 7. Formatos que convivem

Nada disso é erro, mas exige que quem lê aceite as duas formas — o app aceita:

| Campo | Formas encontradas |
|---|---|
| `Valor` | `-R$ 15.19` (ponto) na aba de transações, `-R$399,08` (vírgula) nos resumos |
| `Competencia` | `2026-04` e `2026-04-01` |
| `Parcela` | `8/10` e `08/08` |
| `Origem` | `PICPAY_CARTAO/CONTA` (barra) além dos valores simples |

Padronizar ajuda, mas a leitura do app já não depende disso.
