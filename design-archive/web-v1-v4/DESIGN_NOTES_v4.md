# eSlams — Design Notes v4

> *Here, AI plays games.*
> Canonical build: **`eSlams v4.html`** (copied from v3 / `eSlams v2.html` and extended — not rebuilt). Earlier entries (`eSlams v2.html`, `eSlams.html`) remain for reference; all `app/*` and `styles/*` files are shared and current.

This note covers **what changed in v4**. For full product rationale, design language, tokens, and architecture see `DESIGN_NOTES.md` (v2) and `DESIGN_NOTES_v3.md` (v3). v4 is additive — nothing prior was removed.

---

## 1. What changed in v4

### 1.1 Game tiles redesigned as compact squares, grounded in real data
The landing **"Every game we play"** grid and the Arena **"Choose an arena"** grid now use a single shared **`.gtile`** square card:
- Centered icon → game name (2-line clamp, even heights) → **the real variant token** in mono (e.g. `standard`, `board_9x9`, `core_hit_stand_s17`, `core_profiled_no_limit`).
- Hover: lift + accent top-rule + icon tint. Selected (Arena): accent ring.
- Both grids are a true **5-up** (50 games → clean 10×5), responsive **5 → 4 → 3 → 2**.

**Why:** the old tiles showed a single per-game *difficulty* that was effectively arbitrary, plus a "top model" — neither belongs on a game tile (every model plays every game; every game has all three difficulty levels). The honest, distinguishing per-game attribute is the **variant**, so that's what the tile now surfaces.

### 1.2 Data grounded to the official suite (`suites/official-hidden-v2.yaml`)
- **Variants** verified against the official list for all 50 games (they matched).
- **Categories corrected:** `liars-dice` and `goofspiel` moved from Strategy → **Card & Hidden-Info**, matching the official grouping. Counts are now **Board & Strategy 16 · Card & Hidden-Info 17 · Social & Economic 5 · Control & Arcade 12 = 50**.
- **Category labels** updated to the official group names: *Board & Strategy, Card & Hidden-Info, Social & Economic, Control & Arcade*.
- **Difficulty model fixed:** every game exposes the same **three scenario levels** (Beginner / Intermediate / Advanced), added as `ES.levels`. A single per-game difficulty is no longer shown anywhere.

### 1.3 Difficulty surfaced correctly where it belongs
- **Game page** hero now reads **"3 scenario levels · Beginner · Intermediate · Advanced"** (all three), not one.
- **Game-filtered leaderboard** header shows the category + a **"3 levels"** chip instead of a single random difficulty.
- The game-page per-arena leaderboard keeps its **difficulty tabs** (All / Beginner / Intermediate / Advanced), which is now consistent with the data model.
- Card-category rule copy reworded to "hidden-information game" so it reads correctly for Liar's Dice / Goofspiel as well as card games.

### 1.4 Responsiveness audit + tightening
Reviewed every page's breakpoints for coherence (mobile / tablet / desktop):
- Game grids 5→4→3→2; leaderboard table progressively drops columns at 1080/760; Battlefield stacks at 980; Arena stacks at 920; model/provider/game grids and the auth split all collapse cleanly; footer 4→2→1.
- Fixes: game-page hero "2-player" no longer wraps; tile name heights equalized; tightened tile spacing and hover.

---

## 2. Template pages still adapt to every model, game & provider
Unchanged from v3 and worth restating: the Model (`/models/<provider>/<model>`), Provider (`/models/<provider>`), and Game (`/games/<slug>`) pages are **data-driven templates**. Every one of the 38 models, 80+ providers, and 50 games already resolves to a populated page; unknown ids show a clean not-found state. Game-page rule copy is **category-level** by design — per-game authored rules remain a content task, not a design one.

---

## 3. Files touched in v4

| File | Change |
|---|---|
| `app/data.js` | Re-categorized liars-dice/goofspiel; official category labels; added `levels` |
| `app/page-home-v2.jsx` | Landing tile → `.gtile` with variant |
| `app/widgets.jsx` | Arena `GameCard` → `.gtile` with variant (no top-model) |
| `styles/landing.css` | New square `.gtile` system + 5→4→3→2 breakpoints |
| `app/page-game.jsx` | Hero shows all 3 levels; Card rule copy reworded |
| `app/page-leaderboard.jsx` | Game-mode header shows "3 levels" |
| `styles/pages4.css`, `styles/pages.css` | `gp-levels`, `gh-levels`, nowrap fixes |
| `eSlams v4.html` | New canonical entry (copy of v2 wiring) |

No architectural change: no build step; React 18 + Babel-standalone; plain-JS data + JSX components/pages; CSS-variable tokens in `styles/tokens.css` (ready for a 1:1 Tailwind/Next.js port).

---

## 4. Still to perfect (carried forward)
1. **Real engines for marquee games** — genuine Chess (legal moves + engine) and Texas Hold'em so "wired for live play" is literally true in the Arena.
2. **Unify champion ↔ leaderboard data** so a game's home/landing champion matches its game-page #1 exactly.
3. **Live data plumbing** — real match/queue/sweep state and a real GitHub count.
4. **Per-game authored rules** — replace category-level copy with real per-game rules, legal moves, and scoring.
5. **Auth is front-end only** — wire real OAuth, email verification, username availability, photo storage; reflect logged-in state in the header.
6. **Replay fidelity** — bind template-page replays to actual stored `.eslams` artifacts.
7. **Accessibility** — focus-trap modals, keyboard board play, ARIA on tables/breadcrumbs.
8. **Device QA** — validate the audited breakpoints on real hardware (the in-tool rasterizer can't screenshot nested-iframe widths).
