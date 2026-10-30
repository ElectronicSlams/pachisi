# Tech Note — Battlefield & Arena visualization: which libraries to use (and which not to)

**Status:** Recommendation, for engineering + design review. Companion to
`DESIGN_NOTE_battlefield.md` (the experience) and `DESIGN_BRIEF.md` (the house language).
**Date:** 2026-07-07 (revised after the v0.5 "Arena rebuild" landed on `main`). **Scope:** how
Battlefield **and Arena** (and the shared replay player at `/replays`, `/matches`) should render
~50 games across 11 renderer families, live and on-demand, inside the real stack — **with one
shared renderer, not three.**

> **TL;DR of the revision:** The Arena rebuild (v0.5, merged `c7315c4`) added no visualization
> library — it's still 100% first-party — which *confirms* the build-thin thesis below. It also
> revealed the real problem: **a good per-family renderer set already exists in
> `platform-pages.tsx` and is used by Arena + `/replays` + match-detail, but Battlefield forked a
> degraded generic-grid copy of it.** The headline recommendation is now **extract that set into
> one shared module, delete Battlefield's fork, and have Arena + Battlefield + replays all consume
> the same renderers** — then polish that one set. See §1.5.

> Every claim about bundle size, license, and SSR/edge behaviour below was verified against the
> live package registry, upstream license files, and the repo at the pinned versions. Two
> ambient assumptions were corrected in the process — see **§0 Reality check**.

---

## 0. Reality check (read first)

