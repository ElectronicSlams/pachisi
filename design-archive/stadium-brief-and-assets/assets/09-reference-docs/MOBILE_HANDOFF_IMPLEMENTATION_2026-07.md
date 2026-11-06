# eSlams — mobile app · implementation spec

**Product:** eSlams — *here, AI plays games.* A mobile app where humans play frontier AI models at
classic games, and watch models play each other.

**Fidelity: high.** Colours, type, spacing, radii, motion timings and copy in this document are
final. Build to them exactly.

---

## 0. How to use this bundle

```
design_handoff_eslams_app/
├─ IMPLEMENTATION.md      ← you are here. Self-sufficient spec. Build from this.
├─ tokens.css             ← drop-in design tokens (6 themes) + keyframes. Use verbatim.
├─ reference/             ← the HTML design prototype. VISUAL REFERENCE ONLY.
└─ assets/                ← brand mark + wordmarks (real files, ship these)
```

**The files in `reference/` are a design reference, not production code.** They are an HTML
prototype built to communicate look, feel and behaviour. Do **not** port that markup or its
JavaScript into the product. Recreate the screens in the target codebase using its own
environment and established patterns — React/React Native, SwiftUI, Compose, Vue, whatever the
app already is. If there is no codebase yet, pick the framework that fits the platform and
implement there.

What *is* meant to be used directly: `tokens.css` (or its equivalent in your styling system) and
everything in `assets/`.

To view the reference, serve the folder and open `reference/eSlams Mobile App v3.dc.html` —
it needs its sibling `.js` files next to it, so open it over HTTP rather than as a `file://` URL.

**Definition of done:** a build is correct when a screenshot of it, set to Classic Dark, is
indistinguishable from the same screen in the reference at 402×874.

---

## 1. What the app is, in one screen-map

Two peer tabs, switched by a floating pill dock. Everything else is a push (right-to-left slide)
or a bottom sheet over them.

```
Splash  (3 beats, ~1.4s, tap to skip)
   │
   ▼
┌─────────────────────────────┬─────────────────────────────┐
│ BATTLEFIELD  ← default tab  │ ARENA                       │
│ models play models; watch   │ you play models             │
│  · live hero match          │  · resume banner (if any)   │
│  · poster feed              │  · rotating hero game       │
│  · benchmark lane (solo)    │  · opponent module          │
│                             │  · 3-col game grid + filter │
└─────────────────────────────┴─────────────────────────────┘
        │                                │
        │  pushes (slide in from right)  │
        ├─ Humans vs Models board (the ladder / leaderboard)
        ├─ Profile ─→ Settings ─→ Your data
        │
        │  bottom sheets
        ├─ Game sheet (pre-match setup)
        ├─ Model roster sheet (full model list; also the seat picker)
        ├─ Auth sheet (6 steps)
        ├─ Request a match
        ├─ Battlefield filters
        ├─ Leave match? · Match overflow · Share card
        │
        │  full-screen stage (z above dock, dock hidden)
        └─ Curtain-riser → Stage:play → Stage:result
                        └→ Stage:watch (replay + reasoning ledger)
```

**Watch-first is a product decision, not an accident.** A cold launch lands on **Battlefield**, not
Arena. Watching requires no account; only playing does. A one-time coach mark points at the Arena
tab and never returns once tapped.

---

## 2. Device frame & global layout

| | |
|---|---|
| Design canvas | **402 × 874** px (iPhone-class logical points) |
| Frame radius | 52px (reference only — real device supplies this) |
| Safe top padding | 64px on scrolling screens (44px status bar + 20px) |
| Screen side padding | **18px** on tab screens, **18–20px** in sheets |
| Bottom padding on tab screens | **170px** (clears the floating dock + now-playing bar) |
| Scroll | vertical per screen; scrollbars hidden |

Everything is a vertical scroll inside a fixed viewport. **Lay out with flex/grid + `gap`** — never
margin-chains or whitespace between inline elements.

### Type scale (px, with weights)

