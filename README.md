# Alerta de Golpe Transacional (Pix) — duas camadas que quebram o transe

Proposta de produto para o alerta de golpe de uma conta digital, com duas intensidades:

- **Camada 1 — risco ~1%:** "Pausa consciente" (atrito leve, ~10–15s).
- **Camada 2 — risco ~10%:** "Pare. Respire. Confirme." (atrito forte, com atraso e verificação por fora).

Referência conceitual: *fricção benéfica* / "speed bumps" cognitivos — exigir ação deliberada em vez de um clique tira o cérebro do piloto automático ([MIT Sloan](https://mitsloan.mit.edu/ideas-made-to-matter/to-help-improve-accuracy-generative-ai-add-speed-bumps)).

---

## 1. Diagnóstico do fluxo de referência

Prints em [`alerta-golpe/`](alerta-golpe/).

| Tela | Problema |
|---|---|
| **Lista de categorias** ([ref-01](alerta-golpe/ref-01-categorias.jpg)) | O golpista no telefone dita: *"clica em Pix para um conhecido"*. Opções sempre na mesma ordem dá para ensinar a vítima a passar por elas. |
| **Campo livre** ([ref-02](alerta-golpe/ref-02-justificativa.jpg)) | "Reconheço esse pix" passa com 19 caracteres. Justificativa genérica = piloto automático. |
| **"Analise o Pix antes de continuar"** ([ref-03](alerta-golpe/ref-03-analise.jpg)) | Botão laranja em destaque é **continuar**; "Não quero transferir" fica secundário. Aviso genérico, não ligado à situação. |

**Causa raiz:** a vítima não decide sozinha — alguém está conduzindo (ligação, WhatsApp, "central do banco"). Para quebrar o transe, a tela precisa **falar com quem está do lado de cá e expor quem está do lado de lá**. Mais cliques, sozinhos, não resolvem.

## 2. Princípios de design

1. **Nomear a manipulação** (*prebunking*): "Se alguém mandou você escolher uma opção nesta tela, é golpe."
2. **Perguntas sobre fatos, não opinião.** Em vez de "você confia?", "você falou com essa pessoa **por voz**, em um número que **já estava salvo**?"
3. **Respostas que o golpista não consegue ditar.** Perguntas e ordem das opções variam; pedir dados que só a vítima tem.
4. **Inverter a hierarquia dos botões.** Botão principal = proteger. Continuar = secundário e com gesto deliberado.
5. **Tempo é o melhor remédio.** O transe depende de urgência; alguns minutos de atraso desmontam o golpe.
6. **Respeitar a maioria legítima.** Na faixa de 10%, 9 em 10 Pix são legítimos; na de 1%, 99 em 100. Atrito proporcional ao risco.

## 3. Camada 1 — risco ~1% ("Pausa consciente")

**Objetivo:** 10–15s de reflexão ativa, baixo impacto na conversão.

```
⏸  Antes de enviar R$ 1.500 para Gabriel C. Souza

Responda com sinceridade (ninguém do banco vai te ligar para pedir isso):

  Alguém está falando com você AGORA enquanto você faz este Pix?
     [ Sim ]   [ Não ]

  Você já mandou Pix para essa pessoa antes?
     [ Sim ]   [ Não, é a primeira vez ]

  [ Cancelar e revisar ]      ← botão principal
  Continuar mesmo assim       ← link discreto, segurar 2s
```

- Perguntas sorteadas de um banco de ~15, ligadas ao contexto (destinatário novo, valor fora do padrão, horário incomum).
- **Resposta de alerta** (está em ligação, primeira vez, pediram sigilo) → escala para a Camada 2.
- **Segurar para confirmar** em vez de toque simples.
- **Sem campo livre** nesta camada — custo cognitivo não compensa para 99% legítimos.

## 4. Camada 2 — risco ~10% ("Pare. Respire. Confirme.")

### Passo 1 — Interrupção que nomeia o golpe
Tela cheia, fundo escuro, texto conforme o padrão detectado pelo modelo de risco:

> **Pare um segundo. Esse Pix tem o mesmo padrão de golpes que estão acontecendo agora.**
>
> Golpistas costumam dizer:
> - *"Não desliga, o banco vai te fazer umas perguntas, responde que é pra um conhecido."*
> - *"É urgente, depois eu te explico."*
>
> **Se alguém te disse o que responder nesta tela, isso é golpe.**

### Passo 2 — Perguntas específicas, sem resposta pronta
- "Como você recebeu esse pedido?" → WhatsApp / Ligação / SMS / Pessoalmente (ordem embaralhada).
- "Você **ouviu a voz** dessa pessoa em um número que **já estava salvo** no seu celular?"
- **Texto livre dirigido:** *"Escreva com suas palavras para que é esse dinheiro e como você conhece o Gabriel."* Mínimo ~40 caracteres; NLP sinaliza respostas genéricas ("reconheço", "é meu amigo") e marcas de roteiro (urgência, sigilo, "central", "advogado").

### Passo 3 — Sinais do aparelho
- **Ligação ativa detectada** (iOS CallKit / Android TelephonyManager): "Você está em uma ligação. **Desligue para continuar.**" — corta o canal do golpista.
- Compartilhamento de tela ou app de acesso remoto ativo → bloqueio imediato.

### Passo 4 — Tempo e verificação por fora
- **Atraso obrigatório** (ex.: 30 min): "Seu Pix foi agendado para 18:15. Você pode cancelar até lá." Base regulatória: **bloqueio cautelar** do Banco Central (até 72h).
- Botão **"Ligar para [nome] no número salvo"** — abre os contatos do celular, nunca um número vindo do app.
- **Guardião (opt-in):** contato de confiança cadastrado previamente recebe notificação e pode aprovar. Especialmente útil para idosos.

### Passo 5 — Confirmação final
- Botão principal: **"Não quero transferir"**.
- Para continuar: digitar o **primeiro nome do destinatário** e o **valor** (sem colar) — lembrança ativa quebra o automatismo.

## 5. Comparação das camadas

| | Camada 1 (1%) | Camada 2 (10%) |
|---|---|---|
| Tempo extra | ~10–15s | ~1 min + atraso de 30 min |
| Perguntas | 2 múltipla escolha, rotativas | 3–4 + texto livre analisado |
| Campo livre | Não | Sim, dirigido e checado |
| Ligação ativa | Escala para Camada 2 | Bloqueia até desligar |
| Atraso | Não | Sim (agendamento cancelável) |
| Botão principal | Cancelar/revisar | Não transferir |

## 6. Métricas e experimento

- **A/B por camada** contra o fluxo atual.
- **Principal:** perda evitada (R$) por 1.000 alertas; taxa de MED/contestação em 7 dias.
- **Guardrails:** abandono de Pix legítimos, tempo até concluir, contatos no SAC, NPS do fluxo.
- **Diagnóstico:** distribuição de respostas por pergunta — se uma opção concentra ~90% das respostas em golpes confirmados, está sendo ditada e precisa ser trocada.
- **Regra econômica:** o atrito se justifica quando
  `P(golpe) × valor × taxa de evitação > custo do atrito × P(legítimo)`
  — usar para calibrar os limites de 1% e 10% por faixa de valor.

## 7. Roadmap

1. **MVP (4–6 semanas):** Camada 1 (perguntas rotativas + botões invertidos) e Camada 2 (texto que nomeia o golpe + atraso).
2. **V2:** detecção de ligação ativa e acesso remoto; análise do texto livre por NLP.
3. **V3:** Guardião, roteiros por tipo de golpe vindos do modelo de risco, limites ajustados por perfil.

---

**Resumo:** o fluxo atual pergunta *"você confia?"*. O novo pergunta *"quem está falando com você agora?"*, diz o que o golpista está fazendo e dá tempo para a pessoa pensar.
