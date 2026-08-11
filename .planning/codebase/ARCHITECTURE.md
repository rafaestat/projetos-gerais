<!-- refreshed: 2026-08-10 -->
# Architecture

**Analysis Date:** 2026-08-10

## System Overview

This repository is a static, multi-site GitHub Pages deployment containing two independent, self-contained browser games/apps built with vanilla HTML/CSS/JS (no framework, no build step, no bundler). A `.claude/` GSD tooling installation lives alongside the apps for AI-assisted project management but is not part of the runtime.

```text
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages (static host)                │
├──────────────────────────────┬────────────────────────────────┤
│   Site A: Corrida da Lara     │   Site B: Ateliê Essenzia      │
│   served from repo root `/`   │   served from `/atelie/`       │
└──────────────┬────────────────┴──────────────┬─────────────────┘
               │                                │
               ▼                                ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│ `index.html` + `game.js`  │   │ `atelie/index.html`            │
│ `style.css`, `manifest.json`│  │ `atelie/js/{main,engine,       │
│ `sw.js` (service worker)   │   │  audio,stations}.js`           │
│                            │   │ `atelie/styles.css`            │
│                            │   │ `atelie/manifest.json`         │
└───────────────────────────┘   └───────────────────────────────┘
```

Deployment is automated: `.github/workflows/pages.yml` uploads the entire repo root as the Pages artifact on push to specific branches, so both sites are published together from one workflow run.

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

**Overall:** Static multi-page site, vanilla JS, no build pipeline, no package manager, no server-side code. Each game is a self-contained IIFE (Immediately Invoked Function Expression) or a small set of global objects (`Engine`, `ASMR`, `UI`) communicating via plain JS globals — no module bundler, no `import`/`export`.

**Key Characteristics:**
- Zero dependencies — pure HTML5 Canvas + WebAudio API, no npm packages for the apps themselves
- Two apps are fully independent; no shared code between `game.js` (root) and `atelie/js/*` — some concepts are duplicated (both implement their own WebAudio sound synthesis, resize/DPR handling, canvas loop)
- Portuguese (pt-BR) is the language for UI text, comments, and copy in both apps
- Progressive Web App (PWA) pattern on the root game only: `manifest.json` + `sw.js` for installability/offline; `atelie/` has its own `manifest.json` but no service worker (`atelie/js/` has no `sw.js`)
- Mobile-first design: touch/pointer-driven, `viewport-fit=cover`, fullscreen display mode

## Layers

**Presentation (HTML/CSS):**
- Purpose: Screen structure and visual theme
- Location: `index.html`, `style.css`, `atelie/index.html`, `atelie/styles.css`
- Contains: DOM elements for screens/HUD/buttons, CSS for layout and animations
- Depends on: nothing (pure markup/styles)
- Used by: the JS layer, which queries elements by ID and toggles classes

**Game/App Logic (JS):**
- Purpose: State machine, rendering loop, input handling, scoring
- Location: `game.js` (root); `atelie/js/engine.js`, `atelie/js/main.js`, `atelie/js/stations.js` (atelie)
- Contains: canvas draw calls, `requestAnimationFrame` loops, pointer/touch event handlers
- Depends on: DOM elements defined in the corresponding `index.html`
- Used by: nothing further downstream — this is the top of the app-layer stack

**Audio Layer (JS):**
- Purpose: Procedural sound effects via WebAudio (no audio files)
- Location: inline in `game.js` (root, `beep()`/`soundX()` helpers); `atelie/js/audio.js` (atelie, exposed as global `ASMR`)
- Depends on: `AudioContext`/`webkitAudioContext`
- Used by: game/app logic layer to play feedback sounds on events

**PWA/Offline Layer:**
- Purpose: Caching and installability for the root game
- Location: `sw.js` (service worker, network-first strategy caching `ASSETS` array), `manifest.json`
- Depends on: Cache API
- Used by: browser install prompts and offline fallback; registered from `index.html` inline script

## Data Flow

### Root Game (`Corrida da Lara`) Primary Loop

1. Page loads `index.html`, which loads `game.js` as a classic (non-module) script (`index.html:43`)
2. `game.js` IIFE grabs canvas/DOM refs and sets up `resize()` on load (`game.js:39-48`)
3. User picks a car color and taps "JOGAR" — triggers `STATE.PLAY` (state machine defined at `game.js:76-77`)
4. Game loop runs on canvas 2D context, driven by input (drag) to steer `player`, spawning/moving obstacles, checking collisions, updating `score`/`lives`
5. On game over, `over-screen` is shown with final score; "JOGAR DE NOVO" resets state
6. After `window.onload`, `sw.js` is registered for offline caching (`index.html:44-49`)