| Role | Size | Weight | Notes |
|---|---|---|---|
| Screen title | 22 | 650 | e.g. "Battlefield", "Arena" |
| Section header | 16–17 | 650 | "All games", "Filters" |
| Result headline | 28–30 | 650 | letter-spacing −.02em |
| Card title | 13.5–15 | 650 | |
| Body | 12.5–13.5 | 400–550 | line-height 1.5–1.6 |
| Tile label | 12 | 600 | line-height 1.2 |
| Small print | 11–11.5 | 400 | `--text-3` |
| **Mono eyebrow** | 9.5–10.5 | 400 | uppercase, letter-spacing .12–.14em, `--text-3` |
| Mono data | 10–12 | 400–600 | ids, counts, clocks, cell refs |

Two families only: `--font-sans` for everything human, `--font-mono` for machine facts (model ids,
turn numbers, board coordinates, counts, clocks, "n / n turns"). This split is the core of the
visual language — respect it everywhere.

### Minimum sizes
Tap targets **never below 44×44**. Body copy never below 11px.

---

## 3. Design tokens

Use `tokens.css` verbatim. Six themes, applied by `data-th` on a wrapper:
`dark` · `light` · `neon` · `club` · `arcade` · `midnight`.

- `dark` + `light` are the **Classic** pair and are the only two that may follow the OS scheme
  (Settings → Appearance has a "Follow system light/dark" toggle, shown **only** while a Classic
  theme is selected).
- The other four are fixed skins.
- `--glow` is `none` except in Neon and Arcade, and only ever lands on accent-carrying elements.
- Win/loss/draw hues re-tune per theme but never re-map.
- The brand mark artwork is never re-tinted.

Semantic groups: surfaces (`--bg`, `--surface`, `--surface-2/3`, `--surface-inset`), borders
(`--border`, `--border-strong`, `--border-faint`), text (`--text`, `--text-2`, `--text-3`,
`--text-on-accent`), accent (`--accent`, `--accent-hover`, `--accent-soft`, `--accent-softer`,
`--accent-line`), outcome (`--win`/`--loss`/`--draw` + `-soft`), board plane (`--board-light`,
`--board-dark`, `--board-line`, `--board-bg`, `--stone-black`, `--stone-white`), elevation
(`--shadow-sm/md/lg`).

**Never introduce a raw hex in a component.** If a value is missing, add a token.

---

## 4. Recurring components

### 4.1 Icon button (44×44)
`width/height 44px · border-radius 14px · border 1px solid var(--border) · background var(--surface)
· colour var(--text-2)`, icon 19px stroke 1.7–1.8. Used for: back, Humans-vs-Models, settings,
profile avatar slot. Always carries an `aria-label`.

### 4.2 Card
`background var(--surface) · border 1px solid var(--border) · border-radius var(--r-lg) (or
--r-xl for hero) · padding 12–16px · box-shadow none by default`. Pressed state on tappable cards:
`border-color: var(--accent); transform: scale(.97)`.

### 4.3 Mono eyebrow
`font-family var(--font-mono) · 9.5–10.5px · uppercase · letter-spacing .12–.14em · colour
var(--text-3)`. Sits above sections and inside cards to label machine facts.

### 4.4 Filter / category chip
`height ~34px (padding 8px 14px) · border-radius 999px · font-size 12.5px weight 550`.
- Idle: `background var(--surface) · border 1px solid var(--border) · colour var(--text-2)`
- Selected: `background var(--accent-soft) · border 1px solid var(--accent-line) · colour var(--accent)`
- Trailing count in mono 10px at 70% opacity.

### 4.5 Primary CTA
`height 50–52px · border-radius var(--r-lg) · background var(--accent) · colour
var(--text-on-accent) · font-size 15px weight 650 · border none`. Disabled:
`background var(--surface-3) · colour var(--text-3) · cursor default` — and the label changes to
say *why* (e.g. "Choose a visibility to continue"), never a greyed "Continue".

### 4.6 Secondary CTA
`border 1px solid var(--border) or var(--accent-line) · background var(--surface-2) or
var(--accent-soft) · colour var(--text) or var(--accent)`.

### 4.7 Bottom sheet
`position absolute; left/right/bottom 0 · background var(--surface) · border-radius 26px 26px 0 0 ·
box-shadow var(--shadow-lg)` + a 38×4px `--border-strong` grab handle centred at top (9px above,
3px below). Enters with `esSheet` 280ms. Behind it: a full-bleed scrim
`rgba(0,0,0,.5)` that dismisses on tap. Heights used: 82% (roster), 86% (request), 88% (game
sheet), auto (small confirms).

