# Finanças da Casa

## What This Is

Um app web para a família olhar as finanças da casa no estilo GuiaBolso: quanto
entrou, quanto saiu, para onde o dinheiro foi e o que já está comprometido nos
próximos meses. Quem usa é o Rafael e a Laise, quase sempre pelo celular.

## Core Value

A planilha do Google continua sendo a fonte da verdade — o app só lê, entende e
mostra; se ele sumir amanhã, nenhum dado se perde.

## Requirements

### Validated

(Nada ainda — a validação vem do uso em casa.)

### Active

- [x] Ler a planilha do Google (`1M5g_V8...`) sem copiar nem alterar dados
- [x] Visão do mês: saldo, receitas, despesas e comparação com o mês anterior
- [x] Gastos por categoria, com clique para o extrato daquela categoria
- [x] Extrato do mês com busca em todo o histórico
- [x] Evolução mês a mês (receitas x despesas e sobra mensal)
- [x] Compromissos futuros: parcelas já contratadas por competência
- [x] Tela de revisão: lançamentos sem categoria, não confirmados e avisos de leitura
- [x] Separar lançamentos "Neutros" (transferência, fatura, cofrinho) dos totais
- [x] Alternar entre regime de competência e de caixa
- [x] Senha compartilhada opcional para publicar na internet
- [ ] Uso real por um ciclo mensal completo, com a Laise junto

### Out of Scope

- Escrever de volta na planilha — a rotina `/atualizar-orcamento` já faz isso;
  dois donos da escrita é receita de conflito.
- Importar fatura/extrato direto no app — mesma razão: o pipeline de ingestão
  já existe fora daqui.
- Banco de dados próprio ou cache persistente — duplicaria a fonte da verdade.
- Open Finance / integração bancária direta — custo e risco altos para o ganho.
- Multiusuário com contas separadas — é uma casa, não um produto.

## Context

- A planilha já é alimentada pela rotina `/atualizar-orcamento` (faturas PicPay
  em PDF, extratos CSV, prints), com abas de transações, categorias, termos
  aprendidos e arquivos processados.
- A planilha tem convenções que convivem: valores em `-R$ 15.19` e `-R$399,08`,
  competência em `2026-04` e `2026-04-01`, parcelas `8/10` e `08/08`. Toda a
  leitura precisa aceitar as duas formas.
- A aba de resumo da planilha soma transferências e resgates como receita, o
  que infla os totais. O app recalcula a partir das transações, sem esse viés.

## Constraints

- **Tech stack**: Next.js + TypeScript — SSR resolve o CORS do Google Sheets e
  mantém as credenciais fora do navegador.
- **Privacidade**: são dados financeiros da família; nada de dado real no repo,
  e senha obrigatória se o app for publicado.
- **Dependências**: nenhuma biblioteca de gráfico ou de Google API — menos
  superfície para manter e para auditar.
- **Dispositivo**: celular primeiro; o desktop é o caso secundário.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Só leitura da planilha | Uma única fonte de escrita evita conflito com a rotina existente | — Pendente |
| Ignorar categorias "Neutro" nos totais | Transferência não é despesa nem receita; contá-la duplica o dinheiro | — Pendente |
| Competência como padrão, caixa como opção | A parcela pesa no mês dela; mas conferir extrato exige o recorte de caixa | — Pendente |
| Gráficos em SVG à mão | Controle total de contraste/daltonismo e zero dependência | — Pendente |
| Três modos de leitura (api/public/fixture) | Roda sem credencial, com link público ou com planilha privada | — Pendente |

---
*Last updated: 2026-09-07 after a fase inicial (MVP)*
