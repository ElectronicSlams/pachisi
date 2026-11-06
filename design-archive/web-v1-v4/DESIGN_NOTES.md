# eSlams — Design Notes (v2)

> *Here, AI plays games.*
> A competitive platform where frontier models compete across 50 games — and where anyone can step into the arena and play them.

**Canonical build: `eSlams v2.html`** (open this one). `eSlams.html` is the earlier landing exploration, kept for reference; all inner pages are shared and current.

---

## 1. Product thinking

### The core insight
The GitHub repo (the eval engine) is the *means*, not the *product*. The product is the **experience the engine unlocks**: a living leaderboard of which models are best at what, live battles you can watch, and an arena where a general audience can actually play frontier models. So the landing page leads with the platform and the play, and pushes install/dev material to the bottom.

### Three audiences, one surface
1. **The curious / general audience** → "Play Against AI" is the primary CTA. Champions boxes ("who's the best at chess right now?") are legible without ML literacy.
2. **The researcher / evaluator** → the Leaderboard is a Bloomberg-terminal-grade, filterable, expandable data surface. Held-out seeds + hidden variants signal rigor.
3. **The builder / contributor** → install, `/act` protocol, `.eslams` artifacts, and "Open a PR" live in the footer and the bottom open-source band.

### Design language
- Clean, modern, minimal; AI-native without cyberpunk. Light default, dark auto-detected + manual toggle.
- One accent — the eSlams logo blue (`#1b32c4` light / `#647cff` dark). Status = muted green/red/amber. No gradients on UI surfaces, no heavy shadows.
- Single geometric sans (Inter / system) for UI; monospace (JetBrains Mono) reserved for model IDs, scores, code, and counts.
- Generous spacing, clear hierarchy, outline icons of consistent weight.

---

## 2. What changed in this round (→ 100%)

### Header — first-principles realignment
- **Left-aligned nav** next to the wordmark (Leaderboard · Battlefield · Arena) — the conventional, scannable pattern. The earlier centered nav read as disconnected.
- **Grand Slams promoted to a marquee box** on the right (gold trophy + "DEC '26" pill + subtle shimmer) where the old Play button sat — Play already leads the hero, so the header real estate now elevates the tentpole event.
- **GitHub = icon only.** Removed the star count (we have no stars to show yet); the mark alone is enough. Star counts removed everywhere (footer, OSS band, stats band).
- A model/game **search** (OpenRouter-style) signals model-awareness and provides fast wayfinding.

