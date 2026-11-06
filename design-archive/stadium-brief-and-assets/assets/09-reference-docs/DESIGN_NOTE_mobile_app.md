# Design Note — the eSlams mobile app

**For:** the design agent (Claude design). **Status:** design intent, ready to design against.
**Reads with:** `DESIGN_BRIEF.md` (the house language — obey it), `COMPONENT_REFERENCE.md`
(recipes), `DESIGN_NOTE_battlefield.md` (the Stage + all 12 board families — the app inherits
that system wholesale), `TECH_NOTE_battlefield_visualization.md` (renderer/data facts).
**Date:** 2026-07-19.

This note designs a **native consumer mobile app** (iOS + Android, built with Expo/React
Native — a real app, never a webview of the site). It is deliberately smaller than the
website: **Arena · Battlefield · Profile · the Humans-vs-Models board. Nothing else.**
Pure consumer play. The website remains the full product (official leaderboard, model pages,
docs, Grand Slams); the app is where you *play* and *watch*, one-handed, in a queue, on a
sofa.

The app can be **more fun and more funky than the site** — but inside the same skin, not
beside it. The energy comes from tempo, haptics, sound, full-screen focus, and playful copy —
**never** from neon, glow, gradients-on-controls, mascots, or emoji. Same tokens, same one
accent, same "color is information." A consumer app in the eSlams system, not a re-brand.

---

## 1. The essence

> **You open the app and a frontier model is already waiting to play you. Two taps and you're
> in a full-screen match — the board fills your hand, the model visibly thinks, its reasoning
> streams in like trash-talk with a PhD, and when you win there's a scoreline made to be
> screenshotted. When you don't feel like playing, you flip one tab and watch two machines
> fight it out live.**

Two verbs, one app: **Play** (Arena) and **Watch** (Battlefield). Everything else — profile,
the Humans-vs-Models board, settings — is support cast reachable from the top corners.

The strategic job of the app (context, not copy): mass consumer volume of human-vs-model
games. Every design decision should reduce time-to-first-move, make finishing a match feel
great, and make sharing a result irresistible. A played game is the product; the app is its
delivery mechanism.

---

## 2. What the app is NOT (the cut)

- **No model catalog, no provider pages, no game encyclopedia pages.** Models appear only as
  opponents and leaderboard rows; games appear only as things to play or watch.
- **No official Bayesian leaderboard.** That is the researcher's instrument; it lives on the
  web. The app's only board is the **Humans vs Models** board (§8). If official standings
  appear anywhere, it is one glanceable strip, linking out — never a table with credible
  intervals.
- **No Grand Slams surface at v1** (a marquee/notification teaser is fine; the bracket lives
  on the web).
- **No docs, no Trinity, no API keys, no onboarding for builders.**
- **No human-vs-human play, no lobbies, no invites, no matchmaking.** The platform's
  perfected loop is one human vs model seat(s) — the app v1 ships exactly that. (Human
  spectating of *your* live Arena game also doesn't exist platform-side; don't design it in.)
- **No web parity pressure.** The app may do things the site doesn't (fullscreen stage,
  haptics, push) and skip things the site has. They share a design language and an API, not
  a sitemap.

---

## 3. Information architecture

### 3.1 The dock — two tabs, two verbs

Bottom dock, exactly **two destinations**: **Arena** (gamepad icon) and **Battlefield**
(swords icon). This is deliberately fewer than the web's four-item mobile dock — on the app,
Leaderboard and Profile move to the **top corners** of both tabs:

- **Top-left: the Humans-vs-Models board** — trophy icon, opens as a pushed full screen.
- **Top-right: Profile** — the user's avatar (32px circle, mono initials fallback), opens as
  a pushed full screen. Signed-out state shows a quiet `Sign in` chip instead.

Design the dock as the app's signature chrome: a floating pill (surface bg, hairline border,
backdrop blur — the `.nv` treatment miniaturized), sitting above the home-indicator
safe-area. Two large hit targets, icon + label, active item gets the accent treatment
(accent icon + label, `--accent-soft` fill). Because there are only two items, the dock can
afford presence and personality — a slightly springy selection transition (respecting
reduced-motion) is in-system here.

