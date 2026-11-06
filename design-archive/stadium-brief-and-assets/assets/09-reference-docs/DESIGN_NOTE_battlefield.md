# Design Note — Battlefield, redesigned end to end

**For:** the design agent (Claude design). **Status:** design intent, ready to design against.
**Reads with:** `DESIGN_BRIEF.md` (the house language — obey it), `COMPONENT_REFERENCE.md` (recipes),
`TECH_NOTE_battlefield_visualization.md` (how it's built — renderers, libraries, data gaps).
**Date:** 2026-07-07 (revised after the v0.5 Arena rebuild landed on `main`). **Note:** the board
system here is **shared with Arena** — one renderer set, two surfaces (see "One board system for Arena
and Battlefield" below).

Battlefield has full design latitude — it should be the most beautiful, most watchable surface in
the product — but it lives inside eSlams' principles, not beside them: **clean, modern, AI-native;
never cyberpunk. One accent; color is information. Show, don't tell. Honest surfaces. Latency is
personality. Performance is design.** Nothing here suspends those. It points them at an emotional
core instead of a data table.

---

## 1. The essence

> **You open Battlefield and two minds are already mid-fight on a lit stage. You can feel whose
> turn it is, watch one of them take a long, hard think, see the advantage tip, read exactly why it
> moved — and when it's over you can slide back to the turn it all changed and send that moment to a
> friend.**

That is the whole product. Everything below serves it.

Design like Jony Ive: **find the one essential thing and make everything else disappear.** The one
essential thing is *watching a game being played by machines that are visibly thinking.* The board is
the object. The reasoning is the voice. The advantage is the tension. Chrome recedes into shadow.

### What's there today (and why it fails)

The live Battlefield is a **placeholder pretending to be a page**. Its viewer renders *every* game —
blackjack, RPS, goofspiel, chess — as the identical stub "Game view coming soon"; `/replays` shows a
blackjack hand as the raw string `1111441155`; scores read "Coming soon"; a raw i18n key
(`Turn 0 | replay.placeholder`) leaks into the UI; there is no working scrubber. Structurally it's a
two-column **list + viewer** where the match list and the board fight for attention and the board
loses — it becomes a thumbnail next to a table. The generic grid renderer is the villain of the
current experience. We don't improve it. We delete it and build a stage.

*(Post the v0.5 Arena rebuild: **Arena and `/replays` already render real per-family boards** — a
proper renderer set (stones, discs, a card table, backgammon, hex, etc.) lives in
`platform-pages.tsx`. Battlefield **forked a degraded generic-grid copy** and kept the flattener,
which is why it alone shows text tiles. The fix is not to build new renderers — it's to **share the
ones Arena already has** and delete Battlefield's fork. See `TECH_NOTE_battlefield_visualization.md`
§1.5; the visual system below IS that shared set, polished.)*

### One board system for Arena and Battlefield

Design the Stage's board (§4.2, §6) as **a single shared renderer used by both surfaces** — Arena
(play + setup preview), Battlefield (live + replay), and `/replays`. Same board, same last-move
language, same motion, same light/dark. The only difference is intent: **Arena play** puts a thin
interactive input overlay on the board (click to move); **Battlefield** shows the identical board
read-only with the scrubber. Everything you design here lands on Arena too — so a game looks the same
whether you're playing it or watching it. (This is a branch-sized refactor of Arena's rendering; the
engineering stages it on a branch off the Arena rebuild — tech note §1.5.)

---

## 2. Battlefield's own principles (extending the brief)

1. **The stage is always live; the page is never empty and never static.** There is no "select a
   match to begin" gesture and no empty viewer. On arrival, Battlefield auto-programs the best thing
   on right now — a live match if one exists, otherwise the most dramatic recent replay, quietly
   auto-playing. You don't start watching; you're already watching, and you change the channel.
2. **One thing in focus at a time.** The list and the stage are never both at full weight. You are
   either *choosing what to watch* or *watching*. When you watch, the board is the single largest,
   brightest object on screen and everything else is a thin ribbon or a receded surround.
3. **Thinking is the show, not a spinner.** The dead air between moves is the drama. Stage it: the
   held breath before a move, the reasoning delivered as the line, the advantage settling after.
4. **Drama comes from light, focus, timing, and silence — never from color or effects.** A theatre is
   dramatic because of what it chooses *not* to light. That is the same instinct as "color only
   encodes information." No neon, no glow, no glitch, no confetti. The energy is tempo and focus.
5. **Every match is a story with a shape.** Beginning (the matchup and stakes), the turn (the moment
   the advantage swings hardest), the climax (the result). The product finds that shape automatically
   from data it already has, and lets you share it.
6. **Two gears, one surface.** Lean-back (ambient: it plays itself, transport fades, reasoning
   narrates) and lean-in (focused: you scrub, step, read, compare). One gesture flips gears. The
   curious visitor and the rigorous researcher use the same stage at different intensities.

---

## 3. Page architecture — four rooms, one hero

A single vertical spine. Importance descends top to bottom; the hero owns the fold.

**1 · THE STAGE (hero).** The match viewer, singular and full-width, above the fold, already
mid-play. This is the reason anyone is here. Detailed in §4.

**2 · THE MARQUEE (discovery — "why watch _this_").** Directly under/around the stage: a curated
"now showing / live now / worth watching / coming up." Not an algorithm — a programmer's bill. Each
entry is a **living poster**: a small animated board (real `renderer_family` + `animation_spec`,
respecting reduced-motion by showing the end-state), the two models, an advantage bar as an at-a-
glance tension read, and **one line of stakes** ("#7 seed beat the #1", "first meeting", "a
nail-biter — the lead changed four times"). Clicking a poster **changes the channel**: the Stage
crossfades to it; the page does not reload or jump.

**3 · THE PROGRAMME (the list — subordinate).** The dense, filterable Live / Recent / Scheduled
roster for the researcher who wants the index, not the show. It's honest about its role — it sits
below the marquee (or behind "See all matches"). Filters are for *intent* (game, category, model,
provider, outcome, "close games only"), collapsed by default so they never dominate. This preserves
today's filtering power (23+ games, the model list) but demotes it from co-hero to reference.

**4 · THE BOX OFFICE (Request a match — quiet).** Reframed from a loud primary button into a single
calm door, always reachable, never shouting — because *watching*, not requesting, is why ~95% of
people are here. It's still the game+two-models form, framed as booking a slot: "Pick the card, we'll
air it → it appears in the marquee when the replay is ready." This is the open-source contribution
loop dressed as fandom.

**Subtraction from today (the Ive cut):** remove the left match-list sidebar (→ the marquee rail);
remove the empty-viewer state (→ auto-program); remove the "Game view coming soon" grey grid (→ real
renderer, or an honest "not yet aired" state that lives only on a poster, never on the stage); demote
the metadata `<dl>` dump (arena/variant/timestamps/ranking) behind "Match details" / a drawer; unify
the two A/B move rails + separate move history + raw scrub input into **one lane** (§5.4).

---

## 4. THE STAGE — the shared system every game plays on

One frame for all ~50 games, so a Go replay and a poker replay read as the same product. Four honest
layers; chrome recedes.

### 4.1 Seat headers (top rail)
A left/right pair for `two_sides`, four compass points (N/E/S/W) for `compass` (bridge), a ring for
`table_ring` (poker/multi-seat), a single header for `solo_panel` (benchmarks). Each header is a calm
card: provider avatar, model display name (sans, formatted properly — "Claude Opus 4.8", never
"Claude Opus 4 8"), model id + official score (mono), and a thin **accent underline when it is that
seat's turn**. *The active seat's header is the only thing wearing accent at rest.* No VS lightning,
no versus glow — the matchup reads from typography and one underline.

### 4.2 The board / panel (the hero, dead center, maximal)
Where a family's identity lives (§6). Sits on `--surface` with a 1px `--accent-line` hairline frame,
`--r-lg` corners, no shadow heavier than `--shadow-sm`. Generous margin — the largest thing on screen
at every breakpoint. `board_size` + `renderer_family` decide its shape (a 15×15 gomoku and a 3×3
tic-tac-toe both sit sensibly).

### 4.3 The advantage instrument (the tension, under the board)
**A single horizontal bar spanning between the two seats — the tug-of-war rope that connects them.**
It fills toward whoever leads, with a hairline "0" midline so a dead-even position reads instantly. It
is the broadcast's win-probability graphic and the *only* place a win/loss color appears (muted
`--win`/`--loss` tokens, never brightened) — dramatic precisely *because* it's the only thing that
changes color, and it only ever means one thing. It moves **slowly and honestly**: a big swing is a
big, felt slide. Advantage is **directional, not moral** — a draw resolves to dead center with both
seats equal.

- In **replay**, the bar grows a memory: a thin **historical trace ribbon** beneath it shows the whole
  game's swing, with the playhead riding it — *the story in one glance.* You see the moment it turned
  before you scrub there.
- Honesty note: the advantage number does not exist in the data contract yet (see tech note §5.3). Until
  Core emits it, the bar shows only the resolved **result** at the end and stays neutral mid-game
  rather than faking a curve. Design both states; never invent precision.

### 4.4 The ledger / commentary + reasoning (right rail on desktop; sheet on mobile)
Turn-by-turn rows: turn number (mono), seat dot, **action label** (mono, in natural language — "drops
column 4", not a raw token), and the **public reasoning line** (sans, `--text-2`) treated as the
caption. This rail is identical across families — it is the product's spine and what makes every game
feel like a sibling. In a **live** match it's a running play-by-play ticker (newest on top,
auto-follows unless you scroll). In **replay** it's the scrub filmstrip (§5.4). The reasoning is *not*
buried in a side panel as today — **it is the narration.** (Reasoning is optional per frame; when a
turn has none, the row is quiet — "no public reasoning attached" — never a fake sentence.)

### 4.5 Shared last-move language (the same verb everywhere)
The piece/cell/card that changed this frame **settles**: it arrives at final position/opacity, a 1px
accent ring **pulses once** on its footprint, then fades to a persistent thin accent outline marking
"this was the last move." Exactly one last-move marker exists at any time; advancing or scrubbing
moves it. This single motif (**arrive → ring-pulse → thin outline**) is reused by every family, so the
eye always knows "what just happened" without reading the ledger.

### 4.6 Shared reveal choreography (hidden info, honestly)
Hidden information turns face-up via a short **crossfade + scale-settle** — never a flip-with-motion-
blur or sparkle. Simultaneous reveals (RPS, sealed-bid, prisoner's dilemma, showdowns) reveal *all
seats on the same frame* with one synchronized settle, so no seat "wins the render." Face-down
tokens/backs/cups are the visual promise that the information is genuinely hidden until earned — and
Core strips it from the frame, so the renderer simply trusts what it's given.

### 4.7 Motion grammar (three named beats, from `animation_spec`)
Every transition is exactly one of: **move** (`default_move_ms`, ~220ms; connect-four earns 320ms),
**reveal** (`default_reveal_ms`; 300ms for hidden-info), **result** (`default_result_ms`, 520ms). One
shared calm ease-out — no bounce, no overshoot, except the single gravity settle Connect Four earns.
Nothing loops, nothing pulses continuously, nothing glows.

### 4.8 The result — the curtain (the climax, staged)
Today the result is a status badge. Make it the climax it is. On the terminal frame: the board holds
on the final position, still lit; a single slow beat of *focus* (the surround recedes one step); the
advantage bar runs fully to the winner's side in one confident motion; the winning seat header rises
to full presence (accent), the other settles to neutral (directional, not moral). Then a slim **result
ribbon/card** rises *below* the board (so you see the winning position *and* the verdict together):

> **GPT-5 wins** · Chess · standard · 41 moves · decided on turn 34
> *The lead changed three times; the move-34 exchange settled it.*
> [ Watch the turning point ] · [ Share this match ] · [ Next up ]

The win/loss token is used **once**, on the winner's name. No confetti. The grandeur is the stillness.
Then the Stage relaxes into replay mode (the trace ribbon now complete). **Reduced-motion:** the
winner state and ribbon simply appear; who won and when it was decided is identical.

---

## 5. Live vs replay, and the two gears

Frames are identical in shape, so the Stage is identical live and on-demand. The differences are
honest and few.

### 5.1 A live match feels present
The on-move seat header activates (accent underline + status verb flips to `thinking…`); the other
goes `waiting` and dims one step. You know *whose move it is* pre-attentively, without reading a word.

### 5.2 Thinking as theatre (brief §9)
A model taking 5–20s is the product's soul, not a failure. Stage it as suspense:
- The board holds still. A **deliberation clock/arc fills** around the active seat while it thinks
  (this is just honest elapsed time on the current turn — the single best free piece of drama; a long
  think reads as "it found something / it's in trouble"). Pair with the brief's telemetry median
  ("usually moves in ~9s").
- When the move commits, the grammar is **cause → effect → consequence**: the reasoning line **writes
  in first** (the actor's line), *then* the piece moves (`default_move_ms`), *then* the advantage bar
  settles (`default_result_ms`). You understand *why* before you see *what* — explainability delivered
  as drama, not a tooltip.
- **Move first, explanation second** is already brief law; here the explanation is the centerpiece.
- **Reduced-motion:** no arc, no slide, no typing — piece and advantage appear in end-state, reasoning
  is placed. The drama is entirely optional decoration over an always-honest end-state.

### 5.3 Latency, honestly (no fake spinners)
Every "thinking" state is driven by a real stream heartbeat (brief §9), never a timer. Escalate, never
dead-end (30s "taking longer than usual" → 60s options → hard cap "claim the win on timeout"). The
transport hides during live playback (you're watching, not driving) and returns the instant you touch
a control.

### 5.4 Scrubbing a completed match feels like a film reel
Replay mode makes you the projectionist. The ledger becomes a **filmstrip of beats**, not a raw
slider: a tick at every move, **taller ticks at story beats** (advantage swings — see §5.5), so you
can *see the shape of the game before you play it.* Dragging the playhead moves the board **and** the
advantage bar **and** the highlighted reasoning line in lockstep — never a board from move 30 with an
advantage from move 12. Transport: restart / step / play-pause / step / skip-to-end (keyboard-
friendly — ←/→, Home/End, Space), centered under the board like a media transport, with a **speed
control** (0.5× / 1× / 2× / instant). **Autoplay on arrival** at a calm cadence keyed to
`animation_spec`, so the Stage is never static; any interaction pauses it. This unifies today's dual
A/B rails + separate history + `<input type=range>` into **one lane**.

### 5.5 Story beats + the shareable moment
A match gets a three-act shape automatically: **beginning** (matchup + stakes) → **the turn** (the
beat where advantage swung hardest / last crossed the midline) → **climax** (result + one-sentence
verdict). "Share this match" produces a deep link (`/battlefield?match=…&turn=34`) that opens the
Stage **pre-scrubbed to the turning point**, with an auto-composed OG image (two avatars, game, the
swing, the turn's reasoning as caption). You share *"watch the move that broke GPT-5,"* not "a match
exists." That is the discovery flywheel for an open-source leaderboard. *(Depends on typed key-moment
markers — tech note §5.4.)*

---

## 6. Per-family visualization — all 11 renderer families

One shared Stage (§4); each family's board/panel is bespoke. Concept-level, in the house language;
buildable as thin SVG/DOM/Canvas (tech note §3). Marks/pieces/cards are **content** (drawn in
`--text`/side-neutral fills), not chrome — the accent is reserved for turn/last-move/result.

- **`grid_3x3` — tic-tac-toe, ultimate-tic-tac-toe.** A confident 3×3 lattice, large square cells,
  `--accent-line` grid, stroked X/O glyphs in `--text` that *write on* (stroke-draw over move-ms).
  Winning line drawn through the three cells on result. Ultimate = the same 3×3 rendered nine times;
  only the active local board is lifted (`--surface-2` + accent underline), the rest recede — the
  fractal stays legible because only one board is ever "hot."
- **`connect_four` — connect-four.** The one family that earns gravity. Seven columns of circular
  wells; two-tone discs (seat color **backed by an interior ring shape-cue** for colorblind safety).
  A move drops from above and settles with the system's only small gravity bounce (320ms). Four-in-a-
  row accent line on win. Tactile, physical, the "show don't tell" hero.
- **`square_board` — chess, othello, checkers, shogi, xiangqi, battleship.** Precise N×N neutral
  two-value checker grid (the board is *furniture*, never accent). Flat side-colored piece glyphs (not
  skeuomorphic 3D). A move **glides** along its path; origin square ghosts; captures fade out on
  arrival. Othello's identity is the **flip** — flanked discs turn color in a short staggered reveal-
  crossfade, a wave without spin. Battleship lives here structurally but is hidden-info: only the two
  fog grids of shots show; a shot resolves hit (filled + ring) or miss (small neutral dot); ships are
  never in the public frame.
- **`go_board` — go (9×9), gomoku (15×15).** Stones on **intersections**, on a warm-neutral field
  crossed by thin `--text-3` lines with star points; stones sized just under line spacing so the
  lattice stays visible. Placement is a quiet fade+settle. Go's soul is **capture** — a dead group
  fades out together on one reveal beat. Gomoku's win draws the five-in-a-row line. Go territory at the
  terminal frame may show faint seat-tinted region fills — the only place large soft color appears,
  and only to encode the scored result.
- **`hex_board` — hex.** An 11×11 parallelogram of pointy-top hexes; the two opposing edge-pairs
  subtly tinted per seat to *state the objective* ("connect these two sides"). Hex cannot draw, so the
  terminal beat is decisive: the winning connected chain is traced edge-to-edge as one continuous 1px
  accent path — the bridge lighting up. The clearest possible statement of who won and why.
- **`payoff_matrix` — prisoner's dilemma, rock-paper-scissors.** A small labeled matrix (2×2 / 3×3),
  sans labels, mono payoffs. Because choices are simultaneous and hidden, pre-reveal shows both seats'
  pending choices as **face-down chips beside the matrix** (not on it). On reveal both turn face-up on
  the same frame; the selected intersection cell lights with the last-move ring and its payoff pair
  emphasizes. A slim per-round history strip below makes a *strategy* (tit-for-tat, always-defect)
  legible across rounds.
- **`auction_panel` — first-price-sealed-bid-auction.** A quiet fintech-grade panel, not a board.
  Each seat is a row with a **sealed-bid chip** while bidding; on reveal all chips turn face-up
  simultaneously, the winning (highest) row rings + gets a "wins" tag, and the settlement resolves in
  mono. A slim value axis plots the bid spread — how aggressive vs conservative each model bid. A calm
  trade blotter.
- **`dice_table` — liar's dice.** Bluff and doubt made visible. A `table_ring` of seat cups showing
  **count, never pips** (you see how many dice a rival holds, not their values — honest hidden-info).
  The center holds the current bid as a large mono claim ("four 5s") — the shared object. A "call"
  triggers the climax: every cup reveals simultaneously, matching pips light, the tally resolves, the
  loser's cup loses a die (fade). Drama is entirely in the honest reveal.
- **`card_table` — the largest family (16 games): poker×3, bridge, hearts, spades, euchre, gin-rummy,
  cribbage, hanabi, mahjong, dou-dizhu, goofspiel, crazy-eights…** One shared **flat `<Card>`
  primitive** (mono corner rank, suit glyph, suit color red/black **as information only**, never
  accent). Hands arranged by `seat_layout` (`table_ring` default; `compass` for bridge). Visible cards
  face-up; hidden hands are **face-down backs showing count only**. A shared central area holds the
  trick / community cards / discard. Deal = staggered fan-in; play = card glides to center + ring;
  showdown = synchronized face-up reveal; trick collected = cards slide to the winner. Pot/chips/tricks
  live in the score strip in mono. **Hanabi** is the honest inversion (you see everyone else's cards,
  not your own) — the same primitive, per-seat visibility flipped.
- **`control_benchmark` — the 12 Control & Arcade games: lunar-lander, cartpole, mountain-car,
  car-racing, bipedal-walker, taxi, frozen-lake, cliff-walking, paddle-ball, alien-shooter, and the
  boxing/hockey-style arenas.** **Not a matchup** — a `solo_panel`, one agent pursuing a scored
  objective. A clean **schematic** scene (flat vector, materials-and-light — never a screenshot):
  lander descending to a marked pad with a thin trajectory trail + mono altitude/fuel; cartpole with an
  angle indicator; grid-worlds as labeled grids with agent + goal/hazard; racing/walker as a side
  track with a progress marker. Because these are benchmarks, a prominent **mono score/reward** + a
  progress-to-goal track is the point. *These belong in a clearly-labelled "Benchmark run" lane, not
  the head-to-head grid* (they are solo, not matches — tech note §3.5).
- **`economic_panel` — negotiation, bargaining, trust/public-goods gametheory games.** A `two_sides`
  or `table_ring` negotiation panel: each seat has an offer/position card (mono amounts); the center
  holds the current joint state (a proposed split, a pot, a contract). A move updates a seat's card +
  ring; a settlement resolves the center + writes final payoffs on the result beat. A round-by-round
  convergence strip charts each seat's offers as converging/diverging ticks on a shared axis — so a
  negotiation's arc (concession → deadlock → deal) is legible at a glance. Shares the reveal + axis
  machinery with `auction_panel`.

---

## 7. Discovery — why watch *this* match

Answered structurally so nobody has to comparison-shop a list. The Stage **auto-programs** the best
thing on now (a live top match, else the recent match with the biggest advantage swing) — the product
makes the editorial call, like a channel. Marquee posters **sell stakes, not metadata**: one reason
per card — "#1 vs #2", "first meeting", "upset in progress", "a comeback", "match point". A curated
**"Worth watching"** shelf surfaces upsets (a lower-ranked model won), brilliancies (a decisive turn),
nail-biters (the advantage crossed the midline 3+ times), and debuts. Filters are for intent, not the
primary browse gesture.

---

## 8. Light + dark

Both themes share one geometry; only values swap; the drama comes from motion, elevation, and focus,
so it survives the flip unchanged. **Color still encodes information only** — live = accent dot,
advantage = accent-vs-neutral, win/loss/draw only in result/history contexts, never ambient chrome.

- **Dark = primetime.** The Stage frame is the darkest surface (`--surface`/near-`--bg`, a true calm
  charcoal, *never* black, *never* neon-edged); the board floats on it with a hairline, lit by
  **contrast**, not glow. The entry "dim" is a genuine reduction of surrounding surface luminance,
  tokenized — no bloom, no emitted light.
- **Light = the arena in daylight / a well-lit gallery.** The board sits on the cleanest, brightest
  surface with the crispest border and softest elevation (`--shadow-md`). "Focus" is achieved by
  desaturating and receding the surround (toward `--surface-2`) while the board stays pure — a
  well-lit gallery is as focused as a dark theatre.

---

## 9. Mobile — the phone is the best seat in the house

"One thing in focus" stops being a choice and becomes physics. Portrait Stage full-screen: thin ribbon
(back · game · LIVE dot) → the two seats as a compact facing pair with the **advantage bar between
them** → the **board filling the width** (pinned/sticky) → the reasoning line → transport in the
thumb zone. `seat_layout` drives framing (`two_sides` = names L/R; `compass`/`table_ring` = a compact
arc above the board; `solo_panel` = a single actor label). `renderer_family` + `board_size` size the
board (a 15×15 board scrolls/zooms; small boards get generous margin). **The reasoning ledger is the
scroll** — you thumb the play-by-play like a live thread while the board stays pinned; superb one-
handed. The marquee becomes a vertical stack of full-width living posters — a lean-back feed of
watchable games. Scrubbing is a full-width drag on the filmstrip; story-beat ticks are big enough to
tap. Honor the 980px stack breakpoint from the brief; invent no layout that doesn't collapse cleanly.

---

## 10. Motion, accessibility, performance (non-negotiable)

- **Reduced motion** (`prefers-reduced-motion: reduce`) maps every beat to
  `animation_spec.reduced_motion_behavior`: moves/reveals become instant final-state or a pure
  fade-only crossfade; the scrubber jumps between static frames; autoplay off; the LIVE dot stops
  breathing. **The visualization is fully legible and fully honest with zero motion** — nothing is
  conveyed by motion alone (the story is in the sequence and the words, which cost nothing).
- **Accessibility (brief §10):** the global 2px accent `:focus-visible` ring on everything; the
  scrubber is fully keyboard-operable (←/→, Home/End, Space) with `aria` value text; live regions
  announce move arrivals politely ("Turn 14, Claude drops column 4"); charts get `role="img"` +
  `aria-label` (or an sr-only turn-by-turn summary); WCAG AA contrast in both themes — check the muted
  advantage-bar `--win/--loss` and `--text-3` on tinted surfaces. Seat colors must carry a non-color
  cue (the C4 interior-ring pattern) so the matchup survives color-blindness.
- **Performance is design (brief §11):** the Stage is a *single lazy renderer island* for the current
  `renderer_family` only (not a grid of live widgets); marquee posters animate only when visible
  (`IntersectionObserver`) and only one at a time; the heavy `.eslams` artifact loads only when the
  Match-details drawer is opened. `/battlefield` must stay in the `/replays` 300KB first-load band.
  An ambient channel that jank-scrolls isn't watchable — the theatre is mostly empty space, which is
  free.

---

## 11. Copy & voice

Player language, sentence case, honest (brief §5, §12). **Retire every placeholder observed live:**
"Game view coming soon", "Coming soon Score", "Turn 0 | replay.placeholder", "No playable moves are
available yet", the doubled "Match resultComing soon". Where a match genuinely has no replay yet, say
so on its **poster** ("verified replay pending"), never on the Stage — and never occupy the Stage with
an empty state; auto-program something that *does* play. Locked vocabulary: **Match**, **Replay**,
**Battlefield** (the surface, not the matches — "Latest matches", never "Latest battles"); **no "Elo"**
anywhere (use official score 0–1000 + credible interval); "Live" only over genuinely live data (a
surface with 0 live shows no live framing). Model names formatted properly; timestamps relative with
absolute on hover.

---

## 12. What this depends on (and what stays honest)

The experience above is blocked or degraded by a few missing data fields — detailed in
`TECH_NOTE_battlefield_visualization.md §5`. The two that most shape *this design*:
- **Per-turn advantage / win-probability does not exist yet.** The advantage instrument (§4.3) and the
  replay trace ribbon (§5.4) need it. Until Core emits an honest per-turn advantage, design the
  neutral/result-only state and **never fake a curve** — an unlabeled or invented advantage is worse
  than none (brief §8.2).
- **Per-turn scores already exist but are dropped before the UI** — surfacing them unblocks the
  live scoreboard/momentum immediately.
Also needed: typed key-moment markers (the story beats + share link), per-move latency in the UI
(thinking-time), symbolic RL trajectories (the benchmark lane), and removing the residual Elo fields.
*(Good news from the v0.5 rebuild: the render/animation contracts are now typed
(`GameRenderSpec`/`GameAnimationSpec`), and shared motion tokens (`--game-motion-*`) + seat-map
layouts (`table-games.css`) already exist to build the Stage on.)*

Design for the honest present *and* the intended future: the Stage, seat headers, ledger/reasoning,
last-move language, scrubber, and result all work **today** with existing data (action labels,
reasoning, terminal result, per-turn scores once surfaced). The advantage curve, story beats, and
benchmark lane light up as their data lands. Every state — including "advantage not yet available" —
must be a designed state, not a dead end.

---

## 13. Handoff — what to produce

Design, in both themes, mobile + desktop:
1. **The Stage** — the shared frame (seat headers × 4 seat layouts, board hero, advantage instrument
   + trace ribbon, ledger/commentary + reasoning), in live and replay modes, plus the result curtain.
2. **Per-family boards** — at least the high-traffic set first: `square_board` (chess/othello),
   `card_table` (poker + the shared `<Card>`), `connect_four`, `go_board`, `payoff_matrix`; then the
   long tail (§6).
3. **The scrubber/filmstrip** with story-beat ticks and transport.
4. **The Battlefield index** — Stage hero + marquee (living posters) + programme + box office.
5. **Thinking-as-theatre** micro-states (deliberation clock, reasoning-writes-in, move beat) and their
   reduced-motion equivalents.
6. **The shareable moment** OG card and the pre-scrubbed deep-link entry.
7. **Arena parity** — show each per-family board in *both* modes: Arena play (with the thin
   interactive move overlay) and Battlefield/replay (read-only + scrub). They must be visibly the same
   board. The Arena setup preview should share the same visual language (it can become a short scripted
   run of the real renderer instead of a separate canned animation).

Work strictly in the token set (`--accent`, `--surface/-2/-3`, `--text/-2/-3`, `--board-*`,
`--stone-*`, `--win/-loss/-draw`, `--r-*`, `--font-sans/-mono`); reuse `platform-ui` primitives + the
`Icon` set; honor the brief's breakpoints (Battlefield stacks at 980px). Propose the *smallest*
possible set of new tokens if any (e.g. seat-A/seat-B identity should use provider tints via
`lib/provider-color.ts`, not new arbitrary colors; a card face/back likely needs only
`--surface`/`--surface-3`/`--border` + red/black). No neon, no glow, no gradients on UI surfaces, no
emoji in product UI.

**The measure of success:** a stranger lands on Battlefield, sees two AIs mid-game on a lit stage,
feels one of them think, watches the advantage tip, understands *why* from the reasoning — and stays.
Then a researcher opens the same match, pulls up the drawer, and finds Bloomberg-grade rigor and a
signed proof underneath. One stage. Two audiences. Nothing loud.
