# Design Note — Home, redesigned below the fold

**For:** the design agent (Claude design). **Status:** design intent, ready to design against.
**Reads with:** `DESIGN_BRIEF.md` (the house language — obey it; this note *revises* its §7 "Home"
anatomy, see the governance note at the end), `COMPONENT_REFERENCE.md` (exact recipes),
`DESIGN_NOTE_battlefield.md` (the matches band on Home is a peek at that stage — same language).
**Date:** 2026-07-07. **Scope:** everything **below** the hero. The first fold is **locked**.

The Home page is the front door to a trust system that happens to contain live games. It has three
guests at once — the curious public ("can I beat GPT-5?"), the researcher who must *believe the
numbers*, and the builder who will `pip install eslams`. The current page greets all three with the
same gesture: nine stacked bands, five of which are "here is more data." This note keeps the one part
that already works — the hero — and rebuilds the rest into a single calm descent where the game the
hero started **never stops playing**, the scoreboard **proves itself as you read it**, and every guest
finds their door without three buttons shouting at once.

Home has *less* design latitude than Battlefield. It is the most-linked, most-cached, most-scrutinised
surface in the product, and it is bound hardest by the brief's honesty and performance law. Nothing
here suspends **clean/never-cyberpunk, one accent, show-don't-tell, honest surfaces, latency is
personality, performance is design.** It points them down the page.

---

## 1. The essence

> **You arrive on a line — "Here, AI plays games." — with a board already moving beside it. You scroll,
> and the game doesn't stop: real matches are playing, and right below them the scoreboard settles into
> place — every score wearing its uncertainty and linking to the signed proof behind it. You've watched
> two games and checked the math before anyone asked you to sign up. Then, and only then, the page turns
> to you: "Think you can beat a frontier model?"**

That is the whole page. The hero shows *a* game; everything below shows *the field* still playing and
*the instrument* keeping honest score. Design it as **one continuous living instrument seen through a
few lenses**, not a pile of sections. The board is the recurring object; the credible interval is the
recurring proof; the accent is the only color that isn't information.

**The one cut that defines this redesign:** the current Home asks "who's winning?" three times in a
row — Reigning champions, then the Overall top-10, then Top-models-by-category — three near-identical
ranked tables plus a champions strip. We answer it **once**, in one instrument with a lens toggle, and
we spend the reclaimed space on motion (real matches) and honesty (intervals + proof), not repetition.

---

## 2. What's there today (and why it needs the overhaul)

The live Home (July 2026) is structurally complete and, below the hero, quietly broken in ways that
undercut the exact trust the product sells. Nine bands, top to bottom:

1. **Reigning champions** — 4-up cards. Renders `champion.displayScore` *verbatim from the DB
   breakdown*, un-clamped: **Chess "17", Go "100", Connect Four "1001" (over the 0–1000 cap), Hex
   "0 / N/A"**, flat "100.0%" win rates, uniform "180 games". These are not credible numbers, and the
   champion is computed from a *different* field than the overall #1 — so the page contradicts itself
   (brief §8.9). Eyebrow "Who's winning right now" over data with no freshness stamp.
2. **Play band** — "Think you can beat a frontier model?" + a 2×2 game picker. Good copy, good intent.
3. **Overall leaderboard (top-10)** — **rank 1 = o3 (221 pts) sits *above* rank 2 (254 pts)**, no metric
   label, no interval — the brief's headline P0 credibility bug (§8.1–8.3, §13). Uniform "9,000 games".
   All ten rows are OpenAI, which reads *broken or unfair* beside "70 providers".
4. **Latest matches** — titled **"Latest battles"** (a retired word) with a **"Watch live"** CTA over
   matches that are all `completed` and 11–12 days old. The data is honest; the chrome lies about it.
5. **Top models, by arena type** — category tabs. This is a **client-side re-aggregation** labelled
   "Ranked from published official … results" — it over-claims provenance, and it's the *third* time
   the page ranks models. Title leaks "arena type".
6. **Stats band** — 4 stats; "Official games — Pending".
7. **Every game** — 50-tile `.gtile` grid. Eyebrow leaks "**50 arenas**". This band is genuinely good
   (visual, on-brand) and stays.
8. **Every provider** — a 70-chip tiered wall. The weakest band: a wall of chips is a directory dump.
9. **Open-source band** — `pip install eslams` terminal. Good, stays.

The failures cluster into three: **repetition** (bands 1/3/5), **dishonesty in the chrome** (band 4's
"battles / Watch live"; band 1's un-clamped scores; band 3's unlabeled contradicting rank), and
**vocabulary drift** ("arenas", "battles", "arena type"). The redesign fixes all three without inventing
data it doesn't have — see §12, the data-contract prerequisites.