### 4.8 Toggle switch
`48×29px · border-radius 999px`; knob `23×23px white, box-shadow 0 1px 3px rgba(0,0,0,.3)`, at
`left: 3px` off / `left: 22px` on. Track: `--surface-3` off, `--accent` on. 200ms.

### 4.9 Model avatar
Rounded square, `border-radius 10–12px`, filled with the provider's tint, containing the
provider's initial in white 13.5px/650. Sizes: 34px (list), 38–40px (seat/roster), 30px (inline).

### 4.10 Dock (floating tab bar)
Pinned bottom-centre, `padding 0 22px 30px`, `pointer-events: none` on the wrapper so the page
scrolls behind it; the pill itself re-enables pointer events.

Pill: `display flex; gap 4px · background color-mix(in srgb, var(--surface) 88%, transparent) ·
border 1px solid var(--border) · border-radius 999px · padding 5px · box-shadow var(--shadow-md) ·
backdrop-filter blur(16px)`.

Each tab: `height 50px · padding 0 22px · border-radius 999px · gap 8px · label 13.5px/650`.
- Selected: `background var(--accent-soft) · colour var(--accent) · box-shadow var(--glow)`
- Idle: `background transparent · colour var(--text-2)`
- Transition `background 250ms cubic-bezier(.3,1.4,.4,1), colour 200ms`

**Order: Battlefield first (left), Arena second (right).** Icons: crossed-swords for Battlefield,
game-controller for Arena.

### 4.11 Now-playing bar
Sits directly above the dock when a match is live and you've navigated away.
`padding 10px 14px · background var(--surface) · border 1px solid var(--border) · border-radius
var(--r-lg)`; 30px accent-soft glyph tile, title `Game · vs Model`, subtitle either "Your move" or
"<Model> is thinking…". Tapping re-enters the stage.

### 4.12 Coach mark (first launch only)
An accent bubble above the dock, right-aligned with a 10px rotated tail:
`background var(--accent) · colour var(--text-on-accent) · 11.5px/600 · border-radius 10px ·
padding 7px 12px`, copy **"Play your first match against a model"**. The Arena tab itself pulses
with `esCoach 2.2s infinite`. Both die permanently the first time Arena is tapped — persist that
flag.

---

## 5. Screens

### 5.1 Splash
Full-bleed `--bg`, centred. Three beats over ~1.4s, tap anywhere to skip:
1. `assets/mark.png` at 96×96, `esPop 600ms cubic-bezier(.2,.8,.3,1.15)`
2. wordmark fades up
3. tagline **"here, AI plays games."** fades up, then auto-advance to Battlefield.

### 5.2 Battlefield (default tab)
Top row: Humans-vs-Models icon button (left) · title **"Battlefield"** · profile/sign-in button
(right). Subtitle under the title: models playing models, live.

**Hero (live match card)** — `--r-xl`, `--surface`: a live dot + "LIVE" mono eyebrow, the two model
avatars and names with the game name between them, the living board (a real position, animating
move by move), and the current turn/clock line. Tapping opens **Stage:watch**.

**Poster feed** — a vertical stack of finished-match cards: board thumbnail, `Model A vs Model B`,
game, outcome chip (`--win`/`--loss`/`--draw` soft background), move count in mono. Tapping opens
the replay.

**Benchmark lane** — horizontal scroll, cards 250px wide, mono eyebrow "Benchmark run", the
animated benchmark visual, then `Name · Model` and `reward NNN`. Header note: **"solo · not
matches"** — these are single-agent control benchmarks (Lunar Lander, CartPole, Taxi, Frozen Lake,
Cliff Walking, Mountain Car, Car Racing, Bipedal Walker, Paddle Ball, Alien Shooter, Boxing-style,
Ice-hockey-style), never presented as matches.

### 5.3 Arena
Top row mirrors Battlefield; title **"Arena"**, subtitle about playing the models yourself.

1. **Resume banner** (only when a match is unfinished) — full-width `--surface` card with the game
   glyph, name, `vs <Model>`, and the live state; taps back into the stage.
2. **Rotating hero game.** One quick-match card, chosen **fresh on every app load** from
   `['tic-tac-toe', 'chess', 'connect-four', 'no-limit-texas-holdem']`. It is **not** a carousel and
   it is **not** always Tic-Tac-Toe. Card contains: the game's living preview board, the game name
   (17px/650), its variant in mono, the opponent line `vs <Model> · <availability>`, and a primary
   "Play" affordance. Tapping plays immediately with the current opponent.
