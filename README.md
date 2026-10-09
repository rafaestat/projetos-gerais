# 🏎️ Corrida da Lara — Kart Arco-Íris

Uma corrida de kart no estilo **Mario Kart**, colorida e fácil, feita especialmente para a
**Lara** (e outras crianças a partir de uns 3–5 anos) jogar no celular Android.

## Como se joga

- **Arraste o dedo** na tela para dirigir — o kart acelera sozinho.
- Passe nas **caixas ❓** para ganhar um item e toque no **botão redondo** para usar:
  🍄 turbo · 🍌 banana · 🐚 concha teleguiada · 🌟 estrela invencível · ⚡ raio que encolhe todo mundo.
- Fique nas **curvas** para carregar o **mini-turbo** (faíscas azul → laranja → rosa).
- Pegue **moedas** (até 10) para ficar mais rápida, pule nas **rampas** e passe nos **turbos 🔥**.
- **Largada turbo:** toque na tela quando aparecer o número **2**.
- **Copa:** 4 pistas seguidas, com pontos e troféu. **Corrida livre:** escolha a pista.
- **Atalhos secretos:** em cada pista tem uma placa com seta e uma trilha de estrelinhas ✨ que leva a um
  lugar secreto (🚀 foguete ao espaço, 🌊 túnel no fundo do mar ou 🌈 escorregador nas nuvens).
- **🚀 Modo Espaço:** uma corrida em cada planeta (Terra, Lua, Marte e Saturno), viajando pelo espaço entre eles.
- **🦖 Vale dos Dinossauros:** o T-Rex persegue quem está em último e come quem ele alcançar. Fuja dele e
  cuidado com as bombas 💣!
- 3 velocidades: 🐢 Fácil, 🐇 Médio e 🚀 Rápido. 10 personagens e 9 cores de kart.

No computador: setas ← → para dirigir, espaço para usar item, P para pausar.

## 🦖 Lara Hopper (novo jogo, na pasta [`hopper/`](hopper/))

Um joguinho de bloquinhos no estilo do *Jurassic Hopper*: a Lara (a mesma da corrida, de
maria-chiquinha com lacinhos rosa) pula faixa por faixa até o **ninho**, desviando das manadas
de dinossauros e pulando nas pedras dos rios. Link: https://rafaestat.github.io/projetos-gerais/hopper/

- A Lara corre na direção de quem joga, e o T-Rex vem atrás dela, de frente, todo de bloquinhos.
- **A Lara pula para onde você toca:** tocar do lado dela = vai para o lado; tocar na frente (embaixo) = pula para a frente. Um toque é sempre um pulo, e setinhas em volta dela mostram para onde dá para ir.
- Música da selva o tempo todo (a mesma da corrida); ela para no momento tenso, para o rugido assustar.
- O **T-Rex gigante** vem atrás devagar. Se alcança: "NHAC!" e cospe a Lara ("BLÉ!") — ninguém perde.
- **Um único momento tenso** no meio do caminho: escurece, passos pesados, silêncio e o rugido.
  O rugido toca só essa vez, para continuar assustador. Depois o T-Rex corre atrás por uns segundos.
- Bater num dino só faz a Lara voltar para a grama. Estrelinhas pelo caminho; recorde salvo no celular.
- No computador: seta para baixo (ou espaço) pula para a frente; ← → para os lados.

O plano do projeto (o que já foi feito e o que vem a seguir) está em [`ROADMAP.md`](ROADMAP.md).

## Como jogar no Android (3 jeitos)

### 1. Jeito mais fácil — abrir num navegador
Coloque os arquivos em qualquer servidor web e abra o link no **Chrome** do celular.
Funciona em qualquer celular, sem instalar nada.

### 2. Instalar como "app" na tela inicial (recomendado)
Depois de abrir o jogo no Chrome do Android:
1. Toque no menu (⋮) no canto superior.
2. Toque em **"Adicionar à tela inicial"** / **"Instalar app"**.
3. Pronto! Vai aparecer um ícone de carrinho na tela inicial, abre em tela cheia e
   funciona até **sem internet** (graças ao service worker).

### 3. Hospedar de graça (ex.: GitHub Pages)
1. Suba estes arquivos para um repositório no GitHub.
2. Em **Settings → Pages**, ative o GitHub Pages na branch do projeto.
3. Acesse o link gerado pelo celular e siga o passo 2 acima.

> Observação: o service worker e a instalação como app só funcionam em **HTTPS**
> (ou em `localhost`). Abrir o arquivo direto com `file://` faz o jogo rodar,
> mas sem o recurso de instalar/offline.

## Testar no computador

```bash
# Dentro da pasta do projeto, rode um servidor simples:
python3 -m http.server 8000
# Depois abra http://localhost:8000 no navegador
```

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Página principal |
| `style.css` | Estilos / visual das telas |
| `game.js` | Toda a lógica do jogo (pistas, karts, itens, música) |
| `ROADMAP.md` | Plano do projeto: sprints e próximos passos |
| `manifest.json` | Configuração para virar "app" (PWA) |
| `sw.js` | Service worker (jogar offline) |
| `icon.svg` | Ícone do app |

Sem dependências, sem build. É só HTML, CSS e JavaScript puro. 💖
