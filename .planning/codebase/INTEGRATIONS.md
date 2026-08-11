# External Integrations

**Analysis Date:** 2026-08-10

## APIs & External Services

**None.** No external HTTP APIs, third-party SDKs, or analytics/tracking scripts are used by either app. Both apps are fully self-contained static clients with no network calls at runtime beyond loading their own assets.

## Data Storage

**Databases:**
- None. No backend, no database.

**File Storage:**
- Local filesystem only, via the browser's Cache Storage API (Service Worker), root app only:
  - `sw.js` caches `./`, `./index.html`, `./style.css`, `./game.js`, `./manifest.json`, `./icon.svg` under cache key `corrida-lara-v4`.
  - Strategy: network-first, falls back to cache when offline.
  - The `atelie/` app has no service worker / no offline caching.

**Caching:**
- Browser Cache Storage API (root app's `sw.js`) — no server-side or third-party caching (no CDN config, no Redis, etc).

## Authentication & Identity

**Auth Provider:**
- None. No login, no user accounts, no auth of any kind — apps are open, anonymous, single-player experiences.

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, no analytics SDKs).

**Logs:**
- None beyond default browser console; no explicit logging framework.

## CI/CD & Deployment

**Hosting:**
- GitHub Pages, project site at `https://rafaestat.github.io/projetos-gerais/` (root game) and `https://rafaestat.github.io/projetos-gerais/atelie/` (Ateliê Essenzia).

**CI Pipeline:**
- GitHub Actions: `.github/workflows/pages.yml` ("Deploy dos jogos")
  - Triggers: `push` to branches `claude/atelie-essenzia-asmr-FbS4A` and `claude/atelier-app-ux-jjlvcq`, plus manual `workflow_dispatch`.
  - Steps: `actions/checkout@v4` → `actions/configure-pages@v5` → `actions/upload-pages-artifact@v3` (uploads entire repo root as the Pages artifact) → `actions/deploy-pages@v4`.
  - Permissions: `contents: read`, `pages: write`, `id-token: write`.
  - Concurrency group `pages` with `cancel-in-progress: true` (single deploy at a time).
  - Note: workflow only deploys on pushes to the two `claude/*` branches listed above, not on `main`/master by default — verify branch name matches current default branch if deploys stop firing.

## Environment Configuration

**Required env vars:**
- None.

**Secrets location:**
- None used; no `.env` file present in the repository.

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None.

---

*Integration audit: 2026-08-10*