Rationale to hold onto: a two-item tab bar is unusual, and that's the point — it states the
product ("this app is Play and Watch") the way a camera app's shutter states "this app is
photos." If usability testing shows top-corner destinations are being missed, the fallback is
the web dock's 4-up layout — but start opinionated.

### 3.2 Fullscreen is the third place

Gameplay and replays do **not** render inside tabs. They open as a **fullscreen Stage** —
a modal surface over everything: no dock, no status-bar chrome competition, board maximal.
This is the single biggest upgrade over mobile web (which has no fullscreen mode at all
today):

- **Replays / spectating:** swipe-down to dismiss (grab-handle affordance at top), like a
  media player. Landscape allowed.
- **Live play:** no swipe-to-dismiss (a live match must not die to a stray gesture). Exit is
  an explicit `×` → confirm sheet (`Leave match? The model will be waiting.` · Resign · Keep
  playing). Portrait-locked at v1.
- **The now-playing bar.** Leaving a live match (via ×→Keep playing→home, or app
  backgrounding) never abandons it — the platform has no human move clock; sessions wait
  indefinitely. A slim persistent **match bar** docks above the pill dock (game glyph ·
  `Your move` / `GPT-5 is thinking…` · thumbnail advantage) and tapping it re-enters the
  Stage. Model your visual on a music app's now-playing bar. One live session at a time.

### 3.3 Route map (app screens)

```
Splash (cold start only)
├─ Arena (tab)              — play home: resume card, quick match, game shelf
│   ├─ Game sheet           — per-game: preview, how-to, opponent, Start
│   ├─ Stage · play         — fullscreen match (portrait)
│   └─ Stage · result       — scoreline + share
├─ Battlefield (tab)        — the channel: hero stage + vertical poster feed
│   └─ Stage · watch/replay — fullscreen, scrubber, landscape ok
├─ Humans vs Models (top-left, pushed)
├─ Profile (top-right, pushed)
│   ├─ Match history → Stage · replay
│   └─ Settings (minimal: appearance, sound & haptics, notifications, account, data)
└─ Auth (sheet): sign in / sign up / onboarding — appears only when play demands it
```

**"No signup to watch"** is law here too: Battlefield, replays, and the Humans-vs-Models
board all work signed-out. The account gate appears exactly once — at **Start game** — as a
sheet, and returns you to the exact spot afterwards.

---

## 4. The splash — the logo plays a game

The splash is the app's overture: a visualization of the mark that becomes the whole idea —
*here, AI plays games* — in under 2.5 seconds. Three beats:

1. **The mark draws itself** (~0.8s). On the theme background, the squircle outline strokes
   on (hand-drawn wobble preserved — never geometrically perfect), then the "e" loop draws
   in. Royal blue `#1b32c4` family, both themes.
2. **The loop becomes a board** (~1.0s). The counter of the "e" is a game tile — it
   replicates outward into a brief 3×3 lattice; three plays land in quick succession *as if
   two invisible players are moving*: an X strokes on, a disc drops with the system's one
   gravity settle, a stone fades in. Board colors from `--board-*` tokens only.
3. **Resolve** (~0.6s). The lattice collapses back into the mark; the wordmark fades in
   beside it; beneath, the tagline — *Here, AI plays games.* — types on in one quiet beat.

Rules: cold start only (never on foreground/resume); tap-to-skip after first ever launch;
`prefers-reduced-motion` → static logo + tagline, same duration ceiling; all asset loading
and session restore happen *behind* it (the splash must hide work, not add to it); total
budget ≤2.5s hard, target the app interactive before the resolve finishes. No sound on
splash.

---

## 5. Arena — the Play tab

The consumer heart, restructured for a phone. Top-to-bottom:

**1 · Resume card (conditional).** If a live session exists: full-width card — game glyph,
opponent, `Your move` / `thinking…` state, one tap re-enters the Stage. Nothing outranks an
unfinished match.

**2 · Quick match.** One large primary action: **Play now** — last game + last opponent
(persisted), or the curated "best first opponent" for newcomers. Time-to-first-move for a
returning player: **two taps** (Play now → Stage). This card carries the animated preview of
its game — the tab is never static.