**Locked, do not touch — the first fold.** The hero (`section.lp-hero`) stays exactly as built and the
user loves it: left column (pill badge, H1 "Here, AI plays games." at `clamp(42–66px)`, the sub, the two
CTAs, the "No signup to watch · Turn-by-turn replays · Shareable replay pages" trust line) and the right
column `HomeHeroViewer` (the auto-rotating Chess / Connect Four / Othello / Tic-Tac-Toe board preview
with play-pause, frame counter, scrubber, dot selector) and its calm radial-accent wash. Layout, motion,
and animation are **untouched**. The redesign is everything below, and it is built to flow *down* from
this fold — the hero's living board is the first note of a song the whole page keeps singing.

*Two copy-only micro-fixes are recommended inside the fold (no layout/animation change), because they
are brief-mandated honesty/vocabulary bugs, not redesign: (a) the hero sub's "Pick an **arena**" →
"Pick a **game**"; (b) the badge "Live Battlefield replays" (with a standing `livedot`) is
self-contradictory — either drop the standing dot or reword to "**Watch on Battlefield**". Present both
as flagged copy edits; if the user wants the fold 100% frozen, ship the page around them.*

---

## 3. Home's own principles (extending the brief)

1. **The game never stops.** The hero's living board sets a promise: this is a place where games are
   being played. The page keeps that promise all the way down — a real match is in motion below the
   fold, real boards glyph the scoreboard, a match runs in the terminal. The page must never collapse
   into static tables after the fold; that collapse is the current build's core failure.
2. **Prove, then explain, then invite.** Order is an argument. Show real matches → show the honest
   scoreboard → *then* invite the visitor to play. A cold "beat a frontier model" converts worse than
   one that follows fifteen seconds of watching AI actually play (and audit).
3. **Every number arrives dressed.** No naked score. On Home, a score is always accompanied by its
   metric label, its uncertainty (a credible-interval band), and a path to proof. The honesty *is* the
   credibility — a wide interval reads as rigor, a "verified entry pending" reads as integrity.
4. **One loud door, quiet on-ramps.** One dominant primary CTA — **Play Against AI**. The researcher
   self-selects via "View methodology / full leaderboard"; the builder self-selects via a real
   `pip install eslams` block. Never three co-equal hero buttons (Clerk / Resend / Stripe all keep one).
5. **Ask "who's winning?" once.** Merge the three ranked bands into one instrument with a lens toggle.
   Repetition is not thoroughness; it's the absence of an idea.
6. **Directory work belongs to directory pages.** Home teaches *structure* (the 50-game shape, the
   provider tiers) and proves *scale*; it does not need to enumerate all 120 tiles. `/games` and
   `/models` are the exhaustive indices. Keep the delightful 50-game grid (it's visual, not tabular);
   demote the 70-chip provider wall to a compact tiered summary + link-out.

---

## 4. Page architecture — the descent

A single vertical spine below the locked hero. Importance and motion descend together. **Nine bands
become five movements** (plus the hero and the shared footer):

| # | Movement | Was (current bands) | The move |
|---|---|---|---|
| **0** | **Hero** | 1 | **Locked.** Untouched. |
| **M1** | **The stage is still playing** — living matches | 4 (Latest matches) | **Keep + transform** into living posters; carries hero motion down; fixes "battles/Watch live". |
| **M2** | **Who's actually winning** — the instrument | 1 + 3 + 5 + ½ of 6 | **Merge four into one.** Champions edge + interval-first overall preview + category lens + proof chain. The trust heart. |
| **M3** | **Now you try** — the play on-ramp | 2 (Play band) | **Keep, tighten.** One loud CTA; honest Arena sub-copy; positioned *after* the demonstration. |
| **M4** | **Every game we play** — the 50-game grid (+ providers strip) | 7 + 8 | **Keep the games grid** (redesigned); **demote** the 70-chip wall to a compact provider strip + link-out. |
| **M5** | **Run the engine** + Grand Slams teaser + close | 9 + ½ of 6 | **Keep the terminal;** add a quiet, honest Grand Slams teaser; scale counts as a caption. |

Everything below is specified per movement: **purpose · layout · light+dark · motion · copy ·
data-honesty · components/tokens · mobile.** The interval-first *grammar* used across M1/M2 is specified
once in §5.6 so it reads identically everywhere.

---

## 5. The movements

### 5.1 · M1 — "The stage is still playing" (living matches)

**Purpose.** Be the truest continuation of the hero: the moment after the visitor's eye leaves the hero
board, another real board is already in motion. Convert curiosity into a click that *changes the channel*
into Battlefield. This is show-don't-tell, continued.

**Layout.** A `SectionHead` (eyebrow **`Battlefield`**, title **`Latest matches`**, action
**`See all matches →`** to `/battlefield`) over a compact grid of **3–4 living posters** (chess.com's
multi-board broadcast pattern). Each poster is a `.card` (radius `--r-lg`, hairline `--border`) containing:

- top row — `GameGlyph` + game name, and a **status chip**: a red `.livedot` + "Live" **only** when
  `status === "live"`; otherwise honest freshness ("11d ago") in `--text-3` mono, no dot;
- the **board hero** — a real, *static* end-state (or last-move) render of that match's board, using the
  small poster size of the shared renderer (§13 perf: server-rendered end-state, not the animated replay
  player);
- two `ModelBadge`s with a mono "vs", the winner's name at weight 600 and the loser's at `opacity .55`
  when the match is `completed` (reuse `.mc-won` / `.mc-lost`);
- an **advantage read** — a thin `.wldbar`-style bar or a one-glyph "who's ahead" tick;
- **one line of stakes** in `--text-2`: "#1 meets #2", "the lead changed four times", "first meeting",
  "match point". Sell the *stakes*, not the timestamp.

**Light + dark.** Pure token work — `.card` on `--surface`, board via `--board-*` / `--stone-*` (both
themes defined), status colors from `--win/--loss/--draw`, provider tints via `provColor()` +
`color-mix(in oklch, …)`. In dark, the board's three near-black planes must stay distinguishable (Raycast
lesson) — use `--board-bg #1c1c21` behind cells `--board-light #2b2b33`, hairline `--board-line`.

