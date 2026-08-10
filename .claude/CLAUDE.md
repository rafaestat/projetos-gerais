<!-- GSD:project-start source:PROJECT.md -->

## Project

**Ateliê Essenzia**

Ateliê Essenzia é um simulador tátil de ASMR no navegador (7 estações de artesanato: velas, sabonetes, papel, madeira, selo de cera, miçangas, embalagem), publicado como parte estática deste repositório em `/atelie` no GitHub Pages. Está evoluindo de brinquedo pessoal/familiar para uma peça de experiência de marca: um link que a esposa do Rafael compartilha com as clientes da loja dela de sabonetes e velas artesanais (via Instagram/WhatsApp), passando a sensação de cuidado da marca antes ou depois da compra.

**Core Value:** A experiência precisa ser gostosa e relaxante, e cada interação deve se explicar sozinha — pela forma, luz e movimento dos objetos (afordância/significante, no sentido de Don Norman) — sem depender de texto de instrução ou de uma mãozinha animada dizendo o que fazer. O tema específico de cada estação é secundário a essa sensação.

### Constraints

- **Tech stack**: Vanilla HTML/CSS/JS, sem build step, sem dependências — manter consistência com o padrão já estabelecido no repo
- **Deploy**: GitHub Pages via `.github/workflows/pages.yml`, que só dispara em branches específicas (`claude/atelie-essenzia-asmr-FbS4A`, `claude/atelier-app-ux-jjlvcq`) — não há branch `main`/`master` neste repositório

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- HTML5 - Page structure for both apps (`index.html`, `atelie/index.html`)
- Vanilla JavaScript (ES6+, no transpilation) - Game logic and app engine (`game.js`, `atelie/js/*.js`)
- CSS3 - Styling (`style.css`, `atelie/styles.css`)
- YAML - GitHub Actions workflow config (`.github/workflows/pages.yml`)
- JSON - PWA manifests (`manifest.json`, `atelie/manifest.json`)

## Runtime

- Browser-only, client-side static site. No Node.js runtime, no server-side code.
- No `package.json` present — this is a dependency-free, build-free project.
- None. No npm/yarn/pnpm. No lockfile.

## Frameworks

- None. Pure vanilla JS using the Canvas 2D API (`game.js`) and Web Audio API (`atelie/js/audio.js`).
- No UI framework (no React/Vue/etc), no bundler, no transpiler.
- None detected. No test framework, no test files.
- None. Files are served as-is; no build step (no webpack/vite/esbuild/babel config found).

## Key Dependencies

- None (zero external JS libraries/CDN imports found in either app).
- Service Worker API - offline caching for the root app (`sw.js`), network-first strategy, cache name `corrida-lara-v4`.
- Web App Manifest / PWA - both apps are installable PWAs (`manifest.json`, `atelie/manifest.json`).

## Configuration

- No environment variables or `.env` files used — fully static, no secrets/config needed.
- No build config files (no `tsconfig.json`, `webpack.config.js`, `vite.config.js`, etc.)
- Deployment/publish config only: `.github/workflows/pages.yml`

## Platform Requirements

- Any modern browser; no install/server needed. `atelie/README.md` explicitly states "não precisa instalar nada, nem servidor."
- Recommended: local static file server or direct file:// open for quick iteration.
- GitHub Pages, served from the repository root.
- Two apps in one repo/deploy:

## Repository Structure Summary

- `index.html`, `game.js`, `style.css`, `manifest.json`, `sw.js`, `icon.svg` — root game ("Carrinho da Lara")
- `atelie/index.html`, `atelie/styles.css`, `atelie/manifest.json`, `atelie/icon.svg` — Ateliê app shell
- `atelie/js/audio.js` — procedural/binaural Web Audio synthesis engine
- `atelie/js/engine.js` — canvas rendering, particles, pointer input, scene transitions
- `atelie/js/stations.js` — menu and the 7 crafting "stations" (candles, soap, paper cutting, wood sanding, wax seal, beads, gift wrapping)
- `atelie/js/main.js` — entry point and minimal UI wiring

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Project Nature

- **Corrida da Lara** (root) — `index.html`, `game.js`, `style.css`, `sw.js`, `manifest.json`
- **Ateliê Essenzia** (`atelie/`) — `atelie/index.html`, `atelie/js/main.js`, `atelie/js/engine.js`, `atelie/js/stations.js`, `atelie/js/audio.js`, `atelie/styles.css`

## Naming Patterns