**3 · The shelf.** Horizontal rail of 6–8 marquee games (the launch set: the 13 `main_arena`
games curated down), as large playful tiles: the `.gtile` anatomy scaled up — glyph tile,
name, variant token in mono. Then **Browse all** → the full picker: category tabs (the four
locked categories) over a 2-up grid of the 37 Arena-playable games. Control & Arcade (the 12
RL benchmarks + Blackjack) are **not in Arena** — they are Battlefield content; don't show
them here at all.

**4 · A pulse of the war.** One quiet strip at the bottom: the Humans-vs-Models topline
("Humanity this week: 38% and climbing") linking to the board (§8). Recruitment, not
navigation.

### 5.1 The game sheet (pick → start)

Tapping any tile opens a **game sheet** (bottom sheet, ~90% height) — the app's version of
the matchup hero:

- **The living preview** as centerpiece: the real renderer playing a short scripted
  sequence (per `renderer_family` — pieces glide, discs fall, cards fan, dice tumble).
  Reduced-motion: end-state frame.
- **Game name + variant** (mono token) + a three-line **How to play** (Objective · Your
  turn · How you win) — always visible here, never forced in-match.
- **Opponent row:** the model wheel, horizontal on mobile — snap-scroll cards (provider
  avatar, model display name, status vocabulary `Ready` / `Slower turns` only), centered =
  selected. `All N models` opens a searchable full-roster sheet. Curated default order:
  Best first opponent, then `Fast / Strong / Balanced / Newest` chips.
- **Seat picker where the game demands it:** side choice for two_sides games (White/Black
  etc. as two large toggles); for table games (poker, mahjong — when table mode ships) a
  seat-ring diagram: you take one seat, models fill the rest, each tappable to swap the
  model.
- **Start game** — full-width primary button, thumb zone. Signed-out: this is where the
  auth sheet appears.

### 5.2 The pre-match load screen (every game gets one)

Between Start and first move there is real work (session create, engine container, model
handshake) — stage it, don't spin it. A full-bleed **curtain-riser** screen, one per game
family, ~1–4s of honest theatre:

- The game's glyph animation runs center-stage (same asset as the preview — one build).
- **The matchup writes on:** `YOU` (username) — `vs` — model name with provider tint, like
  a fight card. Below, the game + variant in mono.
- A single honest status line cycles real states: `Setting the table…` → `Waking the
  engine…` → `GPT-5 has taken its seat.` — driven by actual session lifecycle events, never
  a timer.
- Escalation per brief §9: 10s `Taking longer than usual…`, 30s options (Keep waiting ·
  Switch opponent · Exit), and engine-unavailable resolves to a designed state (`The engine
  room is busy — try Chess, it's ready now`), never a dead end.
- First move ready → the load screen **is** the Stage's opening frame (the board fades in
  under the matchup, which compresses into the seat bar). No screen swap, one continuous
  scene.

### 5.3 The Stage — playing (portrait, one-handed)

Inherit `DESIGN_NOTE_battlefield.md` §4 and §9 wholesale — one shared board system, Arena
adds the input overlay. Portrait layout, top to bottom:

- **Thin ribbon:** `×` (exit) · game name · move counter (mono).
- **Seat bar:** you and the model as a compact facing pair, the **advantage bar between
  them** (until per-turn advantage data exists: neutral mid-game, resolves only at result —
  never fake a curve). Active seat wears the accent underline; the model's side carries the
  **deliberation clock** (`thinking 0:07 · usually ~9s` from live telemetry).
- **The board,** pinned, filling the width, generous margin. `renderer_family` +
  `board_size` size it; 15×15 boards get pinch-zoom + pan with a reset affordance.
- **The reasoning line.** After each model move, its `public_explanation` streams in below
  the board — one to two sentences, sans, `--text-2`. This is the voice of the product;
  give it room. (Cause → effect: reasoning writes in, then the piece moves, then the
  advantage settles — the Battlefield grammar, kept.)
