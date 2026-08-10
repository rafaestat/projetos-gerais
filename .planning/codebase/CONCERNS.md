# Codebase Concerns

**Analysis Date:** 2026-08-10

## Context

This repository hosts two small, static, client-side web games/toys deployed to GitHub Pages, plus an installed GSD (Get Stuff Done) Claude Code workflow framework under `.claude/`. There is no backend, no build system, no package manager, and no automated test suite for either app. Concerns below focus on the actual product code (`game.js`, `atelie/js/*`, deploy config) since `.claude/` is third-party tooling, not application code.

## Deployment / CI Risk

**GitHub Pages workflow only triggers on feature branches, not on a stable default branch:**
- Issue: `.github/workflows/pages.yml` restricts `on.push.branches` to `claude/atelie-essenzia-asmr-FbS4A` and `claude/atelier-app-ux-jjlvcq` only. The repository currently has no `main`/`master` branch at all (`git branch -a` shows only `claude/atelier-app-ux-jjlvcq`, both local and `origin`).
- Files: `.github/workflows/pages.yml`
- Impact: Once this feature branch is merged/renamed or a conventional `main` branch is created, the deploy workflow silently stops firing (no push event matches), and the public site (`https://rafaestat.github.io/projetos-gerais/`) will not receive further updates. This is easy to miss because the workflow doesn't fail — it just never runs.
- Fix approach: Change the trigger to the actual long-lived branch (e.g., `main`) or add a fallback branch name; remove hardcoded feature-branch names once merged.

## Tech Debt

**No test coverage for either app:**
- Issue: `game.js` (root, "Corrida da Lara") and `atelie/js/*.js` ("Ateliê Essenzia") contain all game/animation logic inline in large IIFEs with zero automated tests. `find` across the repo (excluding `.claude/`) turns up no `*test*` files.
- Files: `/home/user/projetos-gerais/game.js`, `/home/user/projetos-gerais/atelie/js/audio.js`, `/home/user/projetos-gerais/atelie/js/engine.js`, `/home/user/projetos-gerais/atelie/js/stations.js`, `/home/user/projetos-gerais/atelie/js/main.js`
- Impact: Regressions in collision detection, scoring, or audio/particle timing can only be caught by manual play-testing in a browser.
- Fix approach: Given these are small canvas/audio toys, full unit testing is low ROI; at minimum extract pure functions (e.g., `hit()` collision check in `game.js:235`, lane math in `game.js:88`) into testable modules if the project grows.