**Motion.** The poster board is **static by default** (honest — a static board never fakes "live", and it
keeps Home off the animated replay code path). Optional nicety: a single, tiny, lazy reduced-renderer
island may gently step the *live* poster's last move; reduced-motion → end-state, always. Hover: the
standard `translateY(-1px)` card lift + border/shadow shift. No autoplaying grid of animations — the
drama is real state + stakes, not decoration.

**Copy.** Eyebrow `Battlefield` · title `Latest matches` · action `See all matches` · per-poster stakes
line. **Never** "Latest battles", "Watch live" over non-live rows, or "battle". If zero matches are live,
the band shows the most *dramatic recent replay* with honest freshness — never a live dot, never a
spinner.

**Data-honesty.** `status` and `started` are already honest in the contract; the fix is chrome, not data.
The live dot is gated on `status === "live"`. Fallback (`source === "battlefield-smoke"`) posters link to
`/battlefield` and are labelled "featured replay" / "verified replay" as the contract's `evidenceSource`
allows — never a fake live tag.

**Components/tokens.** `SectionHead`, `MatchCard` (upgraded to a poster — add the board hero + stakes
line; keep `.mc-won/.mc-lost/.mc-vstag`), `GameGlyph`, `ModelBadge`, `StatusBadge`, `.livedot`,
`.wldbar`. New CSS in `landing.css` under `.lp-poster*`. **No** import of the Arena/replay player.

**Mobile.** 4→2→1 across 980/620/480px (reuse the `.battle-grid` cascade). Board hero scales with the
card; stakes line clamps to one line.

---

### 5.2 · M2 — "Who's actually winning" (the instrument)

The Bloomberg-terminal heart of the page, and the movement that earns the whole trust thesis. It **merges
the current champions band, overall top-10, and category leaders into one object** with a lens toggle, and
it renders the honesty the live site currently violates.

**Purpose.** Answer "who's winning?" once, honestly, and make the *method* visible as design (Epoch /
Artificial Analysis: rigor distributed into the data, never a manifesto wall).

**Layout.** A `SectionHead` (eyebrow **`Official results`**, title **`The leaderboard, honestly`** or
**`Who's winning`**, sub the brief's verbatim methodology line — see §14, action **`View full →`** to
`/leaderboard`), a **snapshot freshness stamp** ("Official results · updated 14m ago" in mono `--text-3`),
then one `.card` instrument with three progressively-disclosed layers:

1. **Champions edge (top).** A slim rail of the marquee per-game champions — each a compact cell with
   `GameGlyph` + game name, the **game-page canonical #1** `ModelBadge`, the **Official Score** headline,
   and a **mini interval band** (§5.6). This replaces the 4-up `.champ` grid: *one verified reading per
   game*, provably equal to the game page's #1. A game with no valid published #1 shows
   **"verified entry pending"**, never "0 / N/A".
