# Codebase Structure

**Analysis Date:** 2026-08-10

## Directory Layout

```
projetos-gerais/
├── index.html          # Root game: "Corrida da Lara" HTML shell
├── game.js              # Root game: canvas game logic (state machine, rendering, audio)
├── style.css             # Root game: styles
├── manifest.json          # Root game: PWA manifest
├── sw.js                  # Root game: service worker (offline cache)
├── icon.svg               # Root game: app icon
├── README.md              # Repo-level overview of both games and their URLs
├── atelie/                # Second static site: "Ateliê Essenzia" ASMR simulator
│   ├── index.html          # Ateliê HTML shell (intro screen, canvas stage, UI chrome)
│   ├── manifest.json         # Ateliê PWA manifest
│   ├── styles.css            # Ateliê styles
│   ├── icon.svg               # Ateliê app icon
│   ├── README.md               # Ateliê-specific notes (headphones/spatial audio)
│   └── js/
│       ├── audio.js            # `ASMR` global — WebAudio sound design
│       ├── engine.js            # `Engine` global — canvas loop, pointer tracking, scene crossfade
│       ├── stations.js           # Scene/"station" definitions registered into `Engine`
│       └── main.js                # Entry point — wires UI, boots `Engine`/`ASMR`
├── .github/
│   └── workflows/
│       └── pages.yml            # GitHub Actions: deploys repo root to GitHub Pages
├── .planning/                    # GSD planning artifacts (phases, codebase docs, etc.)
│   └── codebase/                  # This directory — generated codebase analysis docs
└── .claude/                        # GSD AI-tooling installation (commands, agents, hooks, core lib)
    ├── commands/                     # Slash-command definitions (gsd-*.md)
    ├── agents/                        # Subagent definitions (gsd-*.md)
    ├── hooks/                          # Node/shell hooks wired into Claude Code lifecycle
    └── gsd-core/                        # Core GSD runtime: bin/lib (.cjs modules), workflows, templates, references
```

## Directory Purposes

**Repo root (`/`):**
- Purpose: Hosts the "Corrida da Lara" racing game as the default GitHub Pages site
- Contains: `index.html`, `game.js`, `style.css`, `sw.js`, `manifest.json`, `icon.svg`
- Key files: `index.html` (entry), `game.js` (all game logic)

**`atelie/`:**
- Purpose: Hosts the "Ateliê Essenzia" ASMR simulator as a second, independently-addressable GitHub Pages site (`/atelie/`)
- Contains: `index.html`, `styles.css`, `manifest.json`, `icon.svg`, `README.md`, and `js/` subfolder
- Key files: `atelie/index.html` (entry), `atelie/js/main.js` (wiring/entry logic)

**`atelie/js/`:**
- Purpose: All JavaScript for the Ateliê app, split by concern
- Contains: `audio.js` (sound), `engine.js` (rendering/input loop), `stations.js` (scene content), `main.js` (UI glue/entry)
- Key files: load order in `atelie/index.html` is audio → engine → stations → main; this order must be preserved when editing script tags

**`.github/workflows/`:**
- Purpose: CI/CD — single workflow that deploys the whole repo root as a static site
- Contains: `pages.yml`
- Key files: `pages.yml` — note it only triggers on two specific `claude/*` branches plus manual dispatch, not `main`

**`.planning/`:**
- Purpose: GSD (this AI workflow tool's) planning state — phases, roadmap, and codebase docs
- Contains: `codebase/` (this doc set), plus other GSD-managed planning files as the project uses the `/gsd-*` commands
- Generated: yes (by GSD commands); Committed: yes (part of repo)

**`.claude/`:**
- Purpose: Claude Code / GSD tooling installation — not part of the deployed web apps
- Contains: `commands/` (slash commands), `agents/` (subagent prompts), `hooks/` (lifecycle scripts), `gsd-core/` (runtime library, workflows, templates)
- Generated: mostly by the GSD installer/updater; Committed: yes

## Key File Locations

**Entry Points:**
- `index.html`: root game HTML/DOM structure, loads `game.js` and registers `sw.js`
- `atelie/index.html`: ateliê HTML/DOM structure, loads the four `atelie/js/*.js` files in order

**Configuration:**
- `manifest.json` (root): PWA metadata for the racing game
- `atelie/manifest.json`: PWA metadata for the ateliê app
- `.github/workflows/pages.yml`: deployment configuration/trigger branches

**Core Logic:**
- `game.js`: entire root game implementation (state machine, canvas draw, input, scoring, audio)
- `atelie/js/engine.js`: canvas/animation loop, pointer tracking, particle/crossfade system
- `atelie/js/stations.js`: interactive scene content (largest file, 1434 lines)
- `atelie/js/audio.js`: WebAudio sound design for the ateliê app
- `atelie/js/main.js`: entry wiring, UI chrome (hint/back/mute), scene navigation interception

**Testing:**
- Not applicable — no test framework, test files, or test runner present in this repository

**Offline/PWA:**
- `sw.js`: root game's service worker (network-first cache strategy); `atelie/` has no service worker

## Naming Conventions

**Files:**
- Root game: flat, single-word lowercase files at repo root (`game.js`, `style.css`, `manifest.json`, `sw.js`)
- Ateliê app: same conventions but namespaced under `atelie/`, with JS split by responsibility into `atelie/js/*.js`

**Directories:**
- Lowercase, single-word (`atelie`, `js`)
- Each deployable site gets its own top-level (or root) directory matching its GitHub Pages URL path

**Language/Copy:**
- All user-facing text and code comments are written in Brazilian Portuguese (pt-BR) in both apps

## Where to Add New Code

**New feature/mechanic in the root racing game:**
- Add directly to `game.js`; there is no module system, so keep new functions inside the existing top-level IIFE (`(() => { ... })()`) to avoid polluting `window`
- New DOM elements go in `index.html`, styled in `style.css`

**New "station"/scene in the Ateliê app:**
- Add a new scene object to `atelie/js/stations.js` and register it into `Engine`'s `scenes` map following the existing pattern
- If it needs new sounds, add helper functions to `atelie/js/audio.js` (exposed via the `ASMR` global)
- If it needs new UI chrome (buttons, hints), extend `atelie/js/main.js` and `atelie/index.html`

**New standalone site/game:**
- Create a new top-level directory (mirroring the `atelie/` pattern: `index.html`, `styles.css`, `manifest.json`, `js/`) so it gets its own GitHub Pages sub-path
- Update `.github/workflows/pages.yml` trigger branches if needed (currently deploys the whole repo root regardless of which site changed) and add the new game to `README.md`'s table

**Utilities:**
- No shared utility layer exists between the two apps; duplicate small helpers per-app rather than introducing a shared module system, consistent with the current zero-build-step architecture

## Special Directories

**`.claude/`:**
- Purpose: GSD AI workflow tooling (commands, agents, hooks, core runtime library)
- Generated: Yes (by GSD installer)
- Committed: Yes
- Note: not part of the deployed web apps; safe to ignore when reasoning about `game.js`/`atelie/` runtime behavior

**`.planning/`:**
- Purpose: GSD planning documents (phases, roadmap, this codebase analysis)
- Generated: Yes (by GSD commands)
- Committed: Yes

**`.github/`:**
- Purpose: CI/CD workflow definitions
- Generated: No (hand-authored)
- Committed: Yes

---

*Structure analysis: 2026-08-10*