- Lowercase, single-word or hyphen-free JS files named by responsibility: `game.js`, `engine.js`, `stations.js`, `audio.js`, `main.js`
- CSS: `style.css` (root), `atelie/styles.css`
- `camelCase` for functions, e.g. `resize()`, `ensureAudio()`, `soundStar()`, `showBack()` (`game.js`, `atelie/js/main.js`)
- Verb-first names for actions (`spawnObstacle`, `updatePlayer` style seen throughout `game.js`)
- `camelCase` for local/module variables: `chosenColor`, `hintTimer`, `pressGlow` (`atelie/js/engine.js`)
- `UPPER_SNAKE_CASE` for constant lookup tables/enums: `CAR_COLORS` (`game.js`), `STATE` object used as an enum (`game.js`)
- Short physics/geometry variables (`W`, `H`, `dpr`, `DPR`) are used consistently for canvas width/height/device-pixel-ratio across both apps
- Global namespace objects with `PascalCase` used as lightweight modules: `window.UI` (`atelie/js/main.js`), `Engine` (`atelie/js/engine.js`)
- Each file is wrapped in an IIFE `(() => { "use strict"; ... })()` to avoid leaking globals, except modules intentionally exposed on `window` (e.g. `Engine`, `window.UI`)

## Code Style

- No Prettier/ESLint config present — style is hand-maintained but consistent: 2-space indentation, double quotes for strings, semicolons used throughout
- Braces on same line (`function resize() {`), no Allman style
- Modern ES6+: arrow functions, `const`/`let` (no `var`), template literals, destructuring, default parameters (e.g. `beep(freq, dur, type = "sine", vol = 0.15)` in `game.js`)
- `"use strict"` declared at top of IIFEs in `game.js`
- No linter configured. No `.eslintrc*`, `eslint.config.*`, or `.prettierrc*` files found in the repo.

## Comments

- Every major file opens with a `/* ... */` banner comment in Portuguese describing the file's purpose, e.g.:
- Code is organized into labeled sections using `/* ---------------- Section Name --------------------------------- */` dividers, e.g. `/* ---------------- Sons simples (WebAudio, sem arquivos) ----------- */` (`game.js`), `// ---- ponteiro ----` / `// ---- partículas / feedback tátil ----` (`atelie/js/engine.js`)
- Portuguese-language inline comments explain intent/UX reasoning, not just mechanics, e.g. `// a dica recua sozinha para não poluir a tela durante a criação` (`atelie/js/main.js`)

## Error Handling

- Defensive `try/catch` around browser APIs that may be unavailable, with silent fallback to `null`:
- Guard clauses (`if (!audioCtx) return;`) used to no-op when a dependency isn't ready, rather than throwing (`game.js`, `atelie/js/audio.js`)
- No centralized error handling, logging framework, or error boundary — errors are handled locally and defensively at the call site

## Function Design

## Module Design

- No ES modules (`import`/`export`) — scripts are loaded via `<script>` tags in `index.html` / `atelie/index.html` and communicate through explicit globals (`window.UI`, `Engine`)
- Internal state stays private via IIFE closures; only what other files need is attached to `window`
- New game logic for Corrida da Lara → `game.js`, following the existing section-comment structure
- New Ateliê Essenzia "station" (interactive scene) → add to `atelie/js/stations.js` following the existing scene object pattern registered with `Engine`
- Shared engine/canvas behavior → `atelie/js/engine.js`
- Audio/sound effects → `atelie/js/audio.js` (Ateliê) or the `beep()`-based helpers in `game.js` (Corrida da Lara)
- UI/DOM wiring (buttons, hints, screens) → `atelie/js/main.js` for Ateliê; top of `game.js` for Corrida da Lara

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root game shell | HTML structure, screens (start/HUD/over), asset links | `index.html` |
| Root game logic | Canvas rendering, input, game loop, scoring, audio (WebAudio beeps) | `game.js` |
| Root styles | Layout/theme for the racing game | `style.css` |
| Root service worker | Network-first caching/offline support for the root PWA | `sw.js` |
| Root PWA manifest | Installability metadata (name, icons, display mode) | `manifest.json` |
| Ateliê shell | HTML structure, intro screen, UI chrome (hint/back/mute buttons) | `atelie/index.html` |
| Ateliê entry point | Wires UI controls to `Engine`/`ASMR` globals, scene navigation, hint system | `atelie/js/main.js` |
| Ateliê engine | Canvas setup, animation loop, pointer tracking, particles, scene crossfade | `atelie/js/engine.js` |
| Ateliê audio | WebAudio-based "ASMR" sound design (spatial/interactive sounds) | `atelie/js/audio.js` |
| Ateliê stations | Individual interactive "station" scenes/mini-experiences | `atelie/js/stations.js` |
| Ateliê styles | Layout/theme for the ASMR simulator | `atelie/styles.css` |
| CI/CD | Builds and deploys both sites to GitHub Pages on push | `.github/workflows/pages.yml` |
| GSD tooling | AI planning/execution framework (commands, agents, hooks) — not part of the deployed apps | `.claude/gsd-core/`, `.claude/commands/`, `.claude/agents/`, `.claude/hooks/` |

## Pattern Overview

