# 🗺️ Roadmap — Corrida da Lara (Kart Arco-Íris)

**Objetivo:** um kart no estilo Mario Kart que seja *muito divertido* para a Lara
(3–5 anos) e gostoso para o resto da família, no celular Android e sem instalar nada.

**Regras de produto (não negociáveis)**
1. Dá para jogar só arrastando o dedo — o kart acelera sozinho.
2. Nunca pune demais: bater gira o kart e tira 2 moedas, mas ninguém "perde vidas".
3. O modo 🐢 Fácil tem que dar para ganhar; o 🚀 Rápido é para os adultos.
4. Funciona offline e roda liso em celular simples.

---

## ✅ Sprint 1 — "Cara de Mario Kart" (entregue)

| Item | Status |
|---|---|
| Caixas de item ❓ com roleta: 🍄 turbo (x1 ou x3), 🍌 banana, 🐚 concha teleguiada, 🌟 estrela, ⚡ raio | ✅ |
| Itens por posição (quem está atrás ganha itens melhores, igual ao Mario Kart) | ✅ |
| 8 corredores com 10 personagens para escolher, e a cor do kart | ✅ |
| Mini-turbo automático nas curvas (faíscas azul → laranja → rosa) | ✅ |
| Largada turbo (tocar na tela quando aparece o "2") | ✅ |
| Moedas (até 10, cada uma deixa o kart mais rápido) | ✅ |
| Rampas com manobra no ar + turbo ao pousar | ✅ |
| Pista com morros (sobe e desce de verdade) | ✅ |
| 4 pistas: 🌻 Campo Florido, 🏖️ Praia do Sol, 🍭 Reino dos Doces, 🌈 Estrada Arco-Íris | ✅ |
| Copa com 4 corridas, pontos e troféu 🏆🥈🥉 salvo no celular | ✅ |
| 3 velocidades: 🐢 Fácil, 🐇 Médio, 🚀 Rápido | ✅ |
| Música diferente por pista + música acelera na última volta | ✅ |
| Placar estilo Mario Kart: posição grande, fila de carinhas, volta, moedas | ✅ |
| Pausa (e pausa sozinho se o celular sair do jogo) | ✅ |
| Funciona com o celular em pé ou deitado | ✅ |
| Correção: batidas aconteciam com karts que nem apareciam na tela | ✅ |

**Como foi validado:** Copa inteira jogada automaticamente (celular em pé e deitado),
mais 60 s de corrida "de verdade" com um jogador-robô: sem erros, ~60 FPS.

---

## ✅ Sprint 1.1 — Pedidos do 1º teste com a Lara (entregue)

| Pedido | Status |
|---|---|
| Botão de item do lado **esquerdo** (ela solta os itens com a mão esquerda, celular apoiado na barriga) | ✅ |
| Festa especial no **1º, 2º e 3º lugar**: pódio com os karts, coroa 👑, fogos de artifício, purpurina, balões, título arco-íris, música de festa, vibração e uma voz dizendo "Parabéns, Lara!" | ✅ |
| A mesma festa ao ganhar troféu na Copa | ✅ |

## ✅ Sprint 1.2 — Atalhos secretos + Modo Espaço (entregue)

**Atalhos secretos (modo tradicional)** — um em cada pista, no meio da volta:

| Pista | Atalho | Dicas para achar |
|---|---|---|
| 🌻 Campo Florido | 🚀 Foguete secreto: sobe ao espaço, vê a Terra, a Lua, o Sol e os planetas | placa amarela com seta 👉 + trilha de estrelinhas ✨ saindo da pista |
| 🏖️ Praia do Sol | 🌊 Túnel do fundo do mar: peixes, baleia, polvo, algas, bolhas | idem |
| 🍭 Reino dos Doces | 🌈 Escorregador nas nuvens: arco-íris, pássaros, borboletas, unicórnio | idem |
| 🌈 Estrada Arco-Íris | 🚀 Foguete secreto | idem |

Ao passar pela placa toca um sininho e aparece "Siga as estrelinhas!". A entrada fica
fora da pista; quem entra volta **bem mais na frente** (é um atalho de verdade),
caindo do céu com turbo. Os rivais nunca usam os atalhos.

**🚀 Modo Espaço (Viagem Espacial)** — módulo separado, o tradicional continua igual:
- 4 corridas, uma em cada planeta: 🌍 Terra → 🌕 Lua → 🔴 Marte → 🪐 Saturno.
- Entre as corridas, viagem pelo espaço com o Sol ao fundo, estrelas na velocidade
  da luz, o planeta de onde saiu ficando pequeno e o próximo crescendo.
- Cada planeta tem sua gravidade: na Lua os pulos nas rampas são enormes e lentos.
- Na Lua dá para ver a Terra no céu; em Saturno, o planeta gigante com anéis.
- Troféu próprio: "Campeã do Espaço", guardado na estante da tela inicial.

## 🔜 Sprint 2 — "Teste com a Lara" (próxima)

A Sprint 2 depende do **teste com a Lara**. Antes de programar mais, o ideal é ela
jogar umas 3–4 vezes. O que observar:

- [ ] Ela entende sozinha o botão de item? (se não: usar o item automaticamente no Fácil)
- [ ] O Fácil está fácil demais ou difícil demais? Ela ganha?
- [ ] Ela se frustra quando escorrega na banana?
- [ ] Prefere o celular em pé ou deitado?
- [ ] Qual pista ela mais gosta? (vira modelo para as próximas)
- [ ] A Copa (4 corridas, ~8 min) é longa demais? (opção: Copa de 2 pistas / 2 voltas)

Ideias candidatas, a priorizar depois do teste:

- **Modo "Bebê" / assistência**: kart nunca sai da pista e itens usados sozinhos.
- **Narração com voz** ("Vai, Lara!", "Última volta!") usando a voz do celular.
- **Tela de pódio** com os 3 primeiros em cima do pódio, pulando.
- **Mais itens**: 💣 bomba, 🍌🍌🍌 tripla, 👻 fantasminha que rouba item.
- **Vibração** no celular ao bater e ao pegar turbo.

## 🗓️ Backlog (futuro)

- 2ª Copa com 4 pistas novas (❄️ Montanha de Neve, 🌋 Vulcão, 🌊 Fundo do Mar, 🏰 Castelo).
- Álbum de figurinhas: destravar personagens e karts ganhando copas.
- Contra o relógio com "fantasma" do melhor tempo.
- 2 jogadores na mesma tela (tablet), dividida ao meio.
- Ícone de app em PNG (alguns Androids não mostram ícone SVG).

---

## 🚀 Como publicar

O GitHub Pages publica a partir do branch `claude/android-car-game-kids-lMFB9`
(veja `.github/workflows/deploy-pages.yml`). Para a nova versão ir ao ar,
basta juntar (merge) este trabalho nesse branch.