### Ateliê Essenzia Scene Flow

1. `atelie/index.html` loads `audio.js`, `engine.js`, `stations.js`, `main.js` in sequence as classic scripts (exposing `Engine`, `ASMR`, `UI` as globals)
2. User taps "beginBtn" → `main.js` `begin()` calls `ASMR.start()`, hides intro, shows mute button, calls `Engine.init()` then `Engine.go("menu")` (`atelie/js/main.js:73-83`)
3. `Engine.go` is monkey-patched by `main.js` to also toggle the back button visibility before delegating to the original `Engine.go` (`atelie/js/main.js:52-56`)
4. `Engine` runs the `requestAnimationFrame` loop, tracks pointer position/velocity, renders the active scene from `scenes{}` (registered by `stations.js`), and crossfades between scenes using an offscreen `snapCanvas` (`atelie/js/engine.js:33-48`)
5. Individual "stations" (interactive mini-scenes) in `stations.js` render/react to pointer input and trigger `ASMR` sounds and `UI.hint()` prompts

**State Management:**
- No external state library; state lives in closures (module-scoped `let`/`const` inside each IIFE) and a small number of global namespace objects (`Engine`, `ASMR`, `UI`, `window.UI`)
- No persistence layer (no localStorage/IndexedDB usage detected in either app)

## Key Abstractions

**Scene registry (`atelie` only):**
- Purpose: Pluggable interactive "stations" registered into `Engine`'s `scenes` object and switched via `Engine.go(name, data)`
- Examples: `atelie/js/stations.js`, consumed by `atelie/js/engine.js`
- Pattern: each station is a plain object with lifecycle-style functions, added to the shared `scenes` map

**Game state machine (root game):**
- Purpose: Simple enum-based state (`MENU`, `PLAY`, `OVER`) gating render/update behavior
- Examples: `game.js:76-77`
- Pattern: single global `state` variable checked in the render/update loop

## Entry Points

**Root game entry:**
- Location: `index.html` → `game.js`
- Triggers: browser navigation to `/` (GitHub Pages root)
- Responsibilities: renders start screen, runs the racing minigame, registers service worker

**Ateliê entry:**
- Location: `atelie/index.html` → `atelie/js/audio.js`, `atelie/js/engine.js`, `atelie/js/stations.js`, `atelie/js/main.js` (load order matters — later scripts assume earlier globals exist)
- Triggers: browser navigation to `/atelie/`
- Responsibilities: renders intro/consent screen, then drives the ASMR "ateliê" simulator via `Engine`

**CI/CD entry:**
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

**What happens:** `Engine`, `ASMR`, and `UI` are plain globals with no module boundaries; `main.js` monkey-patches `Engine.go` after the fact (`atelie/js/main.js:52-56`).
**Why it's wrong:** Any script can silently redefine or shadow these globals; there's no compiler/linter enforcing the implicit contract between files.
**Do this instead:** If more files are added, keep the same lightweight-globals pattern already established here rather than introducing a bundler/module system mid-project — but add explicit comments (as already partially done) documenting which globals each file provides/consumes, and avoid further monkey-patching if avoidable.

### Duplicated WebAudio boilerplate

**What happens:** Both `game.js` (root) and `atelie/js/audio.js` independently implement `AudioContext` creation, oscillator/gain setup, and beep-style sound helpers.
**Why it's wrong:** Since the two apps are intentionally independent static sites with no shared build tooling, this duplication is by design rather than a defect — but it means audio behavior fixes must be applied twice.
**Do this instead:** When fixing audio bugs, check both `game.js` and `atelie/js/audio.js` for the same issue rather than assuming a shared fix location.

## Error Handling

**Strategy:** Defensive `try/catch` around browser API calls that may be unavailable (e.g. `AudioContext` construction), silently falling back to a no-op (`game.js:52-56`). Service worker fetch failures fall back to cache (`sw.js:27-33`).

**Patterns:**
- `try { ... } catch (e) { <fallback> }` around AudioContext creation in both apps
- Service worker `.catch(() => caches.match(e.request))` for offline fallback
- No centralized error logging or reporting — errors are swallowed silently by design (family/kids app, no telemetry)

## Cross-Cutting Concerns

**Logging:** None — no `console.log`/analytics/telemetry detected in either app.
**Validation:** None — no form inputs or external data to validate; all interaction is canvas/pointer-based.
**Authentication:** None — fully public static content, no accounts or backend.

---

*Architecture analysis: 2026-08-10*
