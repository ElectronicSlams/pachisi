# eSlams — Design Notes v3

> *Here, AI plays games.*
> Canonical build: **`eSlams v2.html`** (the v3 work extends this same entry). `eSlams.html` is the original landing exploration, kept for reference; all pages and routes below are shared and current.

This note covers **what changed in v3**. For the full product rationale, design language, token list, and architecture, see `DESIGN_NOTES.md` (v2). v3 is additive — nothing from v2 was removed.

---

## 1. What's new in v3

### 1.1 Five-up grids
Both game grids now lay out **5 columns** (was 4 / 6). With exactly 50 games it divides cleanly into 10 rows.
- Landing **"Every game we play"** grid → 5-up (responsive: 5 → 3 → 2 → 1).
- Leaderboard **expanded per-arena breakdown** → 5-up (responsive: 5 → 4 → 3 → 2).

### 1.2 Leaderboard → Model page (progressive disclosure)
Clicking a model row **expands** the inline per-arena breakdown (unchanged). **Clicking the same row again** — or the new **"Full model page →"** button in the expanded header — navigates to that model's dedicated page. In game-filtered mode, a row click goes straight to the model page. Each per-arena cell in the breakdown now links to that **game page**.

### 1.3 Model page — `eslams.com/models/<provider>/<model>`
A full performance dossier for any model:
- Breadcrumb (Models › Provider › Model), big identity badge, overall rank medal.
- Stat tiles: Score · Elo · Win rate · Games.
- Overview: **win rate by arena type**, **score trend** sparkline, **strongest arenas**.
- **Featured replays** — tabbed, scrubbable board playback (Chess, Go, …) from the shared replay engine.
- **Per-game performance** — all 50 arenas, filterable by category and sortable by win rate / Elo / rank, every row links to the game page.

### 1.4 Provider page — `eslams.com/models/<provider>`
A summary for any provider: tier badge, best model / top rank / avg win rate / total games, and a card grid of **every model from that provider** with score, win rate, Elo, and a trend sparkline.

### 1.5 Game page — `eslams.com/games/<game>`
A reference page for any of the 50 arenas:
- Hero (icon, category, difficulty, variant, player count) + Play / Watch CTAs.
- **Arena leader** strip (links to the model page).
- **How it works on eSlams**, **Scoring & outcomes**, and **Artifacts & replays** (with a `eslams replay …` terminal) — rule copy is generated per-category so every arena reads sensibly.
- **Example replay** (live board playback where available).
- **Full per-game model leaderboard** with difficulty tabs.

### 1.6 Auth — `eslams.com/login` and `eslams.com/signup`
Split-screen flow (brand panel + form; header stays, footer hidden):
- **SSO:** Continue with **GitHub** / **Google**.
- **Email** path with inline validation.
- **Username (required)** shown with the `eslams.com/` profile prefix, **Email (required)**, **Name (optional)**, **Profile photo (optional)** — uploaded or *pulled automatically from GitHub / Google*.
- Success state confirms the account and links to the profile. Discoverable from the footer **Account** column and the mobile menu.

### 1.7 Header / footer housekeeping
- Footer gained an **Account** column (Sign in · Create account · Profile · API keys); "Sign in" added to the mobile menu.

---

## 2. Template pages adapt to every model, game & provider

> **Important for build & review:** the Model, Provider, and Game pages are **data-driven templates, not 200 hand-built pages.**

Each reads its identifier from the route and renders from the data layer:
- `#/models/<provider>/<model>` → `ModelPage` resolves the model from `ES.modelById` and computes its per-arena breakdown on the fly.
- `#/models/<provider>` → `ProviderPage` filters `ES.models` by provider.
- `#/games/<slug>` → `GamePage` resolves the arena from `ES.gameBySlug`, generates rule copy from the game's **category**, and builds the per-game leaderboard live.

So **all 38 models, 80+ providers, and 50 games already have working pages** — every leaderboard row, champion badge, and arena tile deep-links to a real, populated page. In production these templates bind to the live eval database; here they bind to the deterministic demo dataset. Unknown identifiers render a clean **not-found** state rather than breaking. Game-page rule copy is intentionally **category-level** (Board / Card / Strategy / RL); per-game authored copy is a content task, not a design one.

---

## 3. New / changed files (v3)

| File | Purpose |
|---|---|
| `app/page-model.jsx` | `ModelPage` + `ProviderPage` templates |
| `app/page-game.jsx` | `GamePage` template (+ per-category rule copy) |
| `app/page-auth.jsx` | `AuthPage` (login / signup) |
| `styles/pages4.css` | Styles for model / provider / game / auth pages |
| `app/app-v2.jsx`, `app/app.jsx` | Routes for `models`, `games`, `login`, `signup` |
| `app/page-leaderboard.jsx` | Second-click-to-navigate + "Full model page" affordance + game-cell links |
| `app/shell-v2.jsx` | Footer Account column + mobile Sign-in |
| `styles/landing.css`, `styles/pages.css` | 5-column grids |

Architecture is otherwise unchanged from v2 (no build step; React 18 + Babel-standalone; plain-JS data + JSX components/pages; CSS-variable tokens in `styles/tokens.css`).

---

## 4. Still to perfect (updated punch-list)

Carried from v2 (still the highest-value work):
1. **Real engines for marquee games** — wire genuine Chess (legal moves + engine) and Texas Hold'em so "50 games wired for live play" is literally true in the Arena.
2. **Unify champion ↔ leaderboard data** so the home-page champion for a game matches that game page's #1 exactly. (Game page and model breakdown already share `gameBreakdown`; the landing champions use a separate strength-weighted estimate — converge them.)
3. **Live data plumbing** — real match/queue/sweep state and a real GitHub count.

New in v3:
4. **Per-game authored rules.** Replace category-level rule copy with real per-game rules, legal-move notes, and scoring specifics (content pass).
5. **Auth is front-end only.** Wire real OAuth (GitHub/Google), email verification, username availability checks, and photo upload/storage; persist the session and reflect logged-in vs logged-out state in the header (the avatar currently assumes a signed-in demo user).
6. **Replay fidelity on template pages.** Model/Game replays use representative sequences; bind them to the model's *actual* stored `.eslams` artifact for that arena.
7. **Deep-linkable filters & SEO.** Make leaderboard filters and game-difficulty tabs reflect in the URL; pre-render model/game/provider pages for share/SEO.
8. **Accessibility** — focus-trap modals, keyboard board play, ARIA on the new tables and breadcrumbs.

---

*Tokens (`styles/tokens.css`) remain ready for a 1:1 Tailwind/Next.js port — map colors, radii, shadows, and fonts into `theme.extend`.*