- Zero dependencies — pure HTML5 Canvas + WebAudio API, no npm packages for the apps themselves
- Two apps are fully independent; no shared code between `game.js` (root) and `atelie/js/*` — some concepts are duplicated (both implement their own WebAudio sound synthesis, resize/DPR handling, canvas loop)
- Portuguese (pt-BR) is the language for UI text, comments, and copy in both apps
- Progressive Web App (PWA) pattern on the root game only: `manifest.json` + `sw.js` for installability/offline; `atelie/` has its own `manifest.json` but no service worker (`atelie/js/` has no `sw.js`)
- Mobile-first design: touch/pointer-driven, `viewport-fit=cover`, fullscreen display mode

## Layers

- Purpose: Screen structure and visual theme
- Location: `index.html`, `style.css`, `atelie/index.html`, `atelie/styles.css`
- Contains: DOM elements for screens/HUD/buttons, CSS for layout and animations
- Depends on: nothing (pure markup/styles)
- Used by: the JS layer, which queries elements by ID and toggles classes
- Purpose: State machine, rendering loop, input handling, scoring
- Location: `game.js` (root); `atelie/js/engine.js`, `atelie/js/main.js`, `atelie/js/stations.js` (atelie)
- Contains: canvas draw calls, `requestAnimationFrame` loops, pointer/touch event handlers
- Depends on: DOM elements defined in the corresponding `index.html`
- Used by: nothing further downstream — this is the top of the app-layer stack
- Purpose: Procedural sound effects via WebAudio (no audio files)
- Location: inline in `game.js` (root, `beep()`/`soundX()` helpers); `atelie/js/audio.js` (atelie, exposed as global `ASMR`)
- Depends on: `AudioContext`/`webkitAudioContext`
- Used by: game/app logic layer to play feedback sounds on events
- Purpose: Caching and installability for the root game
- Location: `sw.js` (service worker, network-first strategy caching `ASSETS` array), `manifest.json`
- Depends on: Cache API
- Used by: browser install prompts and offline fallback; registered from `index.html` inline script

## Data Flow

### Root Game (`Corrida da Lara`) Primary Loop

### Ateliê Essenzia Scene Flow

- No external state library; state lives in closures (module-scoped `let`/`const` inside each IIFE) and a small number of global namespace objects (`Engine`, `ASMR`, `UI`, `window.UI`)
- No persistence layer (no localStorage/IndexedDB usage detected in either app)

## Key Abstractions

- Purpose: Pluggable interactive "stations" registered into `Engine`'s `scenes` object and switched via `Engine.go(name, data)`
- Examples: `atelie/js/stations.js`, consumed by `atelie/js/engine.js`
- Pattern: each station is a plain object with lifecycle-style functions, added to the shared `scenes` map
- Purpose: Simple enum-based state (`MENU`, `PLAY`, `OVER`) gating render/update behavior
- Examples: `game.js:76-77`
- Pattern: single global `state` variable checked in the render/update loop

## Entry Points

- Location: `index.html` → `game.js`
- Triggers: browser navigation to `/` (GitHub Pages root)
- Responsibilities: renders start screen, runs the racing minigame, registers service worker
- Location: `atelie/index.html` → `atelie/js/audio.js`, `atelie/js/engine.js`, `atelie/js/stations.js`, `atelie/js/main.js` (load order matters — later scripts assume earlier globals exist)
- Triggers: browser navigation to `/atelie/`
- Responsibilities: renders intro/consent screen, then drives the ASMR "ateliê" simulator via `Engine`
- Location: `.github/workflows/pages.yml`
- Triggers: push to `claude/atelie-essenzia-asmr-FbS4A` or `claude/atelier-app-ux-jjlvcq` branches, or manual `workflow_dispatch`
- Responsibilities: uploads repo root as a Pages artifact and deploys to GitHub Pages (both sites deploy together since both live under the same root)

## Architectural Constraints

- **Threading:** Single-threaded; both apps run on the main JS thread with `requestAnimationFrame` loops. No Web Workers detected.
- **Global state:** Each app is scoped inside a top-level IIFE except for the atelie app's three cross-file globals — `Engine` (`atelie/js/engine.js`), `ASMR` (`atelie/js/audio.js`), and `window.UI` (`atelie/js/main.js`) — which are the only inter-file communication mechanism (no modules).
- **Script load order dependency:** `atelie/index.html` must load `audio.js`, `engine.js`, `stations.js`, then `main.js` in that exact order since each references globals defined by the previous script. There is no bundler to enforce or catch ordering mistakes.
- **No build step:** Files are served as-is; any change to `.js`/`.css`/`.html` is immediately live after deploy. No transpilation, minification, or dependency resolution.
- **Deploy trigger branches are hardcoded:** `.github/workflows/pages.yml` only deploys on pushes to two specific branch names, not `main`/`master` — changes on other branches will not auto-deploy.

## Anti-Patterns

### Global namespace coupling in Ateliê Essenzia

### Duplicated WebAudio boilerplate

## Error Handling

- `try { ... } catch (e) { <fallback> }` around AudioContext creation in both apps
- Service worker `.catch(() => caches.match(e.request))` for offline fallback
- No centralized error logging or reporting — errors are swallowed silently by design (family/kids app, no telemetry)

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