3. **Opponent module** — a card showing the currently selected model (avatar, name, provider,
   "Ready to face") that opens the **Model roster sheet**. This is the single place the Arena-wide
   opponent is chosen.
4. **All games** — header `All games` + mono `38 live`, then:
   - **Filter chips**, horizontally scrollable, one row: `All 38` · `Board 16` · `Card 17` ·
     `Social 5`. Selecting one shows **only** that category; the others disappear. Counts are
     derived, never hard-coded.
   - **A single 3-column grid**, `gap 9px`. No category dividers, no sub-sections. Within `All`,
     order the 13 main-arena marquee games first, then the rest.
   - **Tile:** `padding 12px 11px · --surface · 1px --border · --r-lg`, containing a 34×34
     `--accent-softer` glyph tile with a 1px `--accent-line` border and the game's glyph in
     `--accent` 16px, then the name at 12px/600. If the selected model can't play that game, add a
     mono 8px `swap model` pill in `--draw`/`--draw-soft`.
5. **Humans vs Models teaser** — a `--surface-2` row, "Humanity this week: 38% and climbing", opens
   the ladder.

### 5.4 Humans vs Models (the ladder)
Push screen. Back button + title. A lens switch (**Humans / Models / Everyone**) as a segmented
control, an all-time and this-week headline stat pair, then the gauntlet list: per-model rows with
avatar, name, human win-rate %, games played, and a line like "Undefeated vs humans" or "Beaten
1,166 times". Game chips filter the board. Also hosts **Request a match**.

### 5.5 Profile
Push screen. Header: 56px avatar, username, "member since …", and a **settings icon button (a cog
— not a sun/theme glyph)** top-right.

**Leaderboard standing module** (directly under the header, above the stat grid) — a tappable
`--surface` card with `1px solid var(--accent-line)`:
- left: rank as `#N` at 26px/650 with a mono 8px `RANK` label under it;
- a 1px `--border` divider, 14px padding;
- right: percentile in `--accent` 13px/650, then the metric line
  "<verified wins> this week · tap for the ladder" at 11.5px `--text-2`;
- trailing mono 10px `ladder →` in `--accent`.
Tapping opens the Humans-vs-Models board.

Then: a 4-up stat grid (played / won / lost / drawn), match history rows (each opens your own
replay, each with a public/private control), and the sign-out affordance.

### 5.6 Settings
Push screen. Sections, each preceded by a mono eyebrow:
- **Appearance** — a 2-column grid of six theme tiles. Each tile renders a *live mini Connect Four
  board in that theme* inside a `data-th`-scoped wrapper, with the theme name beneath; the selected
  tile has a 2px `--accent` border. Below the grid, **only when a Classic theme is selected**, the
  "Follow system light/dark" toggle row.
- **App icon** — alternate icon choices.
- **Sound**, **Haptics**, **Notifications** — toggle rows.
- **Account** — email row, phone row with a mono `verified` pill in `--win`.
- **Your data** → push. **Sign out**.

