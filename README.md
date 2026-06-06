# 🚗 Corrida da Lara

Um joguinho de carrinho simples e colorido, feito especialmente para a **Lara** (e outras crianças pequenas, a partir de uns 3–5 anos) jogarem no celular Android.

## Como se joga

- **Arraste o dedo** na tela para guiar o carrinho de um lado para o outro.
- Pegue as **estrelinhas ⭐** para ganhar pontos.
- **Desvie** dos outros carrinhos. Cada batida tira um ❤️ (são 3).
- Antes de começar, dá pra **escolher a cor** do carrinho.

O jogo é bem tranquilo e fica mais rápido bem devagarzinho, pensado para crianças.

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
| `game.js` | Toda a lógica do jogo (canvas) |
| `manifest.json` | Configuração para virar "app" (PWA) |
| `sw.js` | Service worker (jogar offline) |
| `icon.svg` | Ícone do app |

Sem dependências, sem build. É só HTML, CSS e JavaScript puro. 💖