- **Stack is Next 16.2.7 + React 19.2.4**, `react-dom` 19.2.4, `@opennextjs/cloudflare` 1.13.2
  (latest 1.20.1 — we're ~7 minors behind; worth a bump), `wrangler` 4.96, **build uses
  `--webpack`** (not Turbopack). Any doc saying "Next 15" is stale.
- **Runtime is the Cloudflare Workers _Node.js_ runtime**, not the Edge runtime.
  `@opennextjs/cloudflare` explicitly does **not** support `export const runtime = 'edge'` — never
  add it to a replay/battlefield route. Libraries don't need to be edge-pure; they need to be
  SSR-safe under Node polyfills **or** cleanly client-only-lazy.
- **Per-route JS budgets are documented but NOT enforced.** The real documented table is `/` 180KB,
  `/leaderboard`·`/models`·`/games` 220KB, `/arena` 350KB, `/replays/:id` 300KB (gz, first-load).
  **There is no `/battlefield` budget line at all** (treat it like `/replays`). There is **no
  `size-limit`/`bundle-analyzer` CI gate** — a heavy import would sail through CI today. Wiring a
  size gate should be part of this work, because the whole strategy below leans on staying small.
- **Separate hard ceiling:** the entire server Worker bundle must stay under **3 MiB gz (Free) /
  10 MiB gz (Paid)** — SSR-imported lib code counts here even if it never ships to the client.
- **The v0.5 Arena rebuild (merged `c7315c4`, +8,155 lines) changed the baseline** and is now on
  `main`. Relevant to this note: (a) **still zero visualization dependencies** — `apps/web` deps are
  only `next/react/react-dom` + `@eslams/*` (empirical proof the build-thin thesis is right); (b)
  **`GameRenderSpec` + `GameAnimationSpec` are now first-class TS types** in
  `packages/core-types/src/game-render.ts` + `game-animation.ts` (this closes the old "spec not in
  core-types" gap); (c) new shared foundations exist — `styles/game-motion.css` (motion tokens
  `--game-motion-fast|med|slow` + ease + a global reduced-motion kill-switch), `styles/game-shell.css`
  (a `.game-shell` layout), `styles/table-games.css` (`.seatmap-*` compass/ring/two-sides seat maps);
  (d) the public arena contract now carries per-game `renderSpec`/`animationSpec`
  (`lib/public-arena-contract.ts`) — but `arena-client.tsx` does not yet consume them to drive
  rendering.
- **Renderer topology today (the crux):** there are effectively **three** rendering paths, and they
  are not shared:
  - **`platform-pages.tsx` — the good per-family set.** `ReplayVisualFrame` (L2301) dispatches on
    `renderer.kind` to bespoke `Replay*Board` components: `ReplayStoneBoard` (go), `ReplayHexBoard`,
    `ReplayMancalaBoard`, `ReplayMorrisBoard`, `ReplayBackgammonBoard` (top/bottom points + bar),
    `ReplayBattleshipBoard`, a `.playcard` card-table, dice/matrix/rl renderers, plus token boards for
    chess/othello/checkers. **Used by Arena's core/replay board, `/replays`, and match-detail.**
  - **`platform-pages.tsx` — interactive Arena _play_ boards.** `ChessArenaBoard`, `TicTacToeBoard`,
    `ConnectFourBoard`, `ArenaCellBoard` (generic interactive), `ArenaRlControlBoard`, and
    `ArenaCoreBoard` (which itself renders `ReplayVisualFrame`). These add click-to-move input on top
    of the same visual language.
  - **`battlefield-client.tsx` — a degraded fork.** Its own `ReplayVisualFrame` (L699) dumps **all**
    cells into a single CSS grid with **no per-family dispatch** — every non-ttt/c4 game becomes a
    grid of truncated 3-char text tiles. This is why Battlefield's blackjack shows `11 11 4…` while
    the *same* replay on `/replays` renders comparatively better. **Battlefield is the odd one out.**

---

## 1. The core finding

**The problem is not "we picked the wrong library." It's that the frontend throws away the
structure Core already gives it, then reaches for a generic grid to paint the wreckage.**

Core emits, per game: `renderer_family` (`grid_3x3`, `connect_four`, `square_board`, `go_board`,
`hex_board`, `payoff_matrix`, `auction_panel`, `dice_table`, `card_table`, `control_benchmark`,
`economic_panel`), `seat_layout` (`two_sides|compass|table_ring|solo_panel`), `board_size`,
`hidden_info`, and an `animation_spec` (`default_move_ms/reveal_ms/result_ms`,
`reduced_motion_behavior`). It also projects each turn into a public **display frame**.

But `apps/web/lib/replay-visualization.ts` **flattens every non-trivial game into a flat
`string[]` of short text labels** — `cardTableFromState` → `["K♠","pot 40","round 2"]`,
`rlSceneBoardFromState` → `["x 0.42","y 1.10","speed 0.03"]`, `strategyTableFromState` →
`["bid 5","prize 3","winner a"]` — and `ReplayVisualFrame` lays them into a `ceil(√n)`-wide CSS
grid. Only tic-tac-toe, connect-four, and chess (FEN → Unicode glyphs) survive as structure.
That's literally why Blackjack renders as `11 11 4…`.

Two things sit on top of that flattening. `platform-pages.tsx` at least **dispatches per family** to
bespoke DOM renderers (stones, discs, a card table, backgammon points, hex cells…), so Arena and
`/replays` look *acceptable*. Battlefield's forked `ReplayVisualFrame` **doesn't even dispatch** — it
lays the flattened labels into one grid, so it looks *worst of all*. Neither reaches the quality the
design note describes, because both still consume a lossy flattened `string[]` instead of structured
state.

**So the technology decision is subordinate to two architecture decisions:** (1) **unify** — one
shared renderer set for Arena + Battlefield + replays, not three; and (2) **stop flattening** — feed
each `renderer_family` its structured `public_state`/display-cells. Once you do both, the library
question answers itself — **the right renderers are thin, first-party, and add ~zero dependencies**
(the Arena rebuild already proved this by shipping the whole thing with no viz lib).

## 1.5 The unification (the headline recommendation)

**The house renderer system does not need to be built from scratch — it already exists in
`platform-pages.tsx`. It needs to be _extracted, shared, and polished_ — and Battlefield's fork
deleted.**

Do this, in order:

1. **Extract** the per-family renderer set from `platform-pages.tsx` — `ReplayVisualFrame` + every
   `Replay*Board` + the token/stone/disc/checker/battleship class helpers + `renderReplayCell` +
   the card/dice/matrix/rl renderers — into a shared, dependency-free module, e.g.
   `apps/web/components/game-board/` (or `apps/web/lib/renderers/`). This also starts paying down the
   8,117-line `platform-pages.tsx` god-file (a standing tech-debt item).
2. **Delete Battlefield's fork.** Remove `battlefield-client.tsx`'s local `ReplayBoard` /
   `ReplayVisualFrame` / `replayBoardClassName` / `replayCellClassName` and point it at the shared
   module. Battlefield instantly renders at Arena/`/replays` parity — this alone fixes the "horrible
   visualization" for every game, cheaply, before any polish.
3. **Wrap the shared set in one lazy `<ReplayStage>` dispatcher** (`next/dynamic ssr:false`, keyed on
   `renderer_family` → web `ReplayRendererKind`) so Battlefield, Arena, `/replays`, and match-detail
   all mount the same code, and only the opened family's chunk loads. See §3.6.
4. **Polish the one shared set** to the design-note bar (§3.1–§3.5): promote DOM grids to themeable
   SVG where it matters, real seated card tables (hands/pot per `seat_layout`), SVG chess pieces
   (permissive license), animation driven from `GameAnimationSpec` via the existing `--game-motion-*`
   tokens, the shared last-move language, and reduced-motion snap-to-frame. **Every improvement now
   lands on Arena _and_ Battlefield at once** — which is the entire point of sharing.

This is a **branch-sized refactor that touches Arena's rendering**, so do it on a branch off the
just-merged Arena rebuild (e.g. `feat/shared-game-renderer`), not as scattered edits. Steps 1–2 are
a mechanical, low-risk consolidation that can ship first; steps 3–4 are the quality work.

**Answer to "which library should Arena and Battlefield share?" — none. They should share the same
first-party renderer set.** No third-party visualization library is warranted on either side for a
read-only spectator surface (Battlefield) or a turn-by-turn play surface (Arena); the rebuild
demonstrates the whole product renders fine without one, and every candidate library is single-game,
heavier, and harder to theme than the house set. The per-concern detail below (§3) stays valid — it
now describes how to *polish the shared set*, not build a parallel one.

---

## 2. Executive decision table

Every row describes **the one shared renderer set** (Arena + Battlefield + `/replays`). "BUILD" now
means *extract the existing `platform-pages.tsx` renderer for this family into the shared module and
polish it* (§1.5) — not build a parallel one.

| Concern | Verdict | What to use | Add a dependency? |
|---|---|---|---|
| **Unify Arena + Battlefield** | **EXTRACT & SHARE** | Move the `platform-pages.tsx` per-family renderers into one shared module; delete Battlefield's degraded fork; wrap in `<ReplayStage>` | **No.** Pure refactor |
| **Board games** (chess, go, othello, C4, hex, checkers, shogi, xiangqi, mancala, morris, backgammon, battleship, ttt, uttt) | **BUILD** | One house **`<HouseBoard>`** SVG/DOM primitive family driven by `board_size` + display-cells + `animation_spec` | **No.** 0 runtime deps |
| **Chess/shogi/xiangqi piece art** | **VENDOR asset, not a lib** | Inline-SVG sprite of a **permissive** set (CC0 `rhosgfx`, or MIT lichess `fantasy`/`spatial`/`celtic`) | No (copy assets in; record license) |
| **Card tables** (poker×3, bridge, hearts, spades, euchre, gin-rummy, cribbage, hanabi, mahjong, dou-dizhu, goofspiel, crazy-eights…) | **BUILD** | One `<Card faceUp\|faceDown>` DOM/CSS primitive + `seat_layout`-driven table; suit color = information only | **No.** 0 runtime deps |
| **Card face art (optional premium)** | **VENDOR CC0, not npm** | Curated subset of Adrian Kennard cards (CC0) / FluffyStuff mahjong tiles (CC0), inlined as `<symbol>` | No |
| **Motion** (move/reveal/result) | **BUILD (platform)** | Native CSS transitions + `@keyframes` + **WAAPI** + **View Transitions** (progressive), timings from `animation_spec` | **No** by default |
| **Motion — hardest live case only** | Escape hatch | **Motion** (`motion/react` v12) via `LazyMotion`+`m`, `next/dynamic ssr:false`, quarantined to one island | Only if truly needed (~4.6KB) |
| **Charts** (advantage bar, win-prob, score/momentum, thinking-time, sparklines) | **BUILD** | Raw inline **SVG** components; reuse existing `Sparkline` + `.vw-eval-bar` | Optional: `d3-scale`+`d3-shape` (ISC) for the win-prob curve only |
| **Scrubber / transport** | **BUILD** | Extract a headless **`useScrubber`** hook + `<Scrubber>`; extend the existing `<input type=range>` + move rail | No |
| **Control & Arcade replay** (lunar-lander, cartpole, car-racing…) | **BUILD** | Thin **Canvas 2D** trajectory player (~5–8KB) interpolating sampled symbolic states; lazy, `ssr:false` | No (OGL/Unlicense only if future 3D) |
| **Per-family loading** | **BUILD** | One `<ReplayStage>` client dispatcher, `next/dynamic(() => import('./renderers/${family}'), {ssr:false})` | No |

**Net new runtime dependencies for the whole redesign: at most two, both tiny and optional** —
`d3-scale` + `d3-shape` (ISC, ~10–12KB combined, tree-shaken, pure/no-DOM) for one curved chart,
and `motion` (MIT, ~4.6KB via `LazyMotion`) *only if* the live board ever needs interruptible
spring/layout animation. Everything else is first-party SVG/DOM/Canvas + the web platform.

**Why "build" keeps winning:** Core already owns the two things a viz library normally sells —
game logic and a coordinate/notation model — and the surface is **read-only** (spectating), so
every library's drag/drop/input/validation machinery is pure dead weight. No general "abstract
board renderer" exists; every real board lib is single-game (chess or go). One house system covers
~14 of 16 board games in one code path, themes from `--board-*/--stone-*` tokens for free, honors
`animation_spec` + `prefers-reduced-motion` by construction, and adds 0 KB across 50 games.

---

## 3. Per-concern detail

### 3.1 Board games → one house SVG board system

Promote the existing per-game DOM boards into a single `<HouseBoard>` primitive that takes
`(renderer_family, boardSize{rows,cols}, cells, lastMove?, animationSpec)` and emits SVG:
`<rect>` squares filled `var(--board-light)`/`var(--board-dark)`, stones/discs as `<circle>`
`var(--stone-black)`/`var(--stone-white)`, grid lines `var(--board-line)` (the existing go-board
pattern). Last-move highlight generalizes the existing `.cb-last` recipe (`var(--accent-soft)` +
inset `var(--accent-line)`) to every family. Non-grid families are the long tail that must be
explicitly supported so they don't fall back to the ugly grid: **hex** (11×11 rhombus, 60° skew),
**nine-men's-morris** (3 concentric squares + connectors), **backgammon** (24 points + bar/bear-off),
**mancala** (2 pit rows + 2 stores), **pentago** (4 rotatable quadrants), **battleship** (hit/miss/
fog + hidden ships). Reuse Arena's board components — don't invent a parallel set.

**Do NOT adopt** `chessground` (Lichess) — it is **GPL-3.0** and would infect the MIT repo (hard
disqualification). `react-chessboard` (MIT, ~36KB all-in incl. `@dnd-kit`) and `cm-chessboard`
(MIT, ~13KB, but ships non-permissive pieces) solve only chess, add bundle for interaction we don't
need, and must be re-skinned to tokens anyway. Reassess `react-chessboard` **only** if eSlams later
adds interactive play-vs-model chess (not spectating) — then behind the `<HouseBoard>` interface via
`next/dynamic ssr:false`.

**Chess piece art is the one real "buy," and it's an _asset_ decision, not a library one.** The
sets everyone reaches for are copyleft/non-commercial and unsafe for an MIT product: **cburnett**
= GPLv2+, **merida** = GPLv2+, **staunty** = CC-BY-NC-SA. Use a **permissive** set instead — CC0
**rhosgfx**, or the MIT lichess sets **fantasy / spatial / celtic** (by Maurizio Monge). Inline as
`<symbol><use>`, fill from `--stone-black/--stone-white` for dark-mode legibility (drop the current
text-shadow-outline hack), and **record the chosen set's license in-repo**. Shogi/xiangqi need
bespoke CJK-on-tile/disc treatment, not the chess glyph path.

### 3.2 Card tables → one `<Card>` primitive + a real table

A card face is a rank glyph + suit glyph in two corners — a one-file CSS/DOM component, and the
repo already has the idiom (`.playcard`/`.pc-rank`/`.pc-suit`). Build a single
`<Card faceUp|faceDown>` primitive that drives all 16 card games; `seat_layout` (`two_sides` /
`table_ring` / `compass` for bridge) is a layout prop. Hidden hands render as **face-down backs
showing count only** — never the cards (honesty by construction; Core strips hidden info from the
frame). **Hanabi** is the same primitive with per-seat visibility inverted (you see others' hands,
not your own). Suit color uses only red/black **as information** — never the accent. Chips/pots/
tricks/points live in the shared score strip as mono values, not new art.

**Do NOT npm-install a card-art package.** The popular ones are either LGPL-2.1 (David Bellot
`htdebeer/SVG-cards`; `deck-of-cards`' default Chris Aguilar art) — copyleft, unsafe — or stale
React-16 wrappers (`react-free-playing-cards`, `@heruka_urgyen`) risky under React 19. `@letele/
playing-cards` is CC0 and SSR-safe but ~155KB gz and ornately off-brand. If real vector faces are
ever wanted, **vendor** a curated subset of the **CC0** sources (Adrian Kennard cards; FluffyStuff
mahjong tiles), deduped as inline `<symbol>` defs — buy the art, not the library.

### 3.3 Motion → the web platform, not a JS engine

The repo already ships every needed animation as pure CSS (`c4drop` with
`cubic-bezier(.34,1.3,.5,1)`, `popIn`) plus a `prefers-reduced-motion:reduce{animation:none}`
kill-switch, and **zero** animation deps. The design language ("purposeful and quick," calm, no
overshoot) is exactly the regime where spring physics buys nothing. Drive the three named beats —
**move** (`default_move_ms`, ~220ms; C4 320ms), **reveal** (`default_reveal_ms`; 300ms for
hidden-info), **result** (`default_result_ms`, 520ms) — by feeding `animation_spec` into CSS custom
properties on the renderer root (`--move-ms`, `--reveal-ms`, `--result-ms`) and referencing them in
transitions/keyframes. Board staggering reuses the existing `animation-delay: calc(var(--slot)*Nms)`
idiom. A tiny (~1–2KB) WAAPI helper covers the two things CSS doesn't do declaratively: a
**synchronized multi-cell reveal** (RPS/sealed-bid/othello flips) with one completion callback for
the scrubber, and **reduced-motion snap-to-final-frame** (`element.animate(…, {duration: 0})` so a
scrubbed replay lands exactly on the target display frame).

- **View Transitions** are great for board FLIP but reached cross-browser Baseline only **Oct 2025**
  (Firefox 144, Safari 18) — treat as **progressive enhancement** with a mandatory
  `document.startViewTransition === undefined → instant cut` fallback (affects recent-Firefox users,
  not just old webviews). WAAPI/CSS FLIP is the baseline.
- **`react-spring` is rejected** — springy/bouncy motion contradicts the brief and fights the fixed-
  ms `animation_spec`. **`AutoAnimate`** (MIT, <3KB) is an optional micro-enhancement for list churn
  (the live match feed / leaderboard reorders), orthogonal to the board layer.
- If a JS engine ever becomes necessary on the *live* board (interruptible spring/layout), use
  **Motion** (`motion/react` v12.x, MIT) via `LazyMotion` + `m` (~4.6KB initial), `next/dynamic
  ssr:false`, scoped to that one island — never page/layout level.

### 3.4 Charts & scrubber → raw SVG + a headless hook

Every chart here is a single series over a discrete turn axis with a small point count — the exact
case a charting lib over-serves. The repo already hand-rolls the equivalents: `Sparkline`
(`platform-ui.tsx`, ~24 lines of themed SVG `<path>`) and the CSS-only advantage bar `.vw-eval-bar`.
Build siblings in one `lib/charts` module: an `EvalBar` (generalize `.vw-eval-bar`), a
`ScoreProgression`/momentum line (generalize `Sparkline`), a `WinProbCurve` (the one chart worth
`d3-shape`'s `line().curve(curveMonotoneX)` + `d3-scale`'s `scaleLinear`), and a `ThinkingTime` bar
row. All key their x-axis off the **same ply index the scrubber drives** and render a playhead at
`visiblePly` so charts stay locked to the board. Colors from tokens only (`--accent`, `--win`,
`--loss`, `--draw`, `--text-2`, `--surface-3`).

**Do NOT adopt** Recharts (~136KB), nivo (~285KB + an open RSC/App-Router incompatibility as of
May 2026), Chart.js/uPlot (canvas, client-only, can't read CSS vars without JS glue), Observable
Plot (needs a `document`/jsdom — not viable on Workers), or visx (React-19 support still v4 **alpha**
in 2026). Only optional dep: `d3-scale` + `d3-shape` (ISC, ~10–12KB, pure functions, SSR-safe) —
capture their `LICENSE` from `node_modules` as evidence for the MIT gate.

**Scrubber:** extract the logic already inline in `battlefield-client.tsx`
(`manualPly`/`playIntent`/live-edge/`REPLAY_AUTOPLAY_MS`, the `.vw-scrub` range input, the move rail)
into a shared **`useScrubber` hook + `<Scrubber>`** used by `/battlefield` and `/replays`. Add
keyboard control (←/→ = ±1 ply, Home/End, Space = play/pause, matching the Arena keydown pattern),
render move ticks — and **taller "story-beat" ticks** at big advantage swings — as absolute marks
over the track, model buffering/live-edge from the existing live reducer, and keep "jump to live
edge" = set ply to `maxPly` when live. Preserve the `trackEvent('battlefield_replay_control', …)`
analytics.

### 3.5 Control & Arcade → a thin Canvas 2D trajectory player + a data ask

These 12 games are `solo_benchmark` (`solo_panel`) — **single-agent, not model-vs-model** — so they
do **not** belong in Battlefield's head-to-head grid; give them a clearly-labelled "Benchmark run"
lane/surface, but **reuse** the scrub/playhead/live machinery. Add a `replay.kind === 'trajectory'`
branch that mounts a **`Canvas2DTrajectoryPlayer`** (~5–8KB, `ssr:false`, `next/dynamic`) driving a
`requestAnimationFrame` loop that **linearly interpolates between sampled symbolic state frames**.
Must: read design tokens via `getComputedStyle` at mount and repaint on theme change (canvas doesn't
inherit CSS), scale the backing store by `devicePixelRatio`, and honor `prefers-reduced-motion` by
snapping to the scrubbed sample (no tween). Simple games (cartpole, mountain-car, the taxi/frozen-
lake/cliff grids) can stay **pure inline SVG** — most on-brand and DOM-inspectable. **Do NOT** ship
Gym `rgb_array` pixel frames (opaque, heavy, breaks the explainable mandate) and **do NOT** add
PixiJS/three (~100–150KB+). OGL (Unlicense, ~8KB, `ssr:false`) is the escape hatch *only* if a future
game needs true 3D. The real engineering here is the **sampled-trajectory data format**, which no
library solves — see §5.

### 3.6 The dispatcher (how it all loads)

One client island, `<ReplayStage familyKey>`, is the *only* place a renderer is imported:

```
'use client'
const Renderer = dynamic(() => import(`./renderers/${webKindFor(rendererFamily)}`),
  { ssr: false, loading: () => <StageSkeleton/> })
```

Rules (verified against Next 16 + OpenNext docs and the repo):
1. **`ssr:false` `next/dynamic` must live inside a Client Component** — putting it in a Server
   Component (`page.tsx`) is a hard Next 16 build error. `<ReplayStage>` itself is `'use client'`.
2. **Only the opened match's family chunk enters the client bundle.** Nothing (renderer, chart,
   motion, canvas) may be in a route's synchronous import graph. Server Components fetch data and
   pass only serialisable display-frame objects down.
3. **Theming for canvas/WebGL:** read tokens via `getComputedStyle`; repaint on both a
   `MutationObserver` for `<html data-theme>` and a `matchMedia('(prefers-color-scheme: dark)')`
   listener. SVG/DOM get theming for free via `var(--token)` — prefer them.
4. **Hydration:** keep `replay-visualization.ts` a pure data module (no React import); use
   `React.useId()` for SVG gradient/clip IDs (never `Math.random()`); no `window`/`document` at
   module eval or first render; **keep Cloudflare Auto-Minify OFF** for the prod/staging domains (it
   rewrites markup → hydration mismatch).
5. **Reduced motion:** detect via `matchMedia('(prefers-reduced-motion: reduce)')`
   (`useSyncExternalStore` with a stable `false` server snapshot); when reduced, snap to end state,
   disable autoplay, honor `animation_spec.reduced_motion_behavior`. Any lib whose animation can't be
   fully disabled from JS **fails the gate.**

**Naming gotcha:** Core's `renderer_family` values (`grid_3x3`, `square_board`, …) are **not** the
web's internal `ReplayRendererKind` strings (`tic-tac-toe`, `stone-grid`, …). The dispatcher must map
core-family → web-kind; they are not interchangeable keys. Today `app/battlefield/page.tsx`
statically imports the monolithic `BattlefieldClient` (all families in one client chunk) — the lazy
per-family split is **net-new** work, which is exactly why the missing bundle-budget CI check is a
live exposure, not a hypothetical one.

### 3.7 Arena — reuse the same renderers; no library changes

Arena needs **no visualization library** (it has none today and shouldn't get one). Its rendering
splits into three parts, all of which converge on the shared set:

- **Setup preview** (`arena-client.tsx` → `GamePreview` in `game-preview.tsx`): today a canned,
  decorative per-family loop (nice, but not driven by real state). Keep it as the *idle poster*
  animation, but it should share the shared set's per-family visual language so a game looks the same
  in the preview and in play. Longer term the preview can be a short scripted run of the *real*
  renderer rather than a separate hand-authored animation — deleting a whole parallel codebase.
- **In-match play boards** (`platform-pages.tsx`: `ChessArenaBoard`, `TicTacToeBoard`,
  `ConnectFourBoard`, `ArenaCellBoard`, `ArenaRlControlBoard`, `ArenaCoreBoard`): these are the shared
  renderers **plus click-to-move input**. Refactor so the *visual* layer is the shared renderer and
  input is a thin interactive overlay on top — so Arena play and Battlefield replay are the same board,
  one interactive and one read-only. `ArenaCoreBoard` already delegates to `ReplayVisualFrame`; make
  the others do the same.
- **Consume `renderSpec`/`animationSpec`.** The arena contract already carries them
  (`lib/public-arena-contract.ts`) but `arena-client.tsx` doesn't use them yet — wire them in so
  board size, seat layout, and motion timings are data-driven (same as Battlefield).

**Only "library"-adjacent change that touches Arena:** upgrading the shared chess renderer from
Unicode glyphs (`chessTokenClass`/`chessPieceSymbol`) to a **permissive SVG piece set** (§3.1) — an
*asset* upgrade that benefits Arena's chess board **and** Battlefield's chess replays at once. No npm
package.

Because this refactor edits Arena's rendering, stage it on the **branch** from §1.5
(`feat/shared-game-renderer`), off the just-merged Arena rebuild.

---

## 4. License gate (hard rules for the MIT repo)

Accept **MIT / Apache-2.0 / BSD / ISC / CC0** only. **Reject** GPL/AGPL/LGPL and source-available
(BSL/SSPL/Elastic). Confirmed-safe picks: house code (MIT), `d3-scale`/`d3-shape` (ISC), `motion`
(MIT), `AutoAnimate` (MIT), OGL (Unlicense), rhosgfx pieces (CC0), lichess fantasy/spatial/celtic
(MIT), Adrian Kennard cards + FluffyStuff mahjong (CC0). **Confirmed-unsafe / do-not-use:**
`chessground` (GPL-3.0), cburnett/merida chess pieces (GPLv2+), staunty pieces (CC-BY-NC-SA),
David Bellot `htdebeer/SVG-cards` (LGPL-2.1), `deck-of-cards` default art (LGPL). Capture every
vendored asset's LICENSE file in-repo.

---

## 5. Data-contract gaps this redesign depends on

The renderers are the easy part; several are blocked or degraded by missing data. These are asks on
Core / the platform contract, roughly in priority order:

1. **Surface `PublicReplayFrame.scores` to the UI.** Per-turn cumulative scores already ride every
   frame but are **dropped** in `ReplayMoveMeta` (`replay-view-state.ts`) — so there is no live
   scoreboard/momentum. Thread them through. *(cheap, unblocks the score/momentum chart)*
2. **~~`animation_spec` is not yet in `packages/core-types`~~ — RESOLVED by the v0.5 rebuild.**
   `GameRenderSpec` (`game-render.ts`) + `GameAnimationSpec` (`game-animation.ts`) are now first-class
   TS types and flow through the arena contract; the shared renderers should be typed against them and
   drive motion from `GameAnimationSpec` via the `--game-motion-*` tokens. *(done — just consume it)*
3. **Per-turn advantage / eval + win-probability.** No `advantage`/`evalBar`/`winProbability` field
   exists anywhere. This is the single highest-value spectator addition (the tension instrument and
   the replay "trace ribbon" depend on it). Needs Core to emit a per-turn advantage estimate (even a
   simple, honest, game-specific heuristic — labeled as such).
4. **Typed key-moment markers.** Only a generic untyped `markers[]` exists; add a small taxonomy
   (`lead_change`, `big_swing`, `first_blood`, `match_point`, `blunder?`) so the scrubber's story
   beats and the "turning point" share link are data-driven, not re-derived client-side.
5. **Surface per-move latency in the replay UI.** `action.selected.latencyMs` is captured but not
   exposed via `ReplayMoveMeta` — it's the honest raw material for "thinking time as theatre."
6. **Symbolic RL trajectories** (control_benchmark): emit sampled state vectors per tick
   (`{t, cart_x, pole_angle}`, `{lander:{x,y,vx,vy,angle,fuel}}`) — numeric fields pass the
   public-replay-safety gate; avoid keys matching the forbidden pattern (e.g. `hidden_state`). No
   `rgb_array`.
7. **Localize robustness events.** Illegal/timeout/fallback are aggregate per-player counts, not tied
   to a turn — so a spectator can't see *which* move was illegal. Tag the turn.
8. **Remove/reconcile Elo.** `gameEloA`/`gameEloB`/`elo` still exist in
   `public-battlefield-contract.ts` and `platform-data.ts` despite the **No-Elo** mandate; the live
   viewer even shows "Coming soon Score" from them. Replace with the Bayesian `officialScore` (0–1000)
   + credible interval per the brief, and delete the Elo fields.

Also fix the leaked i18n key **`Turn 0 | replay.placeholder`** and the doubled labels
("Match resultComing soon") observed live.

---

## 6. Recommended build sequence

All on a branch off the merged Arena rebuild (e.g. `feat/shared-game-renderer`).

0. **Unify first (cheapest, biggest win):** extract the `platform-pages.tsx` per-family renderer set
   into a shared module, delete `battlefield-client.tsx`'s degraded fork, and point Battlefield at the
   shared set behind a lazy `<ReplayStage>` (§1.5). Battlefield reaches Arena/`/replays` parity before
   any polish — this is what actually kills "the visualization is shit."
1. **Unblock data:** surface per-turn `scores`, consume the now-typed `GameRenderSpec`/
   `GameAnimationSpec`, remove residual Elo fields (§5.1/5.2/5.8).
2. **Polish the shared board renderers:** promote grids to themeable SVG where it matters
   (hex/morris/backgammon/mancala/battleship/go/othello), last-move language, motion from
   `GameAnimationSpec` via `--game-motion-*`, reduced-motion snap-to-frame; the `useScrubber` hook +
   `<Scrubber>`. Both Arena and Battlefield inherit every improvement.
3. **`<Card>` primitive + real seated card-table** (highest reuse: 16 games) — hands/pot per
   `seat_layout` (reuse `table-games.css` `.seatmap-*`), hidden-hand + hanabi inversion. Replaces the
   current flat `.playcard` row.
4. **Charts:** `EvalBar`, `ScoreProgression`, `ThinkingTime`; add `d3-scale`/`d3-shape` + `WinProbCurve`
   once the advantage field (§5.3) lands.
5. **payoff_matrix / auction_panel / economic_panel / dice_table** panels (synchronized-reveal
   machinery shared).
6. **Benchmark lane + `Canvas2DTrajectoryPlayer`** once symbolic trajectories (§5.6) land.
7. **Wire the `size-limit` CI gate** to the documented budgets (`/replays` 300KB, `/battlefield` treat
   as 300KB) *before* the first lazy lib lands, so nothing regresses silently. Add new families to
   `scripts/check-replay-renderer-coverage.ts` + `e2e/replay-renderers.spec.ts`.

**Bottom line:** Arena and Battlefield should share **one** first-party renderer set — no library on
either side. The set already exists (in `platform-pages.tsx`); the work is to extract it, delete
Battlefield's degraded fork, and polish the shared version behind a lazy dispatcher. Two tiny optional
deps (`d3-scale`/`d3-shape`; `motion` as a quarantined escape hatch) are the entire "buy" list. What
determines quality is (a) sharing + rendering structure instead of a flattened grid, and (b) the
handful of data fields in §5.