2. **Overall preview (middle).** The top ~6–8 models as `LeaderRowMini` rows, **upgraded** to the
   interval grammar: Rank (medal for 1–3) · `ModelBadge` · **Official Score** (mean, headline) ·
   **credible-interval band** (§5.6) · Provider · **proof link** (a small `Icon name="check"`/shield that
   links score → artifact → replay). Ranked by the **conservative posterior lower bound**; where two rows
   overlap, a hairline **"statistically tied"** bracket makes rank-2-scores-higher read as *rigor, not a
   bug* (LMArena's grammar).
3. **Category lens (control).** A `.seg` segmented toggle — **Overall · Board & Strategy · Card &
   Hidden-Info · Social & Economic · Control & Arcade** — re-scopes layers 1–2. This is the only place the
   50-game taxonomy is *taught* on Home (Vals' lens-tabs), and it retires the redundant third table. Each
   category shows its verified count honestly ("12 of 16 games verified").

**Proof chain (the "how a number is made" beat).** Fold Artificial-Analysis-style methodology *into* the
instrument rather than a separate band: clicking any Official Score expands a one-line proof chain —
**signed `.eslams` artifact → verified → replay** — with the mono artifact hash and a "View replay" link.
Reduced-motion shows the resolved end-state. This is the emotional center ("you just checked the math"),
and it's cheap: it's a disclosure, not a new page.

**Light + dark.** `.card` + `.seg` are token-driven. The interval band (§5.6) uses `--surface-3` track,
`--accent` mean tick, `--accent-line` span fill; medals via `--gold/--silver/--bronze` (both themes).
Verify `--text-3` contrast on the freshness stamp and the "tied" bracket in *both* themes (known-thin area
per the skill checklist).

**Motion.** None required — this is an instrument, it renders instantly (SSR). The proof-chain disclosure
may fade/expand (0.2s, reduced-motion → instant). A score's interval band may animate its span-width in on
first paint *after* the number is already legible (motion never gates data, brief §4.6).

**Copy.** Eyebrow `Official results`; methodology sub verbatim: *"Ranked by conservative Bayesian skill,
backed by signed official artifacts."*; column header **`Official Score`** (align with `/leaderboard`,
never "Score"/"Elo"/"rating"); the tie affordance reads "statistically tied"; empty → "verified entry
pending". Frame an all-one-provider field as **"Verified official results so far — N models across M
providers"**, never as "the field".

**Data-honesty (this movement is where the live P0s die).**
- Champion scores render from the **clamped 0–1000 `score`** joined to the **game-page #1** — never the
  raw `displayScore` string (the "17 / 100 / 1001" bug). No valid score → "verified entry pending".
- Rank uses the **conservative posterior lower bound**; the headline is the **mean** with a **labeled**
  interval — an unlabeled contradicting order is forbidden (§8.1–8.3). *This movement cannot ship its live
  render until the contract forwards the interval + rank metric* (§12) — until then it renders honest
  "verified entry pending" states, never the current contradiction.
- **No vanity 100%s / uniform counts.** Win rate is a *secondary* metric, suppressed or de-emphasised
  below a minimum effective sample size, and never the headline.
- Every official number **links to proof** (§8.8). Official and human-Arena results are never blended
  here — this instrument is Official only (the human board lives on `/leaderboard`'s "Human vs model" tab).

**Components/tokens.** `SectionHead`, `.seg`, `LeaderRowMini` (extended), `ModelBadge`, `Medal`,
`GameGlyph`, `Icon`, plus a **new interval-band primitive** (§5.6) in `components.css` (cross-page) or
`pages.css` (home/leaderboard widgets). No new leaderboard columns beyond §8's sanctioned set.

**Mobile.** The instrument keeps the interval band (it's the point); at ≤760px the Provider column drops
and the proof link becomes the row's tap target; the `.seg` becomes a horizontally-scrollable `.chiprow`
of category chips at ≤520px.

---

### 5.3 · M3 — "Now you try" (the play on-ramp)

**Purpose.** The primary conversion, placed *after* the visitor has watched games play (M1) and seen the
scoreboard is honest (M2). Show, then invite.

**Layout.** Keep the current `.playband` structure (it works): left — eyebrow `Arena`, the verbatim H2
**"Think you can beat a frontier model?"**, an honest sub matching Arena's real first screen, one loud
primary **`Play Against AI`** (`.btn-primary .btn-lg`) → `/arena`; right — a `.pb-pickgrid` of 4 game
picks (Connect Four / Chess / Tic-Tac-Toe / No-Limit Hold'em), each linking `/arena?game=<slug>`, with
locked pairs showing **"Coming soon"** (not "Locked" jargon). Keep the band's single sanctioned
`--accent-soft` diagonal wash (`.playband` background) — it's one of only two permitted gradients.

**Light + dark.** `.playband` + `.pb-pick` are token-driven; the accent wash uses `--accent-soft` (both
themes). Selected/ready picks use `--accent-line` ring; "Coming soon" picks use `--surface-2` + `--text-3`.

**Motion.** `.pb-pick` hover lift (`translateY(-2px)` + accent border + `--shadow-md`). Nothing else.

**Copy.** H2 verbatim: *"Think you can beat a frontier model?"* Sub (fits Arena's own voice, honest about
landing on a chooser): *"Pick a game, seat a frontier model, and play turn by turn in your browser."* Note
line (mono `--text-3`): *"50 games · unsupported pairings are locked until verified."* CTA `Play Against
AI`. Never promise "instant" play — Arena's first screen is a setup chooser.

**Data-honesty.** "Ready" vs "Coming soon" reflects the real `battlefieldRequestModels` allow-list; don't
show a game as playable if no supported opponent exists for it.

**Components/tokens.** `.playband`, `.pb-pick*`, `StaticGameGlyph`, `StaticButton`. Existing CSS in
`landing.css` — minimal change.

**Mobile.** `.playband` stacks 1-col ≤880px; pick grid stays 2-col then 1-col.

**Alternative for the designer:** M3 and M4 both say "pick a game." If the adjacency feels repetitive,
merge them — give the 50-game grid tiles a Play/Watch affordance and drop the separate play band — but
this loses the punchy "Think you can beat a frontier model?" conversion moment. Default: keep both, order
M3→M4, distinct intents (M3 = *play invitation*, M4 = *full menu*).

---

### 5.4 · M4 — "Every game we play" (the 50-game grid + providers strip)

**Purpose.** Prove scale and teach the 50-game shape *visually* (glyphs, not a table), and let the
visitor browse into any game. This band is one of the current build's genuine strengths — keep it, fix its
one vocab leak, and fold the weak provider wall into a compact tail.

**Layout.** `SectionHead` (eyebrow **`50 games`** — *not* "50 arenas", title **"Every game we play"**,
sub the existing category descriptor, action a `.chiprow` category filter: All · Board & Strategy · Card &
Hidden-Info · Social & Economic · Control & Arcade) over the grouped **5-up `.gtile` grid** of all 50
games — each tile a centred `GameGlyph`, 2-line-clamped name, and the **mono variant token** (never a
difficulty or "top model", per brief §7 Games). Below it, a **compact providers strip** (not the 70-chip
wall): the tier-1 **Frontier labs** as `ProviderDot` chips inline, then **"+ N more providers →"** →
`/models`, with the honest line *"Provider pages are ready now; results appear only after official results
are verified."*

**Light + dark.** `.gtile` / `.ag-grid` and `.pw-chip` are fully token-driven and already correct in both
themes; `.gtile:hover` lifts with the 2px accent top-bar. Nothing new.

**Motion.** `.gtile` hover lift (`translateY(-3px)` + `--shadow-md` + accent top-bar). Category filter
switches content instantly (client island, no route change — keep `searchParams` off the server to
preserve ISR).

**Copy.** Eyebrow `50 games`; category names exactly the four locked labels; variant tokens in mono.
Provider strip line verbatim from today (it's already the model of honest copy).

**Data-honesty.** Static catalog — always honest (a directory, not results). Category counts must equal
the locked taxonomy (Board & Strategy 16 · Card & Hidden-Info 17 · Social & Economic 5 · Control & Arcade
12 = 50); validate against `summary.categoryCounts`. **Alias the URL slugs** so no engine key leaks —
`?category=board-strategy`, never `?category=RL` / `?category=Strategy` (see §12.10).

**Components/tokens.** `SectionHead`, `.chiprow`/`.chip`, `.ag-grid`/`.gtile`, `GameGlyph`, `ProviderDot`,
`.pw-chip`. Existing CSS; remove the standalone `.pw-tiers` full wall (fold to the strip).

**Mobile.** `.ag-grid` 5→4→3→2 at 1080/768/520px (existing cascade); provider strip wraps.

---

### 5.5 · M5 — "Run the engine" + Grand Slams teaser + close

**Purpose.** Hand the builder the keys, prove the instrument is real and inspectable (not a marketing
board), state the scale counts once, and close with the one honest "not yet" — Grand Slams.

**Layout.** Keep the `.oss2-grid` open-source band: left — eyebrow `Open source`, H2 **"Run the engine
yourself."**, sub with the mono `.eslams` framing, `View GitHub` CTA, MIT tags; right — the `Terminal`
mock (`pip install eslams` → `eslams run …` → `match.eslams saved` → `Replay ready`), **dark in both
themes**. Fold the **scale counts** in here as a caption computed from one source ("50 games · N providers
· M verified matches · 100% replayable") — this replaces the standalone stats band. Then **one quiet Grand
Slams teaser**: badge **"Coming December 2026"**, title **Grand Slams**, sub *"The definitive knockout
tournament for AI models across all 50 games."*, the countdown treatment (`DEC : 01 : 2026 : UTC`), a
**`Get notified`** email capture → `/grand-slams`. If seeded contenders show, they carry **"verified entry
pending"** and the line *"Only verified entrants, brackets, and results will appear here."*

**Light + dark.** Terminal is always dark (`--term-*` palette) in both themes (Resend/Clerk pattern). The
Grand Slams teaser is a quiet `.card`; its only flourish is the sanctioned nav-style shimmer on the date
chip (`--gold`, reduced-motion → static) — the *second and last* permitted gradient/shimmer.

**Motion.** Terminal is static (optionally a one-time typing reveal, reduced-motion → full text). The
countdown ticks live (proper `<time>`/unit markup, `aria-live` polite). No other motion.

**Copy.** `Run the engine yourself.` · `pip install eslams` · badge `Coming December 2026` · CTA `Get
notified` / `Preview Grand Slams`. Never "Enter" / "Compete" / "Watch" for Grand Slams — it isn't running.

**Data-honesty.** Scale counts from the same source as `/models` and `/leaderboard` (§8.9 — a mismatch is
a P0). Grand Slams is honestly pre-launch; the teaser must never imply live results.

**Components/tokens.** `Terminal`, `SectionHead`, `.oss2-*`, `StaticTag`, a small countdown component
(reuse `/grand-slams`'s). Existing CSS in `landing.css`.

**Mobile.** `.oss2-grid` and the teaser stack 1-col ≤860px; terminal scrolls horizontally inside its own
`overflow-x:auto` frame; countdown units wrap.

---

### 5.6 · The interval grammar (used across M1 and M2)

Specified once so it reads identically everywhere a score appears. This is the single most important new
visual in the redesign — it is how the page turns the live data defects into rigor.

- **The score is a distribution, not a digit.** Render the **Official Score (0–1000)** as the headline
  number (mono, tabular, weight 650), and directly under it a **horizontal band**: a thin `--surface-3`
  track spanning the relevant 0–1000 sub-range, a shaded **P10–P90 span** in `--accent-line`, and a
  **mean tick** in `--accent`. Small, ~84–120px wide — a cousin of `.wldbar` and `Sparkline`.
- **Label it, always.** A one-line caption "80% credible interval" (or a tooltip) — an *unlabeled*
  interval is explicitly worse than none (§8.2).
- **Overlap is a feature.** When two ranked rows' bands overlap, draw a hairline **"statistically tied"**
  bracket between them so a lower-ranked-higher-score never reads as a bug.
- **Sparse = wide.** Under-sampled models show a *visibly wider* band + "verified entry pending" — the
  wide band is the honesty (LMArena's "Preliminary" pattern). Never hide a sparse row or fabricate a tight
  rank.
- **Reduced-motion / print.** The band is static; if it animates its width in, that's after the number is
  already legible.
- **Tokens only:** track `--surface-3`, span `--accent-line`, tick `--accent`, label `--text-3`. New CSS
  primitive `.lp-interval` (or `.ci-band`) in `components.css`.

---

## 6. Data-contract prerequisites (blocking — the honest render depends on these)

M2 (and the champions in M1) **cannot render honestly today**: everything needed exists upstream in
`ModelSeed.rating` / the leaderboard snapshot but is **dropped** before it reaches the client in
`homeLiveModelFromSeed` (`public-home-live-data.ts:71`) and is absent from
`public-home-live-contract.ts`. This is a small forwarding change, not new science. The design note hands
this list to engineering as a gate:

1. **`officialScore` (mean) + `rankScore` (conservative lower bound)** on `PublicHomeLiveModel` — today
   only `score` + `rank` survive. Fixes the rank/score contradiction (§8.1).
2. **Interval bounds** — `posteriorP10 / P50 / P90` per ranked model (present in
   `ModelBayesianRatingSeed`, dropped). Powers the §5.6 band; unlabeled interval is forbidden (§8.2).
3. **A metric label / methodology tag** carried to the client ("Ranked by conservative Bayesian skill";
   "Bayesian hierarchical v1") so the order is self-explaining (§8.3, §8.6).
4. **Snapshot freshness** — a `generatedAt` / `publishedAt` timestamp on `PublicHomeLiveData` (it exists
   on the leaderboard source view but not on the home contract). Powers "updated 14m ago"; kills fake
   "live" (§8.6, §12).
5. **Clamped champion score + a champion==game-page-#1 join** — replace the pass-through `displayScore`
   with the game-page canonical #1 so Home champions provably equal each game page's #1 (§8.9). Kills
   "17 / 100 / 1001 / 0-N-A".
6. **Effective sample size** per model/champion (`effectiveSampleSize`, present, dropped) — to gate/label
   win rates and kill vanity 100%s.
7. **Provider-diversity / ranked-model count** — "N models ranked across M providers" so an all-one-
   provider top-N is framed as partial coverage, not a broken board.
8. **Proof links on Home rows** — `ModelSeed.proof` (artifact/match URLs, parsed but not forwarded) so
   every official number links to proof (§8.8).
9. **A "seeded/demo" flag surfaced to the client** (`isDemoBreakdown` exists internally) so the UI can
   suppress degenerate seed data (uniform win rates/counts) instead of rendering it as fact.
10. **Category URL slugs aliased** to `board-strategy` / `card-hidden-info` / `social-economic` /
    `control-arcade` so no engine key (`RL`, `Strategy`) ever leaks into a public, SEO-visible URL; and
    the four category counts validated against the locked taxonomy.

**Rule for the designer:** wherever a prerequisite isn't yet met, design the **honest "verified entry
pending" state**, not the broken render. The page should look *intentional and incomplete*, never broken.
(No DB migration is implied by any of this — it is contract/loader forwarding; flag to engineering, don't
auto-apply.)

---

## 7. Motion, performance & accessibility (global)

**Motion.** The page's motion budget is spent almost entirely in the *locked hero*. Below it, motion is:
card hover lifts (`translateY(-1px/-2px/-3px)`, 0.15–0.25s), the interval band's optional width-in, the
proof-chain disclosure, the Grand Slams date-chip shimmer, and the live countdown. That's the list.
**Every one respects `prefers-reduced-motion`** (show the end state). No autoplaying animation grids, no
glow, no scanlines, no gradients on interactive surfaces (only the two sanctioned washes: `.lp-hero` and
`.playband`, plus the nav-style GS shimmer).

**Performance (hard `/` budget: 180KB gzip first-load JS).**
- **ISR-first shell + client islands.** The whole page is a cache-served server shell; only the pieces
  that need interactivity hydrate — the category `.seg`/`.chiprow` toggles (M2, M4), the proof-chain
  disclosure, the countdown. Keep all `searchParams` reads **client-side** (server reads kill ISR).
- **Home must not import Arena or the replay player.** M1's posters are **server-rendered static
  board end-states** (or one tiny, isolated reduced-renderer island for the live poster only) — *not* the
  Arena/`/replays` player, which lives behind the 350KB/300KB budgets. This is the single biggest perf
  trap in this redesign; hold the line.
- **Below-the-fold is lazy** (`content-visibility:auto` is already on `.lp-section`); M4/M5 render on
  approach.
- **Counts computed once, server-side**, from the shared source (no hand-typed numbers that can drift).

**Accessibility.**
- Global `:focus-visible` ring on every interactive element (the `.seg`, chips, posters, proof links,
  the countdown notify form) — never `outline:none`.
- The interval band and "statistically tied" bracket need text/`aria` equivalents ("Official Score 742,
  80% credible interval 690–795"), not color/shape alone. Medals carry rank text.
- Category `.seg` is a proper `role="tablist"` / `aria-pressed` control, arrow-key navigable; `aria-sort`
  if the preview is sortable.
- Live regions: the countdown `aria-live="polite"`; a genuinely-live poster announces politely.
- Contrast: check `--text-3` on tinted surfaces (freshness stamp, "tied" bracket, variant tokens) in
  **both** themes — the known-thin area.
- Every icon-only control gets an `.sr-only` label (the one in `tokens.css`).

---

## 8. Copy deck (exact strings)

**Locked / verbatim (do not paraphrase):**
- Hero H1 — `Here, AI plays games.`
- Hero sub counts — `50 games. 70 model providers. One leaderboard.`
- Trust line — `No signup to watch.`
- M2 methodology sub — `Ranked by conservative Bayesian skill, backed by signed official artifacts.`
- M3 H2 — `Think you can beat a frontier model?`
- M3 sub — `Play a frontier model, head-to-head. Pick a game, choose your opponent, and go.` *(or the
  Arena-voiced variant: "Pick a game, seat a frontier model, and play turn by turn in your browser.")*

**Section chrome:**
- M1 — eyebrow `Battlefield` · title `Latest matches` · action `See all matches` · stakes lines
  ("#1 meets #2", "the lead changed four times", "first meeting", "match point").
- M2 — eyebrow `Official results` · title `Who's winning` (or `The leaderboard, honestly`) · action
  `View full` · column `Official Score` · interval label `80% credible interval` · tie `statistically
  tied` · sparse `verified entry pending` · coverage `Verified official results so far — N models across
  M providers` · freshness `Official results · updated 14m ago`.
- M3 — eyebrow `Arena` · CTA `Play Against AI` · note `50 games · unsupported pairings are locked until
  verified` · locked pick `Coming soon`.
- M4 — eyebrow `50 games` · title `Every game we play` · provider strip `+ N more providers` +
  `Provider pages are ready now; results appear only after official results are verified.`
- M5 — `Run the engine yourself.` · `pip install eslams` · MIT tags · GS badge `Coming December 2026` ·
  GS sub `The definitive knockout tournament for AI models across all 50 games.` · GS CTA `Get notified`
  / `Preview Grand Slams` · GS honesty `Only verified entrants, brackets, and results will appear here.`

**Retired — never appears anywhere on Home:** `battle` / `battles` / `Latest battles`, `Watch live` (over
non-live data), `Elo` / `rating` (for Official Score), `arenas` (as a synonym for games), `arena type`,
`sweep`, `Locked` (use "Coming soon"), any `RL` / `Strategy` engine key in a URL or label.

---

## 9. Handoff checklist (build order)

1. **Hero:** ship untouched. Apply only the two flagged copy micro-fixes if approved (`Pick a game`;
   badge reword/de-dot). No layout or animation change.
2. **M2 first, gated on data (§6):** it's the trust heart and the highest-risk render. Build the
   **interval grammar (§5.6)** as a reusable `.lp-interval` primitive; wire the champions edge to the
   game-page #1 join and clamped score; build the overall preview with labeled interval + conservative
   rank + "statistically tied"; build the `.seg` category lens; build the proof-chain disclosure. Until
   the contract forwards §6.1–6.5, render the **"verified entry pending"** states — never the current
   contradiction.
3. **M1:** transform `MatchCard` into a living poster (static board end-state + advantage read + stakes
   line); gate the `.livedot` on `status==="live"`; fix `Latest matches` / `See all matches`; **do not**
   import the replay player.
4. **M3:** keep `.playband`; tighten copy; `Coming soon` (not "Locked"); ready-state from the real
   allow-list.
5. **M4:** fix eyebrow to `50 games`; keep the `.gtile` grid; **fold the 70-chip wall into a compact
   provider strip + `/models` link-out**; alias category URL slugs (§6.10); validate the four counts.
6. **M5:** keep the terminal; fold the scale counts in as a one-source caption (retire the standalone
   stats band); add the quiet Grand Slams teaser (countdown + `Get notified`, honest "pending" seeds).
7. **Global (§7):** verify the 180KB budget after wiring islands (no Arena/replay import); confirm every
   new motion has a reduced-motion end-state; run the a11y pass (focus rings, interval `aria` text,
   `.seg` tablist, contrast in both themes).
8. **Both themes:** screenshot light + dark for every new movement per `CONTRIBUTING.md`; check `--text-3`
   on all new tinted/interval surfaces.
9. **Vocabulary sweep:** grep the finished page for every retired word in §8 — zero hits.
10. **Update the docs:** once approved, reconcile `DESIGN_BRIEF.md` §7 "Home" to this IA and note in §13
    which P0 gaps closed (rank/score contradiction, headline-count drift, champion-vs-#1 logic,
    live-over-stale framing, and the vocabulary drift).

---

## 10. Governance note

This note **revises the "Home" anatomy in `DESIGN_BRIEF.md` §7**, which describes the current nine-band
page. The redesign is a deliberate first-principles restructuring (nine bands → five movements) requested
by the product owner; per brief §14, once it's approved and built, update §7 to match and record the
change. Nothing here overrides the brief's *principles*, *tokens*, *vocabulary*, *data law (§8)*, *a11y
(§10)*, or *performance budgets (§11)* — it applies them. Where this note and the brief's principles ever
appear to conflict, the brief wins; tell the user before diverging.
