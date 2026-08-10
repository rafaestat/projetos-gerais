# Testing Patterns

**Analysis Date:** 2026-08-10

## Test Framework

**Runner:** None. No test runner, test framework, or test-related dependency exists in this repository.

**Evidence:**
- No `package.json` (no `npm test` script or dev dependencies)
- No `.eslintrc*`, `jest.config.*`, `vitest.config.*`, `playwright.config.*`, or similar config files
- No files matching `*test*` or `*spec*` under `game.js`, `atelie/`, `index.html`, or any application code path
- The only files matching "test"/"spec" in the whole repo live under `.claude/gsd-core/` — these are GSD tooling templates/workflows (e.g. `.claude/gsd-core/workflows/add-tests.md`, `.claude/gsd-core/templates/codebase/testing.md`), not project tests

**Run Commands:** None exist. There is no `npm test`, CI test step, or manual test script.

## CI/CD

**Workflow:** `.github/workflows/pages.yml` — "Deploy dos jogos"
- Triggers on push to specific branches (`claude/atelie-essenzia-asmr-FbS4A`, `claude/atelier-app-ux-jjlvcq`) or manual dispatch
- Only job: `deploy`, which uploads the repo root as a static artifact and publishes to GitHub Pages via `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`
- No test, lint, or build step is run — the pipeline is deploy-only

## Test File Organization

Not applicable — no test files exist.

## Verification Approach (De Facto)

Since there is no automated testing, correctness is verified manually/visually:
- Both apps are browser-based canvas games; changes are validated by running the app in a browser (see `run` skill for launching/screenshotting apps)
- `game.js` and `atelie/js/engine.js` contain runtime guard clauses (e.g. `if (!audioCtx) return;`) that act as informal defensive checks in place of tests

## Coverage

**Requirements:** None enforced — no coverage tooling present.

## Recommendations for Adding Tests

If test coverage is introduced in the future:
- This is a static, no-build, `<script>`-tag project with no `package.json`. Introducing a real test framework (e.g. Vitest, Jest) would first require adding `package.json` and a module system, or using a browser-native test approach (e.g. Playwright for end-to-end canvas/interaction testing) that doesn't require refactoring the existing global-script architecture
- Given the canvas/animation/audio-heavy nature of both apps (`game.js`, `atelie/js/engine.js`, `atelie/js/audio.js`), end-to-end/visual testing (Playwright screenshots) is likely more valuable than unit tests of individual draw functions
- Pure logic that could be unit-tested if extracted: collision detection and scoring logic in `game.js`, and station-transition logic in `atelie/js/stations.js`

---

*Testing analysis: 2026-08-10*
