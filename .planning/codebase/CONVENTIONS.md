# Coding Conventions

**Analysis Date:** 2026-08-10

## Project Nature

This repository hosts two standalone, vanilla-JavaScript browser games/apps served as static sites via GitHub Pages:

- **Corrida da Lara** (root) — `index.html`, `game.js`, `style.css`, `sw.js`, `manifest.json`
- **Ateliê Essenzia** (`atelie/`) — `atelie/index.html`, `atelie/js/main.js`, `atelie/js/engine.js`, `atelie/js/stations.js`, `atelie/js/audio.js`, `atelie/styles.css`

There is no package.json, no build tooling, no bundler, no transpiler, no linter config, and no test framework anywhere in the repo. Code runs directly in the browser as plain `<script>` includes.

## Naming Patterns

**Files:**
- Lowercase, single-word or hyphen-free JS files named by responsibility: `game.js`, `engine.js`, `stations.js`, `audio.js`, `main.js`
- CSS: `style.css` (root), `atelie/styles.css`

**Functions:**
- `camelCase` for functions, e.g. `resize()`, `ensureAudio()`, `soundStar()`, `showBack()` (`game.js`, `atelie/js/main.js`)
- Verb-first names for actions (`spawnObstacle`, `updatePlayer` style seen throughout `game.js`)

**Variables:**
- `camelCase` for local/module variables: `chosenColor`, `hintTimer`, `pressGlow` (`atelie/js/engine.js`)
- `UPPER_SNAKE_CASE` for constant lookup tables/enums: `CAR_COLORS` (`game.js`), `STATE` object used as an enum (`game.js`)
- Short physics/geometry variables (`W`, `H`, `dpr`, `DPR`) are used consistently for canvas width/height/device-pixel-ratio across both apps

**Modules/Namespaces:**
- Global namespace objects with `PascalCase` used as lightweight modules: `window.UI` (`atelie/js/main.js`), `Engine` (`atelie/js/engine.js`)
- Each file is wrapped in an IIFE `(() => { "use strict"; ... })()` to avoid leaking globals, except modules intentionally exposed on `window` (e.g. `Engine`, `window.UI`)

## Code Style

**Formatting:**
- No Prettier/ESLint config present — style is hand-maintained but consistent: 2-space indentation, double quotes for strings, semicolons used throughout
- Braces on same line (`function resize() {`), no Allman style

**Language features:**
- Modern ES6+: arrow functions, `const`/`let` (no `var`), template literals, destructuring, default parameters (e.g. `beep(freq, dur, type = "sine", vol = 0.15)` in `game.js`)
- `"use strict"` declared at top of IIFEs in `game.js`

**Linting:**
- No linter configured. No `.eslintrc*`, `eslint.config.*`, or `.prettierrc*` files found in the repo.

## Comments

**Header comment blocks:**
- Every major file opens with a `/* ... */` banner comment in Portuguese describing the file's purpose, e.g.:
  ```js
  /* ====================================================================
     Corrida da Lara — jogo de carrinho para crianças (5 anos)
     Controle: arraste o dedo (ou o mouse) para guiar o carrinho.
     ==================================================================== */
  ```
  (`game.js`, top of file)
  ```js
  /*
   * Ateliê Essenzia — Motor gráfico e de interação
   * Cuida do canvas, do laço de animação, do rastreamento do ponteiro...
   */
  ```
  (`atelie/js/engine.js`, top of file)

**Section comments:**
- Code is organized into labeled sections using `/* ---------------- Section Name --------------------------------- */` dividers, e.g. `/* ---------------- Sons simples (WebAudio, sem arquivos) ----------- */` (`game.js`), `// ---- ponteiro ----` / `// ---- partículas / feedback tátil ----` (`atelie/js/engine.js`)

**Inline comments:**
- Portuguese-language inline comments explain intent/UX reasoning, not just mechanics, e.g. `// a dica recua sozinha para não poluir a tela durante a criação` (`atelie/js/main.js`)

**Language:** All comments and UI copy are written in Brazilian Portuguese. New code should follow this convention.

## Error Handling

**Patterns:**
- Defensive `try/catch` around browser APIs that may be unavailable, with silent fallback to `null`:
  ```js
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
  }
  ```
  (`game.js`)
- Guard clauses (`if (!audioCtx) return;`) used to no-op when a dependency isn't ready, rather than throwing (`game.js`, `atelie/js/audio.js`)
- No centralized error handling, logging framework, or error boundary — errors are handled locally and defensively at the call site

## Function Design

**Size:** Functions are generally small and single-purpose (10-30 lines), grouped by concern under section comments.

**Parameters:** Positional parameters with sensible defaults for tunable values (e.g. sound synthesis parameters in `beep()`).

**Return Values:** Functions mutate module-level state (closures) rather than returning complex objects; simple getters/setters pattern is common in `Engine`.

## Module Design

**Exports:**
- No ES modules (`import`/`export`) — scripts are loaded via `<script>` tags in `index.html` / `atelie/index.html` and communicate through explicit globals (`window.UI`, `Engine`)
- Internal state stays private via IIFE closures; only what other files need is attached to `window`

**Where to add new code:**
- New game logic for Corrida da Lara → `game.js`, following the existing section-comment structure
- New Ateliê Essenzia "station" (interactive scene) → add to `atelie/js/stations.js` following the existing scene object pattern registered with `Engine`
- Shared engine/canvas behavior → `atelie/js/engine.js`
- Audio/sound effects → `atelie/js/audio.js` (Ateliê) or the `beep()`-based helpers in `game.js` (Corrida da Lara)
- UI/DOM wiring (buttons, hints, screens) → `atelie/js/main.js` for Ateliê; top of `game.js` for Corrida da Lara

---

*Convention analysis: 2026-08-10*
