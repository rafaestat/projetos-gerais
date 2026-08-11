# Ateliê Essenzia — O Simulador Tátil de ASMR

Um simulador imersivo e sem pressa do dia a dia de um ateliê de artesanato,
feito para a descompressão sensorial. Não há cronômetros, escassez de recursos,
"game over" ou clientes insatisfeitos — apenas o prazer de criar com as mãos.

> O acordo inegociável do jogo é a **leveza absoluta**.

## Como jogar

1. Abra o arquivo **`index.html`** em qualquer navegador moderno
   (não precisa instalar nada, nem servidor).
2. Coloque os **fones de ouvido** — o áudio é espacial e segue o movimento
   das suas mãos na tela (sensação binaural).
3. Toque em **Entrar no ateliê** e escolha um cantinho.

Funciona com **mouse** ou **toque** (celular, tablet, telas sensíveis).
Pode ser espelhado ou projetado na parede/teto para virar um ritual antes de dormir.

## Os cantinhos do ateliê

| Estação | O que você faz |
| --- | --- |
| 🕯️ **Velas Artesanais** | Derreta a cera deslizando, despeje na forma, posicione o pavio e perfume com pétalas. |
| 🧼 **Sabonetes Artesanais** | Despeje a base, pingue a cor e desenhe redemoinhos, perfume com essência e corte as barras. |
| 📄 **Corte de Papel** | Siga a linha pontilhada com a tesoura e ouça o corte "crispy". |
| 🪵 **Lixar Madeira** | Deslize a lixa para frente e para trás até a superfície ficar lisa e acetinada. |
| 🔴 **Selo de Cera** | Pingue a cera quente e pressione o selo para revelar o monograma. |
| 🔵 **Miçangas & Cores** | Leve cada miçanga ao potinho da sua cor, no seu ritmo. |
| 🎁 **Ritual de Embalagem** | Coloque a peça na caixa, dobre o papel de seda e lace com a fita. |

Cada criação termina com um sininho suave e o convite para começar outra.
Nada se perde, nada falha.

## Design sensorial

- **Áudio binaural procedural** — todos os sons são sintetizados em tempo real
  (Web Audio API), com panning estéreo que acompanha a direção do movimento e
  uma reverberação quente que envolve tudo. Não depende de arquivos externos.
- **Imersão visual quente** — iluminação âmbar indireta que respira, texturas
  e partículas (gotas de cera, bolhas de sabão, farelos de papel, serragem,
  pétalas) e vinheteamento cinematográfico.
- **UI invisível durante a criação** — sem botões poluindo a tela; a única dica
  recua sozinha e reaparece com um toque.
- **Fluidez em tudo** — troca de cantinhos em crossfade (sem tela preta),
  cartões que surgem em cascata, arrasto com inércia (as coisas "pesam" na mão),
  ondinhas e brilho quente sob o dedo, vibração sutil no celular e uma chuva de
  fagulhas douradas a cada peça concluída.

## Estrutura do projeto

```
atelie-essenzia/
├── index.html        # tela inicial + canvas
├── styles.css        # estética quente e UI mínima
└── js/
    ├── audio.js      # motor de áudio ASMR (síntese + panning + reverb)
    ├── engine.js     # canvas, partículas, ponteiro e troca de cenas
    ├── stations.js   # o menu e as 7 estações de criação
    └── main.js       # ponto de entrada e UI mínima
```

Feito com carinho. 💛