**No linting/formatting configuration for app code:**
- Issue: No `.eslintrc*`, `.prettierrc*`, or `package.json` exists anywhere in the repo outside `.claude/` (which only references such tools in documentation templates, not for this repo's own code).
- Files: repo root (absence of config)
- Impact: Style consistency across `game.js` and `atelie/js/*.js` relies entirely on manual discipline; no automated catch for accidental globals, unused vars, etc.
- Fix approach: Add a lightweight ESLint config if the codebase grows beyond its current small size; not urgent at present scale.

**`stations.js` is a large single file mixing 7 unrelated mini-interactions:**
- Issue: `atelie/js/stations.js` is 1434 lines and (per its own README) implements all 7 "estações" (candle making, soap making, paper cutting, wood sanding, wax seal, beads, gift wrapping) in one file.
- Files: `atelie/js/stations.js`
- Impact: Any change to one station risks unintended side effects in another; the file is hard to navigate and review.
- Fix approach: Split into one module per station (e.g., `js/stations/candles.js`, `js/stations/soap.js`) sharing a common station interface, when adding new stations or fixing bugs.

## Known Bugs

None observed directly in code review; no bug tracker, issue list, or TODO/FIXME markers exist in `game.js` or `atelie/js/*.js` (searched for `TODO|FIXME|HACK|XXX` — all matches found are inside `.claude/` framework documentation/templates, not app code).

## Security Considerations

**Service worker caches all fetched resources without origin/scope restriction:**
- Risk: `sw.js` (`self.addEventListener("fetch", ...)`) intercepts every same-origin GET request and caches responses network-first. Since the app has no dynamic/user data and no API calls, actual risk is low, but the wildcard fetch handler will also cache any same-origin request the page happens to make (e.g., future analytics scripts) without an allowlist.
- Files: `/home/user/projetos-gerais/sw.js`
- Current mitigation: Only same-origin GET requests are intercepted (`if (e.request.method !== "GET") return;`); cache is versioned (`corrida-lara-v4`) and old caches are purged on `activate`.
- Recommendations: None urgent; note that `manifest.json`/`sw.js` are scoped to the root game only — `atelie/` has its own `manifest.json` but no dedicated service worker, so offline support is inconsistent between the two apps (see Fragile Areas).

**No input validation needed / no user data collected:**
- Both apps are entirely client-side with no forms, no network calls, no persisted user data beyond local canvas state — this significantly limits the security surface. No further action needed here.

## Performance Bottlenecks

No significant bottlenecks identified. Both apps use `requestAnimationFrame` loops with delta-time scaling (`game.js:159-165`, capped at `dt <= 2.5`) and canvas rendering sized to device pixel ratio capped at 2x (`game.js:40`), which is an appropriate, deliberate performance guard against very high-DPI screens.

## Fragile Areas

**Root app's PWA assets (`manifest.json`, `sw.js`, `icon.svg`) are not mirrored for `atelie/`:**
- Files: `/home/user/projetos-gerais/sw.js` (root only), `/home/user/projetos-gerais/atelie/manifest.json` (exists but no matching service worker)
- Why fragile: The root `sw.js` explicitly caches only root-level assets (`ASSETS` array in `sw.js:4-11`) and is scoped by its location at the repo root, so it cannot serve `/atelie/` requests. `atelie/` ships its own `manifest.json` (implying installable-PWA intent) but has no service worker, so it silently lacks offline support that its manifest implies.
- Safe modification: If offline support for `atelie/` is desired, add a dedicated `atelie/sw.js` registered from `atelie/index.html`, mirroring the root pattern with `atelie/`-relative asset paths.
- Test coverage: None (manual testing only).

**Global mutable state via closures in both apps:**
- Files: `game.js` (module-level `let state`, `player`, `obstacles`, etc. inside the single IIFE, lines 76-86), `atelie/js/main.js` (`window.UI`, `Engine.go` monkey-patched in place at `main.js:52-56`)
- Why fragile: `atelie/js/main.js:52-56` reassigns `Engine.go` at runtime (`Engine.go = (name, data) => {...}`) to wrap the original — a form of monkey-patching that depends on load order between `engine.js` and `main.js`. If script load order in `atelie/index.html` changes, this silently breaks scene transitions (back button visibility).
- Safe modification: Verify `atelie/index.html` script tag order (`engine.js` before `main.js`) is preserved before editing either file; consider replacing the monkey-patch with an explicit callback/event on `Engine`.

## Scaling Limits

Not applicable — both apps are fixed-scope, single-player, client-only canvas experiences with no backend, no accounts, and no data growth over time.

## Dependencies at Risk

**Zero external dependencies (by design):**
- Both apps use only vanilla JS, Canvas 2D, and Web Audio API with no npm packages, CDN scripts, or build tooling. This eliminates dependency-risk concerns entirely but also means there is no dependency-update mechanism to track (nothing to audit via `npm audit` or similar).

## Missing Critical Features

Not applicable to a personal/hobby project of this scope — no critical feature gaps identified relative to each app's stated purpose (see `README.md` and `atelie/README.md`).

## Test Coverage Gaps

**Entire codebase has zero automated test coverage:**
- What's not tested: Collision detection (`game.js:235` `hit()`), scoring/lives logic (`game.js:167-233` `update()`), all 7 `atelie/js/stations.js` mini-interactions, audio panning/reverb synthesis in `atelie/js/audio.js`.
- Files: `game.js`, `atelie/js/*.js`
- Risk: Any refactor (e.g., splitting `stations.js`, changing collision math) can only be validated by manual play-testing across browsers/devices.
- Priority: Low — given the project's small, static, hobby-scale nature and lack of a CI test step, this is acceptable as-is; revisit only if the codebase grows substantially or gains contributors.

---

*Concerns audit: 2026-08-10*