### 5.7 Game sheet (pre-match)
Bottom sheet, 88%. Grab handle, then:
1. Game header: glyph tile, name, variant, player/seat line.
2. The **living preview board** in a `--surface-inset` well (min-height 150px).
3. **How to play** — exactly three lines: goal, how to move, how it ends.
4. **Opponent selection**, one of three shapes depending on the game:
   - *Duel games* — "Pick your victim": 6 model cards + an "All N models" link to the roster sheet.
   - *Blackjack* — a fixed **THE DEALER** card: "The house is the engine — no model in this seat.
     Stands on all 17s." No model picker.
   - *Table games* (Leduc/Limit/No-Limit Hold'em, Mahjong, Dou Dizhu, Bridge) — a **seat ring**:
     an oval `--surface-2` table (150×94, radius 60px) with the scoring unit in its centre, and
     seats positioned around it. Seat 1 is always **you** (accent avatar, "your seat"); the other
     seats are models. **Tapping any model seat opens the full Model roster sheet** titled
     "Seat N · pick a model"; choosing returns to this sheet with that seat updated. Bridge uses a
     compass layout (S/W/N/E labels); the others a ring. Caption: "Every match seats one human —
     you. The other N seats are models; tap one to swap it. The result card speaks <chips|points|
     placement>."
5. **Side picker** where the game has sides (e.g. Black moves first / White — the model opens).
6. Primary CTA: **"Start game"**, or **"Start game · sign in"** when signed out.

### 5.8 Model roster sheet
Bottom sheet, 82%. Back chevron + a contextual title:
- "Choose your opponent" (Arena-wide pick),
- "All models · <Game>" (from a game sheet),
- "Seat N · pick a model" (from a seat ring).
A search field, then rows: avatar, model name, provider + mono id, and an availability line. The
selected row sits on `--accent-softer`. Selecting commits and closes back to wherever it came from.

### 5.9 Auth sheet — 6 steps
Only ever triggered by an attempt to **play**. Copy is final.

0. **"The model is waiting."** / "One account, one username, one human. You'll be mid-match in a
   minute." → Continue with **Apple** · **Google** · **GitHub**, then an email field + `→` button.
   Footer: "No signup needed to watch — only to play."
1. **"Claim your username."** / "It goes on every replay you make public." Input is forced to
   `[a-z0-9_]`; live preview `eslams.com/<name>` in mono `--accent`.
2. **"Pick your theme."** / "Six skins, one honest system. Change it any time." The same six-tile
   theme grid as Settings.
3. **"Your games make AI better."** The data pact: an explanatory paragraph, then **an active
   choice** — Public / Private, *neither preselected*. The CTA stays disabled and reads
   **"Choose a visibility to continue"** until one is picked, then becomes "Continue". Small print:
   "Your number is used only to verify you're one human — never shown, never shared."
4. **"One phone per player."** / "It keeps the leaderboard human. That's the only reason we ask."
   `+44` prefix block + number field; CTA "Text me the code" enables at ≥9 digits.
5. **"Enter the code."** Six 46×56px boxes (`--surface-inset`, 1.5px border; the next empty box is
   `--accent`-bordered, all turn `--loss` on error) with a transparent `inputMode="numeric"`
   `autoComplete="one-time-code"` field over them. A **simulated SMS banner** drops in from the top
   after ~1.4s (`esBanner`) reading "Messages · eSlams — Your eSlams code is NNN NNN" with a mono
   "tap to autofill" affordance. Resend is rate-limited: label counts down "Resend in 0:NN" for 24s
   and is `--text-3`/not-clickable while cooling. Wrong code clears the field and shows
   "That code didn't match. Codes expire after 10 minutes — resend if it's been a while." After
   **3 resends** the whole step is replaced by the **rate-limit state**: a 52px `--draw-soft` clock
   tile, "Too many codes requested.", "Try again in an hour. Your account is saved — watching is
   open in the meantime.", and a single "Back to the Battlefield" button.

On success: sign in, then automatically launch the match that triggered auth.

### 5.10 Curtain-riser (match load)
Full-screen `--bg`, centred: the game's preview board, then the two competitors, then a status line
that advances honestly — "Setting the table…" → "Waking the engine…" → "<Model> has taken its
seat." (Blackjack: "THE DEALER has the shoe."). ~2.75s total, then the stage.

### 5.11 Stage — play
Full-screen, `z` above the dock; dock hidden.

- **Top bar:** exit icon button · game name (+ a mono `demo` pill for non-wired games) · move
  counter `move N` in mono, right-aligned.
- **Competitor strip:** you (left) and the model (right); the active side gets an accent underline.
  While the model thinks: "thinking 0:04 · usually ~6s".
- **Advantage bar:** a 120px hairline with a centre pip. It shows **nothing** mid-game — this is
  deliberate; a fake evaluation bar would be a lie. Only on a decided result does a `--win`/`--loss`
  fill run from the centre to one side.
- **Board:** centred, the game's real board (see §6).
- **Reasoning line:** the model's latest reasoning, streamed character by character with a blinking
  caret (`esCaret`).
- **Action row (game-specific):** RPS/PD choice chips · Blackjack **Hit** / **Stand** ·
  Auction bid slider + "Seal the bid" · Gomoku "Place stone" confirm.
- **Hint line** + overflow (`⋯`) button opening How-to-play.
- **"Claim the win"**: if the model has been thinking >9s, an accent-soft button appears —
  "Claim the win — the model never showed". Claiming ends the match with an honest footnote that it
  doesn't count toward standings. (The model genuinely stalls ~10% of turns; this path is real.)
- Exiting mid-match raises the **"Leave match?"** sheet.

### 5.12 Stage — result
Board pushes in (`esPushIn`, 1.1s) at 1.16×, confetti only on a win. Headline + subline speak the
game's own currency:

| Game type | Headline | Chip |
|---|---|---|
| Board/duel | "You won." / "<Model> wins." / "A draw." | `N moves` |
| Blackjack | "+60 chips." / "−40 chips." / "Push." | `+60 chips` |
| Auction | "Profit +14." / "<Model> takes the lot." | `profit +14` |
| Prisoner's Dilemma | "You out-played the matrix." / "<Model> defected." / "Equilibrium." | `3–3 points` |

Then a verdict line ("Decided on move 24.", "Settled in 6 actions · S17."), the
match-detail row, actions **Play again · New opponent · Watch replay · Share**, and an inline
**Public / Private** segmented control (not a mono text toggle). Resigning and timeout-claims get
their own honest sublines.

### 5.13 Stage — watch / replay
Grab handle, back, title, live badge when live. The board, a scrubber
(`aria-label="Replay scrubber — move N of M"`) with play/pause and step controls, then the
**reasoning ledger**.

**Reasoning ledger** (this is a signature surface — match it exactly):
- Sticky header on `--bg`: mono eyebrow **"Reasoning ledger"** left, mono `N / M turns` right,
  1px `--border-faint` bottom rule.
- Rows are buttons (tap to jump to that turn), `padding 13px 12px · border-radius --r-lg ·
  margin-bottom 4px · border 1px solid --border-faint · background --surface`. The row at the
  current scrub position: `background --accent-soft · border-color --accent-line`.
- Row layout, left to right: mono turn number (16px column, `--text-3`) · a 9px seat dot in that
  seat's colour · then a stacked block:
  1. **action** — 13.5px/650 `--text`, in player language ("Takes the center", "Drops column d",
     "Dealer draws — 19"), never internal jargon;
  2. **meta** — mono 10px `--text-3`: the model's name (plus a coordinate when it adds meaning);
  3. **reasoning** — 12.5px `--text-2`, line-height 1.55, 7px above.
- Never print "Seat A reasoning" or a raw "cell 5". If a match has no published reasoning, show one
  line: "No public reasoning attached to this match."
- At the end of a *watched* (model-vs-model) replay, a recruit CTA appears: "Think you'd do better?"
  + an accent button **"Play <Game> →"** that opens that game's sheet pre-set to the winning model.

### 5.14 Small sheets
- **Leave match?** — "Leave match?" + honest subline, `Resign` (loss on your record) vs `Keep
  playing`.
- **Match overflow** — How-to-play (the same three lines), resign, share.
- **Share card** — a rendered card on `--bg` inside the sheet, in the player's current theme:
  outcome, game, both competitors, final board, and the eSlams mark. `--share-safe: 20px` padding.
- **Battlefield filters** — game and model filters for the feed.

---

## 6. Boards — the visual system

Boards are the product. Each one is drawn from **real game state**, never a decorative picture.

| Family | Games | Rendering |
|---|---|---|
| 3×3 grid | Tic-Tac-Toe | 3×3 cells, `--board-bg`, 1px `--board-line` inner rules; `✕` / `○` glyphs in `--text`; last move outlined `--accent`; win line highlighted |
| Connect Four | Connect Four | 6×7 board in `--board-dark` with circular `--surface-2` wells; discs fall with `esC4Drop` (320ms) |
| Checkered 8×8 | Chess, Checkers, Othello, Shogi, Xiangqi… | `--board-light`/`--board-dark` squares; pieces as unicode glyphs (chess) or discs/stones; Othello flips animate |
| Go / Gomoku | Go, Gomoku | line grid drawn with two repeating linear-gradients at `cell` pitch, stones `--stone-black`/`--stone-white` with `esStoneLand` |
| Hex | Hex | hex cells via `clip-path: polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)`, own-edge cells tinted `--accent-softer` |
| Cards | 17 card games | flat card primitive: `width w, height 1.42w, radius .14w`, `--surface` face / `--surface-3` back with an inset rounded rect; red suits in `--loss`; deal + reveal via `esFlipIn` |
| Dice | Liar's Dice | unicode die faces; cups shake, then reveal |
| Payoff matrix | RPS, Prisoner's Dilemma | a 2×2 matrix of payoff cells (the chosen cell outlined `--accent`) + two commit chips that read `?` until simultaneous reveal |
| Auction | First-price sealed-bid | the lot card (its private value to you), two sealed bid chips, and a 0–100 bid-spread axis after reveal |
| Economic | Negotiation, Bargaining | offer/counter cards + a round-progress row |
| Control benchmark | the 12 RL tasks | small purpose-built schematics (lander, cart-pole, grid worlds, track, walker…) |

**Every scripted/preview sequence must be a legal game.** In the reference, previews are generated
by the real engines and a start-up audit asserts each one passes its own win-check; authored scenes
(checkers, shogi, xiangqi, battleship, mancala, morris, pentago, backgammon, Hex, Liar's Dice) are
legal by construction and asserted too. **Keep this discipline in production**: if a marketing
preview shows an impossible position, players who know the game will notice.

Fog-of-war is honest: Battleship hits/misses derive from the actual hidden fleet; Hanabi renders
*your* hand face-down and everyone else's face-up.

---

## 7. Catalog & data model

38 Arena games (the RL benchmarks are Battlefield-only, bringing the full catalog to 50). **Nothing
is marked "Coming soon"** — every Arena game opens a real sheet and resolves to a real stage.

```
Game {
  slug, name, category: 'Board'|'Card'|'Strategy'|'RL',
  variant,            // engine/ruleset label, shown in mono
  players,
  family,             // drives the board renderer, see §6
  glyph,              // single display char; every slug must have one
}
Model {
  id: 'provider/model-name',
  name,               // display-formatted: 'GPT-5.2', 'Claude 4.5 Sonnet'
  provider, initial, tint,
  status, medianTurnSeconds, rank,
}
Session {
  slug, family, mode, opponent, side,
  board | hand/dealer | rounds | auc,   // per family
  turn: 'you'|'model', moveNo, thinking,
  ledger: [{ actor, action, meta, reasoning }],
  frames: [...],      // one snapshot per turn — replay is just frame playback
  winner: 'you'|'model'|'draw'|null, winLine,
}
```

- **Availability is real.** A model may not support a given game; the roster shows an availability
  line and Arena tiles show a `swap model` pill rather than failing at launch.
- **Provider mixing.** The opponent wheel interleaves providers so you never see a wall of one
  provider's dots.
- Model ids display formatted (`openai/gpt-5-2` → `GPT-5.2`) but keep the raw id visible in mono
  where it matters.
- **Eight games are wired end-to-end** in the reference (Tic-Tac-Toe, Connect Four, Othello,
  Gomoku, RPS, Prisoner's Dilemma, Blackjack, First-price sealed-bid auction) with real AI
  opponents; the rest resolve to an honest engine-recorded demo stage. In production all 38 run on
  the platform engine — but keep the demo-stage pattern as the graceful path for an engine that is
  slow or unavailable, and label it plainly (`demo` pill + "Live in production." card).

---

## 8. Interaction & motion rules

- **Timings** (also in `tokens.css`): move 220ms · Connect Four gravity 320ms · hidden-info reveal
  300ms · result curtain 520ms · screen push 200ms · sheet 280ms · dock pill 250ms.
- **Premove**: on turn-based grid games, tapping while the model thinks queues a ghost move; the
  hint line says "tap now to queue a premove".
- **Gomoku confirms**: tap places a dashed ghost stone; tapping it again or pressing "Place stone"
  commits. This is the fat-finger answer on a 15×15 board.
- **Simultaneous games** (RPS, PD, auction) hide both choices until both are committed — never
  reveal the model's pick early.
- **Streaming reasoning** types in with a caret; it must never block input.
- **Haptics**: light tick on your move, double-tap on turn change, success pattern on result.
- **Reduced motion**: every beat maps to its final state instantly (the media query in
  `tokens.css` is a floor, not the whole answer — don't rely on animation callbacks for state).
- **Accessibility**: `aria-label` on every icon button, seat, board cell group, scrubber and
  filter chip; the six-digit OTP uses one labelled input with `autoComplete="one-time-code"`;
  outcome is never colour-only (always a word too); AA contrast holds in all six themes.

---

## 9. State to model

| State | Notes |
|---|---|
| `theme` | one of six; persisted |
| `followSystem` | only meaningful for the Classic pair; persisted |
| `altIcon` | selected app icon |
| `tab` | `battlefield` (default) \| `arena` |
| `coachSeen` | persisted; kills the coach mark forever |
| `heroSlug` | re-rolled **once per app load** from the 4-game pool |
| `arenaFilter` | `all` \| `Board` \| `Card` \| `Strategy` |
| `opponentId` | Arena-wide selected model |
| `session` | the live match (see §7); survives tab changes → drives the now-playing bar |
| `replay` | `{ frames, index, playing, speed }` |
| `push` | `null` \| `hvm` \| `profile` \| `settings` \| `yourdata` |
| `sheet` | `null` \| game \| roster(+`seatPick`) \| auth \| request \| filters \| exit \| overflow \| share |
| `auth` | `{ step 0-5, email, username, visibility: null\|public\|private, phone, otp, sentCode, resends, cooldownUntil, rateLimited }` |
| `profile` | `{ played, won, lost, drawn, rank, percentile, history[] }` |
| `sound`, `haptics`, `notifications` | persisted toggles |

`visibility` starting at **`null`** is load-bearing — it's what makes the data pact an active
choice rather than a pre-ticked consent.

---

## 10. Voice & copy rules

The product has a voice. Keep it.

- Short, dry, a little cocky on the player's behalf. "Somewhere, a datacenter is embarrassed."
- Honest about machines: "The house is the engine — no model in this seat." · "Doesn't count toward
  standings — the model never took its turn." · "No public reasoning attached to this match."
- Machine facts in mono; human sentences in sans.
- Never invent a metric to fill a space. The advantage bar staying empty mid-game is the house
  style: **no fake precision**.
- Disabled buttons explain themselves.
- Player language in the ledger, engine language never.

---

## 11. Assets

| File | Use |
|---|---|
| `assets/mark.png` | the mark alone — app icon, splash, share cards |
| `assets/logo-dark.png` | wordmark for dark themes |
| `assets/logo-light.png` | wordmark for light themes (Classic Light, Club) |

Ship these as-is. Export the app icon from the mark with no text. The mark is never re-tinted by
theme; pick the wordmark that matches the theme's polarity.

---

## 12. Acceptance checklist

- [ ] Cold launch lands on **Battlefield**; coach mark shows once and never again.
- [ ] Arena hero game differs across reloads and is one of TTT / Chess / Connect Four / Texas
      Hold'em.
- [ ] Arena is **one 3-column grid**; filter chips show `All 38 / Board 16 / Card 17 / Social 5`
      and selecting one hides all other categories.
- [ ] No "Coming soon" anywhere; all 38 Arena games open a sheet and reach a stage.
- [ ] Tapping a table seat opens the **full roster** ("Seat N · pick a model") and returns with the
      seat changed.
- [ ] Blackjack shows **THE DEALER**, no model picker, and settles in chips (blackjack pays 3:2,
      dealer stands on all 17s).
- [ ] Profile shows the leaderboard-standing module above the stat grid; it opens the ladder.
- [ ] The Settings entry point is a **cog**.
- [ ] Ledger matches §5.13 — sticky "Reasoning ledger · N / M turns" header, turn number + seat dot
      + player-language action + mono model line + reasoning body; current row accent-outlined.
- [ ] Data pact starts with **nothing selected** and the CTA explains itself.
- [ ] OTP: autofill banner, 24s resend cooldown, wrong-code state, rate-limit terminal state.
- [ ] All six themes pass AA; `--glow` appears only in Neon/Arcade on accent elements.
- [ ] Advantage bar renders empty until a result exists.
- [ ] Every tap target ≥44×44; reduced-motion collapses all animation.
- [ ] Every preview/scripted position is a legal game state.

---

## 13. Files in `reference/`

| File | What it is |
|---|---|
| `eSlams Mobile App v3.dc.html` | The full design prototype — every screen, all six themes, eight playable games. **Visual reference only.** |
| `app-data-v3.js` | Prototype data + game engines + reasoning voices. Useful to read for rules/copy, not to ship. |
| `es-data-v2.js` | The 50-game catalog and model roster the design was built against. |
| `support.js` | Prototype runtime. Irrelevant to production. |

Read the prototype's markup to resolve any measurement this document leaves ambiguous — it is the
source of truth for pixels. This document is the source of truth for intent.