- **Your controls in the thumb zone:** per-family input (§7) + a quiet overflow (`⋯`:
  How to play · Sound off · Resign).

Mobile-native personality (the "funky", disciplined):

- **Haptics grammar** — three notes only: a light tick when the model's move lands, a
  medium tap when it's your turn after a long think, a success/failure pattern on result.
  Never continuous, always OS-native patterns, off-switch in settings.
- **Sound palette** — the arrival cue (soft, physical: a piece being set down — per family:
  card slide, stone click, disc drop), a result chord. No music, no loops. Muted by default
  when the device is on silent; respects a global toggle.
- **Premove:** queue your next move while the model animates; the queued cell/piece shows a
  ghosted outline.
- **Timeout escalation** ends in triumph, not apology: hard cap offers **Claim the win** —
  the model forfeits (`model_unavailable` matches don't count toward the board; say so in a
  footnote on the result card: `Doesn't count toward standings — the model never showed.`).

### 5.4 The result — a scoreline made for screenshots

Full-screen result over the held final board (the curtain, from the Battlefield note, tuned
consumer):

- The board settles; the advantage bar runs fully to the winner; a beat of stillness.
- The **scoreline card** rises: outcome word — big, sans, weight 650 (`You won.` / `GPT-5
  wins.` / `A draw.`) — over the YOU vs MODEL chips, game + variant, move count, and the one
  human-readable verdict line when data allows (`Decided on move 34`).
- A win earns the app's one celebration: a single **accent sweep** across the card + the
  success haptic. No confetti, no particles — grandeur is the stillness; on mobile the
  haptic carries the joy the visuals abstain from.
- **Share** produces a designed image card (theme-aware): final board state, scoreline,
  matchup, the mark. `I beat Claude Opus at Hex` is the growth loop — treat the share card
  as a first-class designed artifact, both themes, both outcomes (losing to a frontier
  model is *also* shareable — copy: `It took GPT-5 41 moves to beat me.`).
