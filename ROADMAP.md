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
