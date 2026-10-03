# Alerta de Golpe no Pix — proposta baseada em evidência

Duas camadas de alerta para uma conta digital:

- **Camada 1 — risco ~1%:** confere rapidinho, sem travar quem é legítimo.
- **Camada 2 — risco ~10%:** quebra o transe com sinais do aparelho, perguntas que o golpista não consegue prever e saídas claras.

Protótipo navegável: [`prototipo.html`](prototipo.html). Prints do fluxo de referência em [`alerta-golpe/`](alerta-golpe/).

---

## 1. O problema no Brasil

- **39%** dos brasileiros foram vítimas ou sofreram tentativa de golpe financeiro em 2025, o maior índice desde 2021. Entre idosos, **44%** ([Febraban, via Seu Crédito Digital](https://seucreditodigital.com.br/golpes-em-contas-39-brasileiros-vitimas/)).
- Os golpes mais comuns são a **falsa central** (32%) e o **falso conhecido no WhatsApp** (31%). Nos dois, um golpista conduz a vítima em tempo real.
- As fraudes no Pix somaram **R$ 4,9 bi** em 2024, 70% a mais que no ano anterior ([WeLiveSecurity](https://welivesecurity.com/pt/golpes-fraudes/ia-e-engenharia-social-devem-tornar-golpes-com-pix-mais-sofisticados-em-2026)).
- O Banco Central está **padronizando uma tela de alerta de golpe** no Pix pelo Manual de Experiência do Usuário, com regras previstas para 2026 ([Folha PE](https://www.folhape.com.br/economia/bc-prepara-alerta-de-golpe-em-caso-de-transacao-suspeita-no-pix/449673/)). O **MED 2.0** é obrigatório desde fev/2026 ([Dock](https://dock.tech/fluid/blog/banking/med-2-0/)). A proposta precisa caber dentro dessa tela padrão.

## 2. O que a pesquisa diz

| Achado | Fonte | Implicação no design |
|---|---|---|
| **Botões de saída claros (cancelar, deixar pra depois, falar com o banco) reduziram em 81% os pagamentos a golpistas** quando combinados com alerta só para pagamentos de risco. Avisos "comportamentais" (aversão a perda, norma social) reduziram só 18% e **perderam efeito** a partir do 3º golpe. Já os botões de saída chegaram a −94%. Amostra de ~10 mil adultos do Reino Unido. | [Akesson, Gathergood & Quispe-Torreblanca, Univ. Nottingham / Open Banking UK, 2023](https://www.nottingham.ac.uk/cedex/documents/papers/cedex-discussion-paper-2023-08.pdf) | Investir em **saídas visíveis**, não em texto. Menos frase, mais botão. |
| Alertas só para pagamentos de risco **aumentaram em 8 p.p.** os pagamentos legítimos concluídos. Botões de saída em todo pagamento **reduziram em 14 p.p.** os legítimos. | Mesmo estudo | Atrito pesado **só na Camada 2**. A Camada 1 deixa "Pagar" como ação principal. |
| Alertas que **mudam de aparência** resistem à habituação, medida no cérebro por fMRI e em campo durante 3 semanas. | [Vance, Anderson et al., BYU — MIS Quarterly](https://misq.umn.edu/pub/skin/frontend/default/misq/pdf/V42I2/14124_RA_VanceJenkins.pdf) | **Alerta polimórfico**: a Camada 2 alterna visual e perguntas. |
| Avisos que se parecem com o resto do app viram ruído. **Romper a estética da marca** e fazer **perguntas específicas** cria uma pausa cognitiva. | [UK Finance / Thinks Insight — Effective Warnings](https://www.thinksinsight.com/blog/uk-finance-effective-warnings-research) | A Camada 2 **não é verde**. Perguntas concretas, nunca "você confia?". |
| Golpistas **ditam as respostas** dos questionários de propósito ("responde que é pra um conhecido"). O ombudsman inglês isenta o banco quando a vítima mente por orientação do golpista. | [Financial Ombudsman Service — decisões sobre a Revolut](https://www.financial-ombudsman.org.uk/decision/DRN-5949234.pdf) | Pergunta sozinha não basta: combinar com **sinais do aparelho**. |

## 3. Benchmarks

| Quem | O que faz | Resultado divulgado |
|---|---|---|
| **Google / Android** | Se você abre um app financeiro **compartilhando a tela numa ligação com número desconhecido**, aparece um alerta, uma **pausa de 30s** e um botão para **encerrar a ligação** | Piloto no Reino Unido, expandido para os EUA ([Android Authority](https://www.androidauthority.com/android-in-call-scam-protection-us-expansion-3621618)) |
| **Monzo** | **Call Status** no app: mostra se alguém do banco está mesmo falando com você. Se não está, diz "desligue agora" | Primeiro no Reino Unido ([Android Developers Blog](https://android-developers.googleblog.com/2024/03/battling-impersonation-scams-monzo-innovative-approach.html?hl=id)) |
| **CommBank** | **NameCheck** (confere o nome do favorecido) e **CallerCheck** (confirma no app que é o banco ligando) | Perdas com golpe **caíram pela metade** no ano fiscal de 2024; NameCheck evitou A$ 40 mi em golpes ([CommBank](https://commbank.com.au/articles/newsroom/2024/08/cba-cuts-scam-losses-for-customers.html)) |
| **Starling** | **Scam Intelligence**: o cliente manda print do anúncio ou da conversa e uma IA avalia o risco | A primeira versão **triplicou (+300%)** o cancelamento de pagamentos arriscados ([UKTN](https://www.uktech.news/ai/starling-bank-launches-ai-tool-to-combat-scams-20251028)) |
| **NAB** | Alerta em tempo real para pagamentos "fora do padrão" do cliente | **A$ 48,5 mi** em pagamentos abandonados em 2 meses ([NAB](https://www.nab.com.au/news/personal-finance/nab-payment-alerts-latest)) |
| **Revolut** | Questionário que identifica o tipo de golpe e avisa que "quem pede para esconder o motivo é golpista" | Driblado quando o golpista dita as respostas (ver acima) |
| **Nubank** | **Modo Rua**: limite menor fora do Wi-Fi de confiança | ([Money Times](https://www.moneytimes.com.br/nubank-nubr33-cria-funcao-para-evitar-golpe-do-pix-entenda/)) |
| **Itaú** (prints) | Categoria do Pix + texto livre + aviso genérico | O golpista dita a categoria e "Reconheço esse pix" passa sem esforço |

## 4. Princípios (derivados da evidência)

1. **Botão vale mais que texto.** Saídas como "Cancelar" e "Deixar pra depois" têm que estar visíveis e fáceis de tocar.
2. **Atrito proporcional ao risco.** Na Camada 1, pagar continua fácil. Na Camada 2, a ação principal é proteger.
3. **Sinal do aparelho antes de pergunta.** Ligação ativa e tela compartilhada não dependem do que a vítima responde.
4. **Perguntas que o golpista não consegue prever**, rotativas, sobre fatos: quem pediu, por qual canal, se pediram pressa ou segredo.
5. **Alerta polimórfico e fora da marca** na Camada 2, para não virar paisagem.
6. **Tempo como proteção.** "Agendar pra daqui 1h" desmonta a urgência sem negar o Pix.
7. **Ajuda ativa.** Mandar o print da conversa para análise, como faz a Starling.
8. **Texto mínimo.** Uma frase por tela, no tom do app.

## 5. Fluxo

### Camada 1 — risco ~1% · "Confere rapidinho"
- Mostra o **nome completo do favorecido, o banco e se é a primeira vez** que você paga essa pessoa (como o NameCheck).
- Faz **1 pergunta rotativa** ("Alguém tá te pedindo pra fazer isso agora?").
- Botões: **Pagar** (principal) · **Deixar pra amanhã** · **Cancelar**.
- Uma resposta de risco **sobe para a Camada 2**. Vibração curta, dupla.

### Camada 2 — risco ~10% · "Pare"
1. **Ligação ativa?** → "A gente não está te ligando." Botão para **desligar** e **30s de pausa** (como no Android).
2. **Tela polimórfica** (3 visuais que se alternam, fora da cor da marca) com vibração forte e repetida. Mensagem: "Se alguém te disse o que responder aqui, é golpe."
3. **2 perguntas de fato**: quem pediu e se pediram pressa ou segredo.
4. **Aviso sob medida** para o golpe provável: falsa central, falso conhecido ou falso vendedor.
5. Botões: **Cancelar Pix** (principal) · **Agendar pra daqui 1h** · **Mandar print pra análise** · "Pagar mesmo assim" (segurar 3s).

## 6. Como medir

- **A/B por camada** contra o fluxo atual.
- **Principal:** R$ de golpe evitado por 1.000 alertas e taxa de MED em 7 dias.
- **Guardrail:** % de Pix legítimos concluídos. O estudo mostra que botões de saída aplicados a tudo derrubam 14 p.p., por isso o atrito fica só no alto risco.
- **Habituação:** taxa de cancelamento na 1ª, 3ª e 5ª exposição ao alerta, comparando a versão polimórfica com a fixa.
- **Respostas ditadas:** se uma opção concentra as respostas nos golpes confirmados, ela está sendo ditada e precisa ser trocada.

## 7. Roadmap

1. **MVP:** Camada 1 com confirmação do favorecido, Camada 2 com botões de saída e agendamento, e o visual polimórfico.
2. **V2:** detecção de ligação e de tela compartilhada; status "a gente está te ligando?".
3. **V3:** análise de print por IA; ajuste de limites por perfil; alinhamento final com a tela padrão do Banco Central.