- Actions: **Play again** (same setup, instant rematch) · **New opponent** · **Watch
  replay** (the match you just played, with the model's full reasoning per move) · quiet
  `Saved to your profile` line with a public/private toggle inline.

### 5.5 Replays of your Arena games

Same fullscreen Stage in replay mode: filmstrip scrubber (full-width drag, story-beat ticks
big enough for thumbs), transport in the thumb zone, **the reasoning ledger is the scroll** —
the board stays pinned while you thumb through the model's reasoning turn by turn. Per-move
reasoning and per-seat scores are in the public replay contract today; per-move thinking
time is not persisted yet (§10) — design the latency chip as an optional element that
appears when data exists.

---

## 6. Battlefield — the Watch tab

The Battlefield note designed this surface's soul; the app gets its purest expression — a
**channel in your pocket**. Do not port the web page (list + viewer); build the mobile
architecture from the note's §9:

- **The Stage auto-programs at top:** the best thing on right now (a live match if one
  exists, else the most dramatic recent replay), already playing, full-width, muted-quiet.
  Tap → fullscreen Stage.
- **Below, the marquee as a vertical feed:** full-width **living posters** — real
  mini-renderers (one animating at a time, viewport-driven; end-state when reduced-motion),
  the two models, an at-a-glance advantage read, and one line of stakes (`#7 seed beat the
  #1` · `a nail-biter — the lead changed four times`). This is a lean-back feed of watchable
  games — the scroll itself should feel like flipping channels.
- **Solo benchmarks** (the 12 Control & Arcade games + Blackjack) appear here as their own
  clearly-labelled `Benchmark run` lane — a lander descending is great phone content — never
  intermixed with head-to-head matches.
- **Live matches** stream over the same WebSocket the web uses; a match that isn't live
  degrades honestly to its poster (`replay ready` / `verified replay pending`) — the 409
  `match_not_live` case is a designed state.
- Filters exist but are one quiet `⋯` sheet (game, models, `close games only`) — intent, not
  the browse gesture.

Fullscreen watching inherits everything from §5.3 minus input: seat headers, thinking as
theatre, reasoning as narration, the result curtain, the share-the-turning-point deep link
(`watch the move that broke GPT-5`) — which on mobile shares an app/universal link + OG
card.

---

## 7. The games — every game earns its skin

Three assets per game, one system. The 12 renderer families from `DESIGN_NOTE_battlefield.md`
§6 are the canonical board designs — the app renders the same families with the same
last-move language, reveal choreography, and motion beats (`--game-motion-*`). What the app
adds per family is **touch input** and **phone framing**:

| Family (games) | Portrait framing | Touch input (Arena) |
|---|---|---|
| `grid_3x3` (Tic-Tac-Toe, Ultimate TTT) | Board huge, centered | Tap a cell. Ultimate: active local board lifted, tap-through guarded |
| `connect_four` | Full-width columns | Tap a column; press-and-hold previews the drop |
| `square_board` (Chess, Othello, Checkers, Shogi, Xiangqi, Battleship, Mancala, Morris, Pentago, Backgammon) | Width-filling board | Tap piece → legal-move dots → tap target. Drag optional, never required. Battleship: tap the fog grid |
| `go_board` (Go 9×9, Gomoku 15×15) | 9×9 fits; 15×15 pinch-zoom + magnifier loupe under the finger | Tap intersection; loupe prevents fat-finger stones |
| `hex_board` (Hex) | Parallelogram width-fit, edges seat-tinted | Tap hex |
| `card_table` (16 games) | Your hand fanned in the thumb zone, table center above | Tap to select, tap again (or drag up) to play; multi-card selects stack |
| `dice_table` (Liar's Dice) | Table ring compressed to an arc over your cup | Bid via a stepper wheel (count × face), `Call` as the big red-letter moment |
| `payoff_matrix` (RPS, Prisoner's Dilemma) | Matrix center, your choices as three/two large chips | Tap a chip; simultaneous reveal choreography |
| `auction_panel` (Sealed-bid) | Bid panel center | Numeric slider + fine-tune stepper, `Seal bid` commits |
| `economic_panel` (Negotiation, Bargaining) | Offer cards stacked | Offer via slider/stepper, `Propose` / `Accept` / `Reject` as clear verbs |
| `control_benchmark` (12 RL + Blackjack) | Watch-only (Battlefield lane) | — |
| `custom` | Fallback: the honest state panel | — |

**Icons:** every Arena game ships a proper glyph (complete the `GameGlyph` set — no category
fallbacks visible in the app). Same rounded-square icon-tile anatomy as the web (`.gtile-icon`),
drawn in the outline style, accent-tinted at rest, solid accent when selected.

**Previews / load screens:** one scripted-run animation per family (not per game — 12
builds, 50 games), parameterized by the game's board/pieces, reused in three places: the
quick-match card, the game sheet, and the pre-match curtain-riser. The v4 prototype's
`arena-preview` mapping is the creative reference; rebuild on the real renderers.

**Launch tiering (design for it):** the shelf leads with `main_arena` (13); `advanced_arena`
(18) lives in Browse; the 6 `table_mode_pending` table games (Hold'em ×2, Leduc, Mahjong,
Dou Dizhu, Bridge) appear as designed **`Coming soon` tiles** — visible, wanting, not
tappable-to-nowhere — until table mode ships platform-side.

---

## 8. The Humans-vs-Models board (top-left)

The app's only leaderboard, and its rallying cry. **Honesty constraint:** today the platform
has no human rating system — only per-profile W/L/D counters and per-match human results.
Design the v1 on data that exists, with the ladder as a designed-and-waiting state:

**1 · The war banner.** The aggregate: `Humans vs Models` with one big score — humanity's
all-time (or this-week) win rate against the machines, drawn from real match seats. This
number is the screen's hero and the app's water-cooler stat. Segmented `All time / This
week`, per-game filter chips.

**2 · The gauntlet — models ranked by how hard they are to beat.** Rows: model badge ·
human win rate against it · games played (mono). The consumer framing writes itself:
`Undefeated vs humans` / `Beaten 1,204 times`. Tapping a model row offers one action:
**Challenge** → the game sheet with that opponent pre-selected. Every row is a door back to
play.

**3 · Your standing.** Signed in: your W/L/D, best game, current form (last-5 chips), and
your hardest scalp (`You've beaten Claude Opus — most humans haven't.`). Percentiles and a
named human ladder ship only when a real human rating exists (§10) — until then this section
never fakes a rank.

**4 · The ladder (future, designed now).** Reserve the anatomy for the named-humans
leaderboard (rank · avatar/username · rating · form) behind a `Coming soon` state, so the
screen's architecture doesn't reshuffle when the rating lands.

Official-vs-human separation is law (brief §8.12): nothing on this screen mixes with
official model scores; no Official Score, no credible intervals, no "Elo" ever.

---

## 9. Profile, auth, and the honest data pact

**Profile (top-right, pushed):** identity block (avatar, username, member-since) → overview
strip (W/L/D, win-rate-by-game bars, favorite game) → **match history** where every row
opens the fullscreen replay Stage → settings.

**Settings (minimal, consumer):** Appearance (system/light/dark) · Sound & haptics ·
Notifications · Account (via existing Better Auth flows — email, password, linked accounts,
sessions) · **Your data** · Sign out. Identity/security changes reuse the platform's step-up
re-auth. Nothing here should feel like a bank; one screen, plain words.

**Auth:** a sheet, not a page — SSO first (Google; Apple is required table stakes for iOS),
then email. Signup asks for a username (`eslams.com/username`) and nothing else. It appears
only when the user tries to play, and returns them to their exact intent (the game sheet
they were on, selection intact).

**The data pact (design it proudly, not fine-print):** eSlams' business is human-vs-model
gameplay as research data. The app must say so in one honest, confident screen at signup —
`Your games make AI better. Match moves and outcomes may be used, anonymized, for AI
research and evaluation.` — with the match visibility default (public/private) chosen right
there, and a **Your data** settings section that restates it and houses the visibility
default + per-match toggles (which already exist platform-side). Plain language, sentence
case, no legalese wall. Trust is the brand; consent UX is part of the design system, not a
compliance afterthought. *(Copy here is placeholder — final wording needs legal review for
UK GDPR; the design should assume a consent moment exists and make it beautiful.)*

**Notifications (retention, used sparingly):** push is opt-in, asked *after* the first
completed match (never at first launch). Grammar: match-driven only at v1 — `A new model
just arrived. Nobody has beaten it yet.` · `Your rematch with GPT-5 is waiting.` (an
unfinished session) · one optional weekly digest (`Humanity went 41% this week.`). No
streaks, no daily-reward mechanics — retention through wanting to play, not guilt.

---

## 10. Data & platform prerequisites (design honest states for all of these)

The app is designed against the intended platform, with designed fallbacks for today's
gaps — never fake data, never dead-end:

1. **Human rating / named human ladder — does not exist.** V1 board uses aggregates +
   personal stats (§8); the ladder is a designed `Coming soon` state. (Schema leaves room;
   the computation is net-new.)
2. **Per-turn advantage/win-probability — does not exist** (Battlefield note §12). The
   advantage bar stays neutral mid-game, resolves at result. Never invent a curve.
3. **Per-move thinking time is not in persisted replays** (captured live, dropped at
   projection). Live matches show real thinking clocks; replays omit the latency chip until
   the field is persisted.
4. **Six table games are `table_mode_pending`** — `Coming soon` tiles until the platform
   ships table mode.
5. **Engine dependency:** only Tic-Tac-Toe and Connect Four run without the Core runner
   container. The curtain-riser's escalation path (§5.2) is the designed answer to a cold or
   busy engine.
6. **Arena live reconnection** uses snapshot-on-connect + state polling (the event cursor
   isn't public) — the now-playing bar and Stage must re-sync gracefully from a snapshot
   after backgrounding; design the `reconnecting…` micro-state (a quiet ribbon pulse, not a
   modal).
7. **Human-vs-human, invites, spectating friends — platform-absent**; out of scope v1
   (listed in §2). If/when it lands, the seat-ring picker (§5.1) is the anatomy it slots
   into.

---

## 11. Light + dark, accessibility, performance

- **Both themes, system-following by default.** Same geometry, values swap. Dark is
  primetime for Watch; light must be equally complete (a well-lit gallery). The Stage's
  focus dim is a surface-luminance step, never bloom.
- **Accessibility:** Dynamic Type respected everywhere outside the board itself (the board
  scales by geometry, the ledger/reasoning scale by type); VoiceOver/TalkBack labels on
  every control; boards playable via accessible actions per cell/piece; live regions
  announce moves (`Turn 14 — Claude drops column 4`); reduced-motion maps every beat to its
  end-state (the splash, previews, posters, Stage); haptics and sound each have independent
  toggles; seat identity always carries a non-color cue; WCAG AA contrast in both themes.
- **Performance is design:** cold start to interactive ≤2.5s (the splash *is* the budget);
  board interactions at 60fps on mid-range Android; one animating poster at a time in the
  Battlefield feed; renderers lazy-load per family; the Stage streams over one WebSocket and
  survives backgrounding via snapshot re-sync. If a poster feed janks, cut posters — the
  feed must scroll like silk before it animates at all.

---

## 12. Copy & voice (consumer dial turned up, honesty unchanged)

Player language, sentence case, a little cheekier than the web — the wit lives in copy, not
decoration:

- Setup: `Pick your game. Pick your victim.` · Status: `GPT-5 has taken its seat.`
- Thinking: `Thinking… it's been 14 seconds. That's usually a good sign — for it.`
- Result (win): `You won. Somewhere, a datacenter is embarrassed.` · (loss): `It took GPT-5
  41 moves to beat you. Make it 50 next time.`
- Board banner: `Humanity: 38%. We need you.`

Locked vocabulary holds (Game / Arena / Match / Replay / Battlefield; never "battle", never
"Elo", no emoji in UI). Honesty rules hold: no `live` framing over stale data, `Ready` /
`Slower turns` status vocabulary, latency expectations from telemetry, unverified states say
so plainly. The cheek never touches the numbers.

---

## 13. Handoff — what to produce

Design, in both themes, portrait-first:

1. **The splash** — three beats + reduced-motion variant.
2. **The chrome** — the two-tab pill dock (rest/active/transition), top-corner entries, the
   now-playing match bar, the auth sheet.
3. **Arena tab** — resume card, quick match, the shelf, browse grid (incl. `Coming soon`
   table-game tiles), the game sheet (preview, how-to, model wheel, seat/side picker).
4. **The curtain-riser** load screen — template + escalation states (waiting/options/engine
   busy) + the transition into the Stage.
5. **The Stage · play** — portrait layout for each seat layout (two_sides, table_ring
   compressed arc, compass); the input overlays for the 10 playable families (§7 table);
   thinking-as-theatre micro-states; premove; reconnecting ribbon; exit/resign sheet;
   claim-the-win.
6. **The result** — scoreline card (win/loss/draw), the accent sweep, and the **share image
   card** as a designed artifact (both themes, both outcomes).
7. **The Stage · watch/replay** — filmstrip scrubber + transport in thumb zone, reasoning
   ledger as the scroll, landscape variant, swipe-down dismissal.
8. **Battlefield tab** — auto-programmed hero, the living-poster vertical feed, the
   benchmark lane, the filter sheet, poster fallback states.
9. **Humans-vs-Models board** — war banner, gauntlet rows with Challenge, your standing,
   the reserved ladder state.
10. **Profile + settings + the data pact** — history rows → replay, the consent moment, Your
    data screen.
11. **Push notification set** — copy + when each fires.
12. **App icon** — the mark alone on the squircle, exported per-platform; no text.

Work strictly in the token set; reuse the per-family board designs from
`DESIGN_NOTE_battlefield.md` §6 (one board system across web and app — same board, same
last-move language, different input affordances); propose the smallest possible set of new
tokens (likely: dock height/blur, haptic/sound naming, share-card safe margins). No neon, no
glow, no gradients on controls, no emoji, no mascots.

**The measure of success:** someone downloads the app in a queue, is mid-match against a
frontier model inside 60 seconds, feels it think, beats it or nearly does, and shares the
scoreline — then comes back that evening and watches two machines play Go on the sofa. Play
and Watch, one skin, nothing loud.
