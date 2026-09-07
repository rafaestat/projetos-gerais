# Finanças da Casa

Painel estilo GuiaBolso para o orçamento da família, lendo **direto da planilha
do Google que já é a fonte da verdade** — o app não guarda dados próprios, não
tem banco e não altera nada na planilha. Ele só lê, entende e mostra.

- **Início** — quanto sobrou (ou faltou) no mês, receitas x despesas e o
  ranking de para onde o dinheiro foi.
- **Extrato** — todos os lançamentos do mês, com busca em todo o histórico.
- **Evolução** — mês a mês: receitas x despesas e a sobra de cada mês.
- **Futuro** — o que já está comprometido nas próximas competências (parcelas).
- **Revisar** — o que a planilha ainda não classificou, e os avisos da leitura.

Feito para celular primeiro (a família consulta no telefone), com modo claro e
escuro, tudo em português.

## Rodando

```bash
npm install
cp .env.example .env.local   # e preencha
npm run dev                  # http://localhost:3000
```

Sem nenhuma configuração o app sobe em **modo demonstração**
(`SHEETS_MODE=fixture`), com dados de exemplo em `src/fixtures/` — números
inventados, nada da família real. Serve para ver a cara do app antes de
conectar a planilha.

Para validar tudo antes de subir uma mudança:

```bash
npm run verificar    # typecheck + lint + testes + build
```

## Conectando a planilha

### Opção A — conta de serviço (recomendada, funciona com planilha privada)

1. No [Google Cloud Console](https://console.cloud.google.com), crie um projeto
   e ative a **Google Sheets API**.
2. Crie uma **conta de serviço** e gere uma chave JSON.
3. Na planilha, clique em *Compartilhar* e dê acesso de **leitor** ao e-mail da
   conta de serviço (algo como `nome@projeto.iam.gserviceaccount.com`).
4. No `.env.local`:

```bash
SHEETS_MODE=api
SHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account", ...}
```

A planilha continua privada. Nada é compartilhado publicamente.

### Opção B — link público (mais simples, menos privado)

Compartilhe a planilha como *"qualquer pessoa com o link pode ver"* e use:

```bash
SHEETS_MODE=public
SHEET_ID=...
```

Qualquer pessoa que descobrir o ID da planilha vê os dados. Para finanças da
família, prefira a opção A.

### Nome das abas

`SHEET_TAB_TRANSACOES` e `SHEET_TAB_CATEGORIAS` aceitam o nome da aba ou
`gid:123456` — o número que aparece na URL quando você clica na aba. O `gid` é
mais confiável quando o nome tem acento, espaço ou muda com o tempo.

## O que o app espera da planilha

**Aba de transações** — as colunas são encontradas pelo cabeçalho, em qualquer
ordem, e a linha de cabeçalho pode não ser a primeira:

| Coluna | Obrigatória | Observação |
|---|---|---|
| `ID_Hash` | não | usada para não contar a mesma linha duas vezes |
| `Data` | sim* | `2026-08-30` ou `30/08/2026` |
| `Competencia` | sim* | `2026-04` ou `2026-04-01` — o mês da fatura |
| `Descricao` | sim | |
| `Valor` | sim | negativo = saída; aceita `-R$ 15.19` e `-R$ 15,19` |
| `Parcela` | não | `8/10` ou `08/10` |
| `Origem` | não | `PICPAY_CARTAO`, `PICPAY_CONTA`, ... |
| `Categoria` | sim | tem que bater com a aba de categorias |
| `Status` | não | diferente de `CONFIRMADO` cai na tela Revisar |
| `Obs` | não | |

\* basta uma das duas: faltando a competência, o app usa a data, e vice-versa.

**Aba de categorias** — `Categoria`, `Descricao_Padrao`, `Tipo`, onde `Tipo` é
`Entrada`, `Despesa Fixa`, `Despesa Variável`, `Neutro` ou `Pendente`.

## Duas decisões que mudam os números

**1. Transferências não são despesa.** Categorias de tipo `Neutro` — pagamento
de fatura, cofrinho, CDB, transferência entre contas — são dinheiro que só
mudou de lugar dentro de casa. Contá-las infla receita e despesa ao mesmo
tempo. O app as deixa de fora por padrão e mostra o total delas à parte; o
botão *Mostrar transferências* traz elas de volta quando você quiser conferir.

**2. Competência x caixa.** Por padrão o app agrupa pelo mês da **competência**
(quando o gasto pesa no orçamento — a parcela 8/10 pesa no mês dela, não no dia
da compra). O botão *Caixa* reagrupa pela data do lançamento. Os dois recortes
respondem perguntas diferentes e ambos estão a um clique.

## Publicando

O app é um Next.js comum: `npm run build && npm start`, ou deploy na Vercel
apontando para a pasta `financas-familia/`. As variáveis do `.env.example`
viram variáveis de ambiente do projeto.

**Se publicar na internet, defina `APP_PASSWORD`.** Com ela, o app pede uma
senha combinada em casa antes de mostrar qualquer número; sem ela, qualquer um
com a URL vê o orçamento da família.

## Estrutura

```
src/lib/         csv, parsers, leitura da planilha, agregações  (testado)
src/components/  cartões, listas e os gráficos em SVG
src/app/         as cinco telas + rotas de API
src/fixtures/    dados de exemplo do modo demonstração
tests/           vitest — parsers e agregações
```

Os gráficos são SVG escritos à mão, sem biblioteca: paleta validada para
contraste e daltonismo, marcas finas, rótulos seletivos e uma tabela
equivalente embaixo de cada gráfico (*"Ver como tabela"*), para que nenhum
valor dependa só de cor ou de passar o mouse.
