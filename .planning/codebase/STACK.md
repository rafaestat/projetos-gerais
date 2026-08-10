# Technology Stack

**Analysis Date:** 2026-08-10

## Languages

**Primary:**
- HTML5 - Page structure for both apps (`index.html`, `atelie/index.html`)
- Vanilla JavaScript (ES6+, no transpilation) - Game logic and app engine (`game.js`, `atelie/js/*.js`)
- CSS3 - Styling (`style.css`, `atelie/styles.css`)

**Secondary:**
- YAML - GitHub Actions workflow config (`.github/workflows/pages.yml`)
- JSON - PWA manifests (`manifest.json`, `atelie/manifest.json`)

## Runtime

**Environment:**
- Browser-only, client-side static site. No Node.js runtime, no server-side code.
- No `package.json` present — this is a dependency-free, build-free project.

**Package Manager:**
- None. No npm/yarn/pnpm. No lockfile.

## Frameworks

**Core:**
- None. Pure vanilla JS using the Canvas 2D API (`game.js`) and Web Audio API (`atelie/js/audio.js`).
- No UI framework (no React/Vue/etc), no bundler, no transpiler.

**Testing:**
- None detected. No test framework, no test files.

**Build/Dev:**
- None. Files are served as-is; no build step (no webpack/vite/esbuild/babel config found).

## Key Dependencies

**Critical:**
- None (zero external JS libraries/CDN imports found in either app).

**Infrastructure:**
- Service Worker API - offline caching for the root app (`sw.js`), network-first strategy, cache name `corrida-lara-v4`.
- Web App Manifest / PWA - both apps are installable PWAs (`manifest.json`, `atelie/manifest.json`).

## Configuration

**Environment:**
- No environment variables or `.env` files used — fully static, no secrets/config needed.

**Build:**
- No build config files (no `tsconfig.json`, `webpack.config.js`, `vite.config.js`, etc.)
- Deployment/publish config only: `.github/workflows/pages.yml`

## Platform Requirements

**Development:**
- Any modern browser; no install/server needed. `atelie/README.md` explicitly states "não precisa instalar nada, nem servidor."
- Recommended: local static file server or direct file:// open for quick iteration.

**Production:**
- GitHub Pages, served from the repository root.
- Two apps in one repo/deploy:
  - `Carrinho da Lara` (canvas racing game) at repo root `/`
  - `Ateliê Essenzia` (ASMR sensory simulator) at `/atelie/`

## Repository Structure Summary

- `index.html`, `game.js`, `style.css`, `manifest.json`, `sw.js`, `icon.svg` — root game ("Carrinho da Lara")
- `atelie/index.html`, `atelie/styles.css`, `atelie/manifest.json`, `atelie/icon.svg` — Ateliê app shell
- `atelie/js/audio.js` — procedural/binaural Web Audio synthesis engine
- `atelie/js/engine.js` — canvas rendering, particles, pointer input, scene transitions
- `atelie/js/stations.js` — menu and the 7 crafting "stations" (candles, soap, paper cutting, wood sanding, wax seal, beads, gift wrapping)
- `atelie/js/main.js` — entry point and minimal UI wiring

---

*Stack analysis: 2026-08-10*