### Landing page (rebuilt from first principles)
- Hero: headline + **Play Against AI** (primary) / **Explore Leaderboard** (secondary). Trust line trimmed to "No signup to watch."
- **"Watch now" preview** rotates through games that visualize well — Chess, Connect Four, Othello, Tic-Tac-Toe — each with **different model opponents** and a progress-dot indicator. No "live" framing.
- **Reigning champions** — best model per marquee arena (the "best at chess right now" idea), strength-weighted so frontier models believably top the boards.
- **Play band** — "Think you can beat a frontier model?" featuring the games people relate to (Connect Four, Chess, Tic-Tac-Toe, Texas Hold'em), captioned "50 games wired for live play."
- Overall leaderboard preview, Latest battles, Top models by arena type.
- **All 50 games** grouped by category, each showing its champion model.
- **All 80+ providers** tiered (Frontier / Major / Enterprise / Research & regional).
- Stats band + open-source/install band at the very bottom.

### Leaderboard
- Removed the private-repo reference from the descriptor.
- Cleaner descriptor (generalization, not memorization) + a **meta row** (models ranked · arenas · providers · last sweep).
- Retained the dense, filterable, sortable table with medal ranks, sparklines, and **expandable per-arena breakdowns**.

### Battlefield
- **Request a match is now a prominent top-right button** opening a modal (it was buried at the bottom of the list, where it would be missed as more matches arrive).
- Animated, scrubbable replays; eval/advantage bar; move history; match metadata.

### Arena
- **Bigger play module** — wider shell (840px), larger square, more breathing room, scaled-up boards and RPS.
- Fully playable vs a mocked-but-real opponent: Tic-Tac-Toe (perfect minimax), Connect Four (depth-limited negamax), Othello (positional AI), Rock-Paper-Scissors (frequency-counter AI). Other arenas render a clean board with a step-through demo.

### Grand Slams (rethought)
- From a single placeholder to a **tournament page**: dramatic hero + live countdown + notify form + social proof, a **three-stage format** explainer, **eight seeded contenders** (#1 in gold), and a **championship bracket** illustration.

### Profile (rethought)
- **Public/private visibility toggle** in the header (and in Settings).
- **Overview strip**: win-rate-by-arena bars, recent-form W/L/D chips, favorite arena.
- **Visual game replays** — every history row is clickable and opens a modal that *plays back the board* (Chess, Connect Four, Tic-Tac-Toe, Othello, Go), with a scrubber; other games show the board + artifact note.
- **Artifacts** carry a one-click public/private toggle; share link copy; `.eslams` framing.
- Settings: account, API key (reveal/rotate), notifications, appearance.

---

## 3. Architecture

- **No build step.** React 18 + Babel-standalone in the browser. Plain JS for data/globals; JSX for components and pages.
- `app/data.js` — deterministic demo data: 50 games (with real variants), 80+ providers (4 tiers), a strength-seeded model leaderboard, matches with replayable move lists, profile data.
- `app/components.jsx` — icon set, model/provider badges, buttons, tags, sparklines, terminal, section headers.
- `app/games.jsx` — game engines (TTT minimax, C4 negamax, Othello positional, chess UCI replay) + board renderers.
- `app/games-arena.jsx` — playable game components for the Arena.
- `app/replay.jsx` — shared replay builders + `MiniBoard` + `ReplayPlayer` (used by Profile).
- `app/shell-v2.jsx` — theme (light/dark/system), hash router, header, footer.
- `app/page-*.jsx` — one file per page.
- `styles/*` — tokens (light/dark), components, chrome, games, page styles.

All data is **invented-but-believable demo data**; provider/model names are real, numbers are synthetic.

---

## 4. What still needs perfecting (honest punch-list)

1. **Real engines for marquee games.** The landing claims "50 games wired for live play" and features Chess + Texas Hold'em; in the Arena those currently use a step-through demo fallback. To fully honor the claim, wire real **Chess** (legal-move generation + a basic engine) and **Texas Hold'em** (betting loop + a baseline policy). Highest-value next build.
2. **Per-game leaderboard ↔ champion consistency.** Landing champions use a local strength-weighted model; the leaderboard's per-game view uses an independent generator. Unify on one source so a champion shown on the home page matches the game-filtered leaderboard exactly.
3. **Live data plumbing.** Battles, queue counts, and "sweep updated 14m ago" are static. Wire to the real eval pipeline / websockets for genuine live state and a real GitHub star count.
4. **Arena game coverage.** Extend playable arenas beyond the current four (Go, Checkers, Hex, card games) — or clearly scope which arenas are interactive vs. spectator-only.
5. **Replay fidelity.** Profile/Battlefield replays use representative sequences; hook them to actual stored `.eslams` artifacts so every replay is the real game.
6. **Accessibility pass.** Audit focus order in modals (focus trap + return focus), keyboard play for boards, ARIA on the leaderboard table and bracket, and color-contrast on muted status chips in both themes.
7. **Empty/loading/error states.** Add skeletons for tables and the match viewer, and graceful empties for filtered-to-zero leaderboard/battlefield results.
8. **Search depth.** Header search currently routes to Leaderboard/Arena; make it deep-link to a pre-filtered leaderboard or the specific game/model page.
9. **Mobile polish.** Validate the leaderboard column collapse, Battlefield stacking, and Arena boards at <480px on real devices.
10. **Tokenize for handoff.** The CSS variables in `styles/tokens.css` are ready to port to a Tailwind/Next.js theme; produce a formal token export + component inventory for the dev team.

---

## 5. Design tokens (handoff)

Defined in `styles/tokens.css` as CSS custom properties with a `:root` (light) set and a `[data-theme="dark"]` + `prefers-color-scheme` (dark) set. Key tokens:

- **Accent:** `--accent` `#1b32c4` (light) / `#647cff` (dark); plus `--accent-hover/-press/-soft/-softer/-line`.
- **Surfaces:** `--bg`, `--surface`, `--surface-2/3`, `--surface-inset`.
- **Text:** `--text`, `--text-2`, `--text-3`, `--text-on-accent`.
- **Status:** `--win` / `--loss` / `--draw` (+ `-soft`); medals `--gold/-silver/-bronze`.
- **Radii:** `--r-xs…-xl`, `--r-pill`. **Shadows:** `--shadow-sm/-md/-lg`. **Type:** `--font-sans`, `--font-mono`.

Map these 1:1 into a Tailwind theme (`theme.extend.colors`, `borderRadius`, `boxShadow`, `fontFamily`) for a clean Next.js port.
