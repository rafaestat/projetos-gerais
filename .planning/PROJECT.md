# Ateliê Essenzia

## What This Is

Ateliê Essenzia é um simulador tátil de ASMR no navegador (7 estações de artesanato: velas, sabonetes, papel, madeira, selo de cera, miçangas, embalagem), publicado como parte estática deste repositório em `/atelie` no GitHub Pages. Está evoluindo de brinquedo pessoal/familiar para uma peça de experiência de marca: um link que a esposa do Rafael compartilha com as clientes da loja dela de sabonetes e velas artesanais (via Instagram/WhatsApp), passando a sensação de cuidado da marca antes ou depois da compra.

## Core Value

A experiência precisa ser gostosa e relaxante, e cada interação deve se explicar sozinha — pela forma, luz e movimento dos objetos (afordância/significante, no sentido de Don Norman) — sem depender de texto de instrução ou de uma mãozinha animada dizendo o que fazer. O tema específico de cada estação é secundário a essa sensação.

## Business Context

- **Customer**: Clientes da loja de sabonetes e velas artesanais da esposa do Rafael
- **Revenue model**: Não monetiza diretamente — é uma peça de marketing/marca distribuída como link (Instagram/WhatsApp), não uma loja
- **Success metric**: Sensação de cuidado e relaxamento transmitida (qualitativo); indício: clientes entendem o que fazer em cada estação sem precisar de instrução, e a experiência "parece" a marca (luxo com alma artesanal)
- **Strategy notes**: Referência estética citada: "estilo Peter Paiva" — luxo sofisticado com alma artesanal (nem frio/industrial, nem cru). Distribuição confirmada: por enquanto é só um link enviado por WhatsApp — não uma integração com site/loja nem QR code físico. Instagram é canal futuro possível, não o plano imediato.

## Requirements

### Validated

- ✓ 7 estações interativas funcionais (velas, sabonetes, corte de papel, lixar madeira, selo de cera, miçangas, embalagem) — existing
- ✓ Áudio binaural procedural via WebAudio, sem arquivos externos — existing
- ✓ Engine de canvas com crossfade entre cenas, partículas e rastreamento de ponteiro — existing
- ✓ Sistema de dica textual (`UI.hint`) + mãozinha-guia animada (`guideHand`) por passo de cada estação — existing
- ✓ PWA instalável via `manifest.json` — existing
- ✓ Deploy automático para GitHub Pages via `.github/workflows/pages.yml` — existing

### Active

- [ ] Cada estação comunica o próximo gesto por afordância visual (forma, brilho, sombra, movimento de repouso do objeto) em vez de texto de instrução
- [ ] Sistema atual de dica textual + mãozinha-guia é repensado/reduzido conforme as afordâncias visuais assumem esse papel
- [ ] Estética visual das 7 estações alinhada ao "estilo Peter Paiva" — luxo sofisticado com alma artesanal
- [ ] Sensação geral de "gostoso e relaxante" reforçada de ponta a ponta na experiência (não estação por estação isoladamente)

### Out of Scope

- Novas estações/cantinhos além dos 7 existentes — foco é polir o que já existe, não expandir por ora
- Fidelidade temática rigorosa de cada estação ao artesanato que representa — a sensação de relaxamento importa mais que o tema específico
- Melhorias de instalação PWA, funcionamento offline e performance mobile — fora do escopo deste ciclo
- Peso/inércia física do arrasto (avaliado no início da conversa, mas superado pelo pivô para intuitividade sem instrução como o problema real)

## Context

- Repositório estático (vanilla HTML/CSS/JS, sem build, sem framework, sem dependências) hospedado no GitHub Pages, com dois apps independentes: "Corrida da Lara" (raiz) e "Ateliê Essenzia" (`/atelie`) — sem código compartilhado entre eles
- Ateliê usa globals sem módulos (`Engine`, `ASMR`, `window.UI`) definidos em `atelie/js/{engine,audio,main}.js`, com as estações registradas em `atelie/js/stations.js`
- Já existe um sistema de dica textual (`UI.hint`, elemento `#hint`) e uma mãozinha-guia animada (`guideHand()` em `stations.js`) que demonstra o gesto de cada passo — é esse sistema que este ciclo pretende repensar/substituir
- Pivô importante identificado durante o questionamento inicial: o produto deixou de ser só um brinquedo pessoal/familiar e passou a ser uma ferramenta de marca para o negócio de sabonetes e velas artesanais da esposa do Rafael

## Constraints

- **Tech stack**: Vanilla HTML/CSS/JS, sem build step, sem dependências — manter consistência com o padrão já estabelecido no repo
- **Deploy**: GitHub Pages via `.github/workflows/pages.yml`, que só dispara em branches específicas (`claude/atelie-essenzia-asmr-FbS4A`, `claude/atelier-app-ux-jjlvcq`) — não há branch `main`/`master` neste repositório

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focar em intuitividade via afordância visual, sem texto de instrução, em vez de adicionar novas estações | Objetivo do momento é a experiência ficar autoexplicativa e agradável para as clientes da loja, não expandir conteúdo | — Pending |
| Priorizar a sensação/estética "Peter Paiva" (luxo + artesanal) sobre a fidelidade temática de cada estação | O tema específico de cada estação é secundário à sensação geral de cuidado e relaxamento que a marca quer passar | — Pending |
| Ateliê tratado como ferramenta de marca do negócio da esposa, não mais só brinquedo pessoal/familiar | Muda o público-alvo (clientes da loja) e o critério de sucesso (sensação de marca, não diversão pessoal) | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-10 after initialization*
