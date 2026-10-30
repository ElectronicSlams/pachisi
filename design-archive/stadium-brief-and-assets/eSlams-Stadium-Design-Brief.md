# eSlams Stadium: design brief for the new Arena app

**For:** Claude Design. **Status:** design intent, settled by the founder (direction given 7 to 23 September 2026), ready to design against. **Date:** 30 September 2026.
**Reads with:** the asset zip `eslams-stadium-design-assets.zip` (map in Appendix A). Everything you need is in that zip: brand files, the production tokens, provider marks, card and tile art, the real 50-game catalogue, a real replay file, screenshots of the live site as of today, the earlier prototypes, and the earlier design notes you may inherit from.

---

## 0. Read this first

1. **eSlams is a stadium.** AI models play games here, and humans can step onto the pitch and play them. The site has two pillars, **Arena** (you play a model) and **Battlefield** (you watch models play each other), and one seasonal event, **Grand Slams** (8 to 14 February 2027).
2. **The leaderboard product is retired.** No rankings, no "climb the board", no evidence scores, no big simulation counts, no provider walls. The old evaluation suite and its data move to open source (PyPI, GitHub, Hugging Face). That is a separate lane and never appears as a product on the stadium site.
3. **Anything shown as a number comes from real matches, with a date.** Human vs AI and AI vs AI games are the only proof. If the data is not there, the surface says so plainly instead of pretending.
4. **Keep what is perfected:** the brand, the tokens (light and dark), the type, the home hero board animation, the per-game board renderers and their motion grammar, the Stage concept, the result curtain. These are locked and described in §4.
5. **Drop the mistakes:** the leaderboard narrative, "Preparing…" screens that hang, infrastructure wording in the UI, raw tokens in reasoning ledgers, "Watch live" over stale data, the December 2026 Grand Slams date, the six-theme system, phone verification, device attestation, Trinity references in public, the word Elo. Full list in §4.2.
6. **Build target:** one Expo app (React Native with Expo Router) that runs on web, iOS and Android from one codebase. The web canvas ships first. Design phone-first at 390 × 844 and desktop web at 1440 wide (§5).
7. **Tone:** bold brand, quiet claims. The site never claims anything it cannot show with live data (§1.3).
8. **Deliverables** are listed in §16. Both themes, phone and desktop, every state named in this brief.

---

## 1. What eSlams is now

### 1.1 The positioning

eSlams is a sports venue for artificial intelligence. The games are the sports: chess, Go, Connect Four, poker, Hex, Hanabi, fifty in all. The athletes are frontier models from every major lab. The venue hosts matches, keeps replays, and lets anyone in the crowd walk down to the pitch and play.

Two verbs run the whole product:

- **Play** (Arena). A visitor seats a model across the table and plays it turn by turn, in the browser or the app. The model visibly thinks, explains its move in a sentence, and the result is a scoreline worth sharing.
- **Watch** (Battlefield). A visitor watches two models play each other, live when a match is running, on replay the rest of the time, with the models' reasoning as narration.

Grand Slams is the season's championship week. It is a third pillar in the navigation and a teaser slot on the home page. Its internals are not designed in this brief (§10); during the week, Arena and Battlefield are the match and replay shell.

### 1.2 What it is not any more

- Not a leaderboard. The public leaderboard and the evidence-ranking board are being retired; their routes will redirect to stadium pages.
- Not a benchmark or a research lab. The evaluation suite, its historical results, and the researcher tooling live in open source: the Core package on PyPI, the GitHub repositories, and a Hugging Face warehouse. The stadium links out through a quiet **Open source** door and a quiet **Labs** door. Neither is a product on this site.
- Not a model catalogue. There are no model pages or provider pages. Models appear as opponents, as seat headers, and in match records. Providers appear as the small mark beside a model's name.
- Not an operations console. Trinity (the private admin) is never referenced in public UI.

### 1.3 Safe public claims, right now

| Say freely | Never say (not true or not ready) |
|---|---|
| Arena is live. You can play a frontier model now. | "713,339 verified games" or any simulation count |
| Battlefield has replays. | Evidence rankings, official scores, "ranked #1" |
| Here, AI plays games. | Live streaming, "Watch live" (unless a match is live right now) |
| Fifty games across four categories. | Trinity, the leaderboard, "submit to the leaderboard" |
| Grand Slams: 8 to 14 February 2027. | Hosted self-serve artifact upload, "upload your .eslams file" (until built) |
| A match's real date, players, result. | December 2026 (the cancelled Grand Slams date) |

When a fact may have changed by the time you design, the brief says so. Verify against the screenshots in the zip rather than against memory of the old site.

---

## 2. Who is in the stadium

1. **The player.** Arrives from a shared scoreline or from curiosity ("can I beat GPT-5 at Connect Four?"). Wants to be mid-match within two taps and a few seconds. Needs the model's thinking time to feel like drama, not a spinner. Needs a result card worth screenshotting.
2. **The spectator.** Arrives from a shared replay link or just wants to see machines think. Needs something already playing on arrival, with the date visible, and the reasoning readable. Needs zero sign-up.
3. **The Grand Slams fan.** From February 2027. Needs the schedule, the matches of the day, and the replays of last night, in the same Arena and Battlefield shell.
4. **The builder or researcher.** Not a stadium guest. Served by the Labs and Open source doors, which link out. The stadium never slows down for them, and never speaks their dialect (no "artifacts", "catalog rows", "gateway", "sweep", "runner").

The account boundary is simple and unchanged: **no signup to watch.** An account is asked for exactly once, at **Start game**, as a sheet that returns the player to the exact setup they were on.

---

## 3. Principles

These extend the house principles already in the July design brief (in the zip under `09-reference-docs/DESIGN_BRIEF.md`). Where the two disagree, this document wins.

1. **Clean, modern, AI-native. Never cyberpunk.** One accent colour (the logo blue). No neon, no glow, no glitch, no scanlines, no gradients on controls, no mascots, no emoji in product UI. Quiet surfaces, hairline borders, generous whitespace. The energy comes from motion, focus, tempo and copy.
2. **Show, don't tell.** A board is moving before the visitor has read a word. The hero plays a game. Battlefield is already playing when you arrive. Arena previews the game you are about to play.
3. **It's a matchup.** Every screen frames a contest: You vs Model in Arena, Model vs Model in Battlefield. Seat headers, a VS pairing, an active-turn cue, a scoreline at the end.
4. **Every match has a date.** Freshness is visible on every poster, every replay header, every slate. A stale slate says "last match 26 Jun 2026" instead of pretending to be today. A live dot appears only when a match is live right now.
5. **Honest surfaces.** No fake spinners, no fake precision, no numbers without matches behind them, no placeholders pretending to be features. Streaming slots, records, and the Labs upload path appear only when real.
6. **Latency is personality.** A frontier model takes 5 to 20 seconds on a hard position. That is the show: a visible clock, a streamed explanation, an honest expectation from telemetry. Every other millisecond is removed. Hard dead ends are forbidden.
7. **Two taps to play, zero taps to watch.** Time-to-first-move for a returning player is two taps. Watching never asks for anything.
8. **Performance is design.** Phone cold start to interactive under 2.5 seconds, boards at 60 fps on mid-range Android, home web page first-load JavaScript under 180 KB gzipped. If a poster feed janks, cut posters.

---

## 4. What we keep, what we drop

### 4.1 Locked: do not redesign these

**Brand.** The mark is a lowercase "e" inside a rounded-square outline, drawn with a slightly hand-made wobble. It is always the royal blue (`#1b32c4` in light, the mark stays blue in dark). The wordmark "slams" sits tight to the mark and flips near-black on light, near-white on dark. Tagline, verbatim: *Here, AI plays games.* Files in `01-brand/`. Do not recolour, outline, shadow or gradient the mark. The mark alone is the favicon and the app icon.

**Tokens.** `02-tokens/tokens.css` is production canon: surfaces, borders, text, the accent family, win/loss/draw, medals, the board palette, the terminal palette, shadows, radii, type stacks, layout constants, light and dark. Propose new tokens only where this brief creates a genuinely new need (likely: dock height and blur, share-card safe margins, Grand Slams event-ribbon tint). Key values:

| Role | Light | Dark |
|---|---|---|
| `--bg` / `--surface` | `#ffffff` / `#ffffff` | `#0c0c0e` / `#121215` |
| `--surface-2` / `--surface-3` | `#f7f7f9` / `#f0f0f3` | `#18181c` / `#1f1f24` |
| `--text` / `--text-2` / `--text-3` | `#0b0b0d` / `#56565f` / `#666672` | `#ededf0` / `#a2a2ad` / `#9a9aa5` |
| `--accent` | `#1b32c4` | `#647cff` |
| `--win` / `--loss` / `--draw` | `#1f8a4c` / `#c43d33` / `#b0791b` | `#3ec97e` / `#ec6a5f` / `#e0a94a` |
| Board | `--board-light #efe9dd`, `--board-dark #b9a888`, `--board-bg #f4f1ea` | `#2b2b33`, `#3a3a45`, `#1c1c21` |
| Radii | xs 5 · sm 7 · md 10 · lg 14 · xl 20 · pill 999 | same |

**Type.** Sans (SF Pro / Inter / system) for UI and headings, weight 650 for headings, letter-spacing −0.02em. Mono (JetBrains Mono stack, tabular numerals) for anything machine-like: model ids, move labels, move counts, variant tokens, dates in chips, counts. Sentence case everywhere; all-caps only in the 11.5 px mono eyebrow.

**The home hero board animation.** The right-hand card of the hero is perfected and is reused as built. Its anatomy, from the production component:

- A card with a header row: a small tag reading **Watch replay** (play glyph; it reads **Watch live** with a red dot only when the match is actually live) and a **Battlefield →** link to that match.
- A players row: model A badge · mono "vs" · model B badge, each badge a provider mark plus `provider/model` in mono with the provider prefix dimmed.
- The board: one of **Chess, Connect Four, Othello, Tic-Tac-Toe**, playing a deterministic recorded sequence frame by frame (chess: a 13-move miniature ending in mate; Connect Four: discs dropping to a win; Othello: flips; Tic-Tac-Toe: a win line). The last move is highlighted.
- A control row: play/pause button · the current move label in mono (for example `R → d`, `e4`) · a scrubber · a frame counter in mono (`7 / 18`).
- A footer: game glyph + game name on the left; on the right, dots to switch between the four featured matches.
- Behaviour: auto-plays, holds the final frame about 2 seconds, then advances to the next game; hover or focus pauses it; reduced motion shows the final frame with controls disabled.

Keep this geometry, choreography and behaviour exactly. You may re-skin it with tokens and re-flow it for the phone (full-width card under the headline). Do not re-choreograph it. The recorded sequences are in `05-data/home-hero-animation-records.ts`.

**The board system.** Twelve renderer families, one shared Stage, one last-move language, one reveal choreography, one motion grammar. Specified in `09-reference-docs/DESIGN_NOTE_battlefield.md` §4 to §6 and summarised in §12 here. Timings come from the catalogue: move 220 ms (Connect Four earns 320 ms with the system's only gravity settle), reveal 300 ms (180 ms for simple reveals), result 520 ms, one calm ease-out, reduced motion snaps to the final state.

**The Arena matchup stage.** From the v4 prototype and the mobile v3 prototype (in `08-prototypes/`): the animated game preview as centrepiece, the **YOU vs MODEL** pairing that updates live as you change opponent, the model wheel with "All N models" behind it, the single **Start game** button. Keep the structure; apply the fixes in §8.

**The Stage, the result curtain, the filmstrip scrubber.** Keep as specified in the Battlefield note. Arena adds a thin input overlay to the same board; Battlefield shows it read-only with the scrubber. Same board, same last-move language, both surfaces.

**The game tile.** Square tile: centred glyph in a rounded-square icon tile, two-line-clamped game name, the variant token in mono underneath (`standard`, `board_9x9`, `compact_gin`). Never a difficulty, never a "top model". Selected state: accent ring and an "Active" badge.

**Status vocabulary for models.** `Ready` · `Slower turns` · `Not available for this game` · `Coming soon`. Nothing else, ever.

**The sign-in split screen.** The current login page (screenshot in the zip) is fine: brand panel left, SSO first (GitHub, Google), then email. Keep it; apply the copy rules in §13.

**The terminal.** The dark-in-both-themes terminal component with `pip install eslams-core` stays, inside the Open source door.

### 4.2 Dropped: the mistakes we move away from

| Mistake | What replaces it |
|---|---|
| The site sold a leaderboard: "One leaderboard" in the hero, "Explore Leaderboard" as the second CTA, an evidence-ranking instrument on the home page, Leaderboard as the first nav item. | Arena and Battlefield are the product. Second CTA is **Watch on Battlefield**. Rankings do not exist on this site. |
| Big counts as proof: "713,339 verified eSlams games", "90 model providers", a 90-chip provider wall, a stats caption. | Proof is real matches with dates. Counts are limited to the catalogue ("fifty games") and real match records. No provider wall. |
| "Preparing…" screens that hang with no progress, no time expectation, no way out. | A staged curtain-riser driven by real lifecycle events, with an expectation from telemetry and an escalation path (§8.3). |
| Roster confusion: "Model roster · 313 live", "36 shown opponents", raw names like `GPT 4o 2024 05 13`, "All games" vs "27 games". | A curated default roster, a searchable full roster, formatted display names, the four-word status vocabulary. "Live" is never used for roster size. |
| Infrastructure dialect in the UI: `Seat A reasoning`, `cell 5`, `advantage pending`, `Turn 2 \| cell 1`, "Gateway ready", "catalog rows", "arenas" as a synonym for games. | Player language: the model's name, "plays the centre square", no advantage bar until the data exists, "Turn 2 · Claude plays b3". |
| "Watch live" and "0 live now" framing over matches from June. | A live dot only on a live match. Otherwise the slate shows dates and says when the last match was. |
| Grand Slams dated "Coming December 2026". | 8 to 14 February 2027, finals Sunday 14 February, 7:00 pm Pacific (§10). |
| Six app themes (Neon, Club, Arcade, Midnight), a first-run theme picker, mark re-tinting per theme. | Two themes, light and dark, following the system by default, with a toggle. The mark stays blue. |
| Phone verification (OTP) and device attestation as gates to play. | Account at Start game only: Apple (iOS), Google, GitHub, email. Nothing else. |
| A six-step auth sheet with a "data pact" screen. | A one-step sign-in sheet. Match visibility is a setting and an inline toggle on the result card. |
| A mobile app built as a separate product with its own catalogue counts (36, 35, 38 games) and a hardware-only GPU renderer. | One Expo codebase; counts derived from the one catalogue; the board renderers are the shared system described in §12, rendering on web and native. |
| A four-item phone dock (Leaderboard, Arena, Battlefield, Profile) plus a hamburger. | A three-item dock: Home, Arena, Battlefield. Profile top-right. Grand Slams top-left. No hamburger. |
| Un-clamped or contradictory numbers ("1,001", "0 / N/A", rank 1 scoring less than rank 2, "Elo"). | No scores. Records only, from real matches, with counts and dates. |
| 300 KB PNG logos on every page, a 68 px manifest icon, a web manifest scoped to "/" with no installability. | Optimised marks (in `01-brand/web-optimized/`), proper maskable icons at 192 and 512, an installable Arena (§5.3). |
| A dead `/labs` page. | A real Labs door with three links (§11.1). |

---

## 5. Platform, canvases, build target

### 5.1 One Expo app

The product is one Expo application (React Native, Expo Router, TypeScript) that renders on **web, iOS and Android** from one codebase. Ship order is **web first** (the live site adopts these designs), then **installable web** (Arena as a progressive web app), then the stores when the founder green-lights them. Design so the web canvas can ship alone without waiting for anything native.

Today's eslams.com is a Next.js site. Whether the web canvas is served by Expo's web target or by the existing site adopting these screens is an engineering decision. The designs must not depend on it: no screen may rely on a native-only affordance to be usable.

### 5.2 Canvases and breakpoints

| Canvas | Size | Role |
|---|---|---|
| Phone | 390 × 844 at 1x (iPhone 13 class; Android identical) | Primary. Portrait only for play at v1. Safe areas: 47 px top, 34 px bottom. |
| Desktop web | 1440 × 900, content max-width 1240 | Secondary. This is what ships first on eslams.com. |
| Tablet / narrow desktop | 600 to 1023 wide | Desktop layouts with two-column collapses. Do not design separately. |

Breakpoint rules carried from production: game grids 5 → 4 → 3 → 2 columns at 1080 / 768 / 520; Battlefield stacks at 980; Arena stacks at 920; the desktop nav becomes the phone chrome under 920.

What differs per canvas is only the chrome: phone has a dock and sheets, desktop has a top nav and inline panels. Every component (poster, tile, Stage, scoreline, curtain-riser, roster row) is identical on both.

### 5.3 Installable web (design for it now, ship it later)

Arena will become installable. Design: a 512 and 192 maskable icon from the mark on the brand blue or on the theme background (both variants), a splash (mark, wordmark, tagline), and standalone chrome: when installed there is no browser back button, so every pushed screen and every sheet carries its own back or close affordance. Start URL and scope belong to engineering, not design.

---

## 6. Information architecture

### 6.1 Phone chrome

- **Dock:** three destinations, **Home · Arena · Battlefield**, as a floating pill above the home indicator (surface background, hairline border, backdrop blur). Icon plus label; the active item takes the accent icon and label on an `--accent-soft` fill. A gently springy selection transition (disabled under reduced motion).
- **Top-left:** the **Grand Slams** entry (trophy glyph). Before the event it opens the teaser; during event week it opens the event hub. It disappears if there is nothing to say.
- **Top-right:** **Sign in** chip when signed out; the avatar (32 px circle, mono initials fallback, no hard-coded provider colour) when signed in. Opens Profile.
- **Search:** a magnifier in the Arena and Battlefield headers, expanding inline. Searches games, models and people.
- **Fullscreen Stage** for play, watch and replay: a modal surface above everything, dock hidden. Replays dismiss with swipe-down (grab handle). Live play never dismisses by gesture: an explicit × opens a *Leave match?* sheet.
- **The now-playing bar.** Leaving a live match never abandons it. A slim bar docks above the pill: game glyph · "Your move" or "GPT-5 is thinking…" · tap to re-enter. One live session at a time.
- **Sheets** for everything else: game sheet, full roster, sign-in, request a match, filters, share, leave-match.

### 6.2 Desktop web chrome

- **Header:** logo · **Arena · Battlefield · Grand Slams** (active = accent underline) · right: search (`/` shortcut) · theme toggle · **Sign in** or avatar. The GitHub icon moves to the footer. No Grand Slams marquee box in the header; the nav entry and the home teaser carry it.
- **Footer:** four columns. **Stadium** (Arena, Battlefield, Grand Slams) · **Labs** (Labs, Quickstart, Visualise a replay when built) · **Open source** (GitHub, PyPI, Hugging Face, Contributing) · **Account** (Sign in, Create account, Your profile, Settings). Legal row: MIT, Terms, Privacy, Report abuse, Security contact, hello@eslams.com. The giant outline wordmark behind the footer stays.

### 6.3 Route map

| Route | Surface | Notes |
|---|---|---|
| `/` | Home, the front door | §7 |
| `/arena` | Arena landing and setup | §8.1 |
| `/arena/play` | The Stage in play mode | §8.4 (fullscreen on phone) |
| `/arena/records` | Stadium records: human vs AI, from real matches | §8.7, shown only when data exists |
| `/battlefield` | Battlefield landing | §9.1 |
| `/battlefield/<match>` | Replay or live match page | §9.2 |
| `/grand-slams` | Teaser page; event hub during the week | §10 |
| `/labs` | Labs door | §11.1 |
| `/open-source` | Open source door | §11.2 |
| `/<username>` · `/profile` | Public profile · your profile | §11.3 |
| `/settings` | Settings | §11.5 |
| `/login` · `/signup` | Auth | §11.4 |
| legal pages, `/404` | Same chrome | §11.6 |

**Retired routes:** `/leaderboard`, `/leaderboard/methodology`, `/models`, `/models/<provider>/<model>`, `/providers/<provider>`, `/games`, `/games/<slug>`, `/docs`, `/trinity-info`. They redirect to stadium pages. A game's information lives in its Arena game sheet; a model's information is its opponent card.

### 6.4 The account boundary

Watching, browsing, searching, opening a game sheet, choosing an opponent: all anonymous. The sign-in sheet appears at **Start game**, once, and returns the player to the exact game, opponent and side they chose. Lanes: Apple (required on iOS), Google, GitHub, email. Username is the only thing signup asks for (`eslams.com/username`). Nothing else gates play.

---

## 7. Home: the front door

Web `/` and the phone **Home** tab. The page moves from "here is a leaderboard" to "here is a stadium: something is playing, come and play, and the championship is coming". Six movements, in this order.

### 7.1 Hero (locked animation, new copy)

Left column: pill badge **Watch on Battlefield** (no standing live dot) · H1 **Here, AI plays games.** at clamp(42 to 66 px) · the sub · two CTAs · the trust line. Right column: the hero board animation card, exactly as built (§4.1).

Copy:

- H1, verbatim: **Here, AI plays games.**
- Sub (new): **A stadium for AI. Watch frontier models play each other, or take a seat and play one yourself.**
- Primary CTA: **Play Against AI** → `/arena`. Secondary: **Watch on Battlefield** → `/battlefield`.
- Trust line: **No signup to watch · Turn-by-turn replays**.

Retired from the hero: "50 games. 90 model providers. One leaderboard.", "Explore Leaderboard", "Pick an arena".

Phone: headline, sub, the animation card full-width, the two CTAs stacked, the trust line.

### 7.2 On now: today's slate

Eyebrow **Battlefield** · title **On now** (or **Latest matches** when nothing is live) · action **See all matches →**.

Three to four **living posters**, each a card with: game glyph and name · a **date** (relative with absolute on hover: "today", "3h ago", "26 Jun 2026") and a red live dot only when `status === live` · a static end-state render of the board (or the live board stepping its last move, one poster at a time) · model A vs model B with provider marks, winner at weight 600 and loser at 55 % opacity when completed · one line of stakes in `--text-2` ("first meeting", "the lead changed four times", "decided on turn 34").

A scheduled job will create cheap AI vs AI matches and refresh this slate. Design the three states:

- **Fresh:** posters dated today or this week.
- **Old:** posters are shown with their real dates and a quiet line above: **Nothing new today. Last match played 26 Jun 2026.**
- **Empty:** a single calm empty card: glyph tile, **No matches on the slate yet**, grey copy, a **Watch the archive** link.

Never a spinner, never a fake live dot, never "Watch live" over a replay.

Phone: a vertical stack of full-width posters; one animates at a time, viewport-driven.

### 7.3 Take a seat: the play band

Keep the current play band structure and its one sanctioned soft accent wash. Eyebrow **Arena** · H2, verbatim: **Think you can beat a frontier model?** · sub: **Pick a game, seat a frontier model, and play turn by turn in your browser.** · primary **Play Against AI** · four quick picks (Connect Four, Chess, Tic-Tac-Toe, No-Limit Hold'em), each linking into Arena with the game preselected; a pick with no supported opponent shows **Coming soon**. Note line in mono `--text-3`: **Fifty games · opponents marked Ready are playable now.**

### 7.4 Grand Slams teaser

A quiet card: gold trophy glyph · date chip in mono **8–14 FEB 2027** · title **Grand Slams** · sub **A week of knockout matches between frontier models, across all fifty games.** · a line **Finals · Sun 14 Feb · 7:00 pm PT** with the viewer's local time beside it · a day countdown to the opening day · **Get notified** email capture · **About Grand Slams →**. The only flourish is the sanctioned shimmer on the date chip (static under reduced motion). Never December 2026. Never "Enter", "Compete" or "Watch" for an event that has not started.

### 7.5 The games

Eyebrow **Fifty games** · title **Every game we play** · category chips: All · Board & Strategy · Card & Hidden-Info · Social & Economic · Control & Arcade. A 5-up grid (5 → 4 → 3 → 2) of the thirteen main Arena games, each a game tile (glyph, name, variant), then **All fifty games →** into Arena. On the phone: a horizontal rail of large tiles, then the link. Control & Arcade games link to Battlefield's benchmark lane, not to Arena.

### 7.6 Two doors, then the footer

Two equal quiet cards side by side (stacked on phone):

- **Open source.** Eyebrow **Open source** · H3 **Run the engine yourself.** · sub **eSlams Core is the public evaluation engine: fifty games, a strict agent protocol, deterministic replays.** · the terminal (`pip install eslams-core` → `eslams run --arena chess …` → `runs/latest.eslams saved`) · links **GitHub · PyPI · Hugging Face**.
- **Labs.** Eyebrow **Labs** · H3 **Bring your own model.** · sub **Watch a demo match, follow the quickstart, or visualise a replay file.** · three links (§11.1).

No stats caption. No provider wall. Then the footer.

---

## 8. Arena: the play side

### 8.1 Arena landing (`/arena`, phone Arena tab)

Top to bottom:

1. **Resume card** (conditional). If a live session exists: game glyph, opponent, `Your move` / `GPT-5 is thinking…`, a **Resume** button. Nothing outranks an unfinished match.
2. **The matchup stage.** A two-column row on desktop (stacked on phone):
   - Left: game name and variant in mono · the **animated preview** of the selected game (a real recorded sequence rendered by the shared board system; final frame under reduced motion) · the **YOU vs MODEL** row: your username (or **You**) on the left, a mono **VS**, the opponent card on the right (provider mark, display name, status word). The right side updates live as the opponent changes.
   - Right: the **opponent module** (§8.2) and, where the game demands it, the **side picker** (X / O, White / Black as two large toggles; a seat ring for table games when table mode ships) · **Start game**, full-width primary, with a readiness line under it: `Tic-Tac-Toe · Ready` or `Chess · Slower turns`.
   - The hero game **rotates per visit** between Tic-Tac-Toe, No-Limit Hold'em, Connect Four and Chess for first-time visitors (this rotation exists in production; keep it). Returning players see their last game and opponent, so **Play now** is two taps.
3. **Choose your game.** Count chip **37 playable** (derived, never hard-coded) · the four category chips (Control & Arcade are not Arena content and do not appear here) · the 5-up tile grid. Selected tile: accent ring and **Active** badge. Games whose table mode is pending (Leduc, Limit and No-Limit Hold'em, Mahjong, Dou Dizhu, Bridge) show as **Coming soon** tiles until the platform ships it: visible, wanting, not tappable-to-nowhere. (Verify at design time: the live roster today exposes 28 games with named opponents; the catalogue marks 37 as Arena-playable.)
4. **Stadium records** (quiet strip at the bottom, only when data exists): **Humans vs machines this week: 38 % of matches won by people · 1,204 matches** → `/arena/records` (§8.7). Recruitment, not navigation. Hidden when there is no real data.

Phone: the matchup stage is a tall card (preview on top, YOU vs MODEL under it, Start game in the thumb zone); the opponent module is a horizontal snap-scroll wheel; the grid is 2-up.

### 8.2 The opponent module and the full roster

The live site today shows "Model roster · 313 live" and "36 shown opponents". Replace with:

- **Default row:** a curated eight: the **Best first opponent** (fast, strong at this game), then chips **Fast · Strong · Balanced · Newest** that re-sort the row. Each card: provider mark · display name · status word.
- **All N models →** opens the **roster sheet**: search field at the top, grouped by provider, each row with mark, display name, status for the selected game (`Ready`, `Slower turns`, `Not available for this game`). Tapping a model selects it and closes the sheet.
- **Display names are formatted properly.** `GPT-4o (May 2024)`, not `GPT 4o 2024 05 13`; `Qwen Plus (July 2025)`, not `Qwen Plus 2025 07 28`; `Gemma 4 26B A4B`, not `Gemma 4 26B A4B  (free)`. The model id in mono (`openai/gpt-4o-2024-05-13`) sits under the name in the roster sheet only, provider prefix dimmed.
- **Human vs AI marking is unambiguous.** You are always **YOU** with your username; the model always carries its provider mark. Never "Seat A" and "Seat B" in Arena.
- The word **live** is never used for roster size. "313 models" is fine inside the sheet's header.

### 8.3 The curtain-riser: fixing "Preparing…"

Between **Start game** and the first move there is real work: reserving the one-session-per-account seat, waking the Python engine container (every game except Tic-Tac-Toe and Connect Four needs it), and the model's first call. Today this is a "Preparing…" line that can hang. Replace it with a full-bleed load screen, one per game family, that stages the work honestly:

- **The matchup writes on** like a fight card: **YOU** (username) · vs · model name with provider mark · game and variant in mono underneath. The game's preview animation runs quietly behind.
- **Four real steps** as a vertical step list with a check as each completes, driven by lifecycle events and never by a timer: `Reserving your seat` → `Waking the engine` → `Seating Claude Opus` → `First move`. Tic-Tac-Toe and Connect Four skip step two.
- **A time expectation** from telemetry under the active step: `usually 3–8 s` (engine) · `usually ~9 s` (this model's first move). An elapsed clock in mono.
- **Escalation.** 10 s: `Taking longer than usual…`. 30 s: a row of options, **Keep waiting · Play something ready now (Tic-Tac-Toe, Connect Four) · Switch opponent · Exit**. Hard failure: a designed state with a plain reason and a next action, for example **The engine room is busy right now. Tic-Tac-Toe and Connect Four run instantly, or try Chess again in a minute.** Never a bare error code, never "refresh this game".
- **The transition.** When the first move is ready, the load screen *is* the Stage's opening frame: the board fades in under the fight card, which compresses into the seat bar. One continuous scene, no screen swap.

### 8.4 The Stage, play mode

Portrait on phone, centred on desktop; the board is the largest, brightest object on screen.

- **Ribbon:** × (exit) · game name · move counter in mono.
- **Seat bar:** you and the model as a compact facing pair; the active seat wears the accent underline. The model's side carries the **deliberation clock** (`thinking 0:07 · usually ~9 s`) while it thinks. The advantage bar between the seats stays neutral until per-turn advantage data exists (it does not today); it resolves only at the result. Never fake a curve.
- **The board,** pinned, width-filling, per-family rendering (§12). The last move is highlighted. Pinch-zoom with a loupe on 15 × 15 boards.
- **The reasoning line.** After each model move its one or two-sentence public explanation streams in under the board, sans, `--text-2`. Move first, explanation second. This is the voice of the product; give it room.
- **Your controls** in the thumb zone: per-family input (tap a cell, tap a column with press-and-hold preview, tap piece then tap target with legal-move dots, tap to select then play a card, a bid stepper, an offer slider) · a quiet overflow (**How to play · Sound · Resign**).
- **Freshness states**, always visible in the seat bar: `Your move` · `Thinking…` with the clock · `Waiting for you since 12 min` (sessions wait indefinitely; say so rather than hiding it) · a `Reconnecting…` ribbon pulse when the socket drops, never a modal.
- **Premove:** queue your next move while the model animates; the queued cell or piece shows a ghosted outline.
- **Escalation** per brief law: 30 s `Taking longer than usual`, 60 s options appear, and at the hard cap (120 s, server-enforced) the player may **Claim the win**. The result is labelled honestly on the scoreline (`Won on timeout · the model never moved`) and is excluded from records; say so in a footnote.
- **Arrival cues:** a soft piece-set-down sound per family and a light haptic tick when the model's move lands; a medium tap when it is your turn after a long think; a result pattern. Each has its own toggle. Muted when the device is silent. No music, no loops.
- **Exit:** × → sheet: **Leave match? The model will be waiting.** · **Resign** · **Keep playing**. On phone the now-playing bar carries the session.

### 8.5 The result: a scoreline made for sharing

Full-screen over the held final board. The board settles; a beat of stillness; the advantage bar runs to the winner; the **scoreline card** rises: the outcome word, large, weight 650 (**You won.** / **GPT-5 wins.** / **A draw.**) · the YOU vs MODEL chips · game, variant, move count · one human-readable verdict when data allows (`Decided on move 34`) · a quiet `Saved to your profile` line with an inline **Public / Private** toggle.

A win earns one celebration: a single accent sweep across the card and the success haptic. No confetti, no particles.

Actions: **Play again** (instant rematch, same setup) · **New opponent** · **Watch replay** · **Share**. Share produces a designed image card, theme-aware, both outcomes: final board, scoreline, matchup, the mark. Losing to a frontier model is also shareable (`It took GPT-5 41 moves to beat me.`).

### 8.6 Replay of your own match

The Stage in replay mode (§9.2) with the model's reasoning per move. Reached from the result card and from your profile's match history.

### 8.7 Stadium records (human vs AI, from real matches only)

This is the one place numbers appear in Arena, and it exists only because the direction allows rankings that fall out of real match data. It is never sold as a leaderboard and never has a "climb the board" call to action.

- **The banner.** `Humans vs machines` · one big number: the share of Arena matches won by people, `All time / This week` segmented, per-game filter chips. Below it in mono: `1,204 matches · updated 2h ago`.
- **The gauntlet.** Models listed by how hard they are to beat: mark · display name · human win rate against it · matches in mono. Consumer framing: `Unbeaten by humans` · `Beaten 212 times`. Each row's only action is **Challenge**, which opens Arena with that opponent preselected.
- **Your standing** (signed in): your W / L / D, best game, last five as chips, your hardest scalp (`You've beaten Claude Opus. Most humans haven't.`).
- Gates: a game or model appears only above a minimum match count; the whole screen hides behind its entry points until there is real data. Timeout awards are excluded and the footnote says so. No percentiles, no ratings, no "Elo", nothing mixed with AI vs AI results.

### 8.8 Arena states

| State | Treatment |
|---|---|
| Signed out at Start game | The sign-in sheet; return to the identical setup afterwards. |
| Opponent not available for this game | Status word on the card; Start game disabled with the reason under it; the roster sheet offers Ready opponents first. |
| Engine busy or unavailable | The curtain-riser failure state (§8.3). |
| Session expired (7 days idle) | Resume card becomes `This match expired. Start a new one.` with the setup remembered. |
| Offline (app) | A quiet ribbon; Arena setup browsable; Start game explains it needs a connection. |
| Reduced motion | Previews show the final frame; moves and reveals snap; the clock still counts. |

---

## 9. Battlefield: the watch side

### 9.1 Battlefield landing (`/battlefield`, phone Battlefield tab)

Build from the Battlefield note's architecture, not from today's list-plus-viewer page. Four rooms, one hero:

1. **The Stage, already playing.** Full-width, above the fold. Auto-programmed: the live match if one exists, otherwise the freshest replay, quietly auto-playing at a calm cadence. There is no "select a match to begin" state and no empty viewer. The header reads the match's players, game and **date**. Tap or click: fullscreen.
2. **The marquee.** A rail (desktop) or vertical feed (phone) of living posters: a real mini board, the two models, an at-a-glance advantage read when the data exists, the **date**, and one line of stakes. Clicking a poster changes the channel: the Stage crossfades to it without a page reload. Posters animate only in view, one at a time.
3. **The programme.** The filterable list of every match, below the marquee or behind **See all matches**. Filters are for intent (game, models, outcome, date range, `close games only`) and collapse by default. Each row: game, A vs B, result, date, replay status (`Replay ready` / `Verified replay pending`).
4. **The box office.** **Request a match** as one calm door, not a loud primary: a sheet with game, two opponents, and a line: **Pick the card. We'll air it, and you'll get a note when the replay is ready.**

**Lanes.** Solo benchmark games (the twelve Control & Arcade games and Blackjack) appear in their own labelled **Benchmark run** lane, never mixed with head-to-head matches.

**Status strip.** Replace "0 live now" with honest state: when a match is live, a red dot and **Live now · Chess · Claude vs GPT-5**; when nothing is live, **Replays · last match 26 Jun 2026** in mono `--text-3`. The word live appears only when true.

**Streaming slots (design now, show only when real).** Staged order from the platform owner: on-site freshness and replay quality first, then YouTube VOD uploads of replays, then a Twitch live stream of matches, then X clips. Design two components that are hidden entirely until they have content: a **Watch live** slot above the marquee (an embedded stream card with the same seat-header anatomy and a **Open on Twitch** link) and a **Past broadcasts** shelf (video posters with duration and date, linking to YouTube). No placeholders, no "streaming coming soon" cards.

### 9.2 The replay page (`/battlefield/<match>`)

The shareable unit. Top to bottom:

- **Match header.** Game glyph, game name and variant · model A with provider mark · **vs** · model B · the result with the winner's name at weight 600 (`Claude Opus 4.8 wins · 41 moves`) · the **date** and duration · a copy-link **Share** button and **Share this turn**. The header is the Open Graph card too: completed matches get an auto-generated board-state image so every shared link carries the position.
- **Seat headers** per seat layout (two sides, compass, table ring, solo), each: provider mark, display name, model id in mono. The seat whose turn it is wears the accent underline.
- **The board**, maximal, per family.
- **The advantage instrument**, only when per-turn data exists; hidden otherwise (never "advantage pending"). In replay it carries a thin trace ribbon of the whole game's swing.
- **Transport**: restart · step back · play/pause · step forward · end, keyboard-operable (← → Home End Space), a speed control (0.5× 1× 2× instant), and the **filmstrip scrubber** with a tick per move and taller ticks at story beats. Dragging moves the board, the advantage, and the highlighted reasoning line in lockstep.
- **The reasoning ledger**: one row per turn: turn number in mono · the model's name (not "Seat A") · the action **in natural language** (`plays the centre square`, `drops a disc in column 4`, `bids three 5s`) · the public explanation in sans `--text-2`. A turn with no public reasoning is quiet, never a fake sentence and never a "no public reasoning attached" badge on every row. On phone the ledger is the scroll while the board stays pinned.
- **Next up** at the end of the page: three posters.

Phone layout per the Battlefield note §9: thin ribbon (back · game · live dot only if live) → seats as a compact facing pair → board filling the width, pinned → reasoning → transport in the thumb zone. Landscape allowed for watching.

### 9.3 Live match view

Same page, same Stage, with the live states from §8.4: the on-move seat activates, the deliberation clock fills, the reasoning line writes in first and then the piece moves, the advantage settles if data exists. The transport hides during live playback and returns on touch. A match that stops being live degrades to its replay with the date stamped.

### 9.4 Battlefield states

| State | Treatment |
|---|---|
| Nothing live, replays exist | Stage shows the freshest replay with its date; status strip says when the last match was. |
| Replay not yet verified | Its poster says **Verified replay pending**; the Stage never shows it. |
| Fewer than 3 matches on the slate | Marquee shows what exists; programme invites **Request a match**. |
| No matches at all | One calm empty card on the Stage: **No matches yet. Request the first one.** |
| Replay failed to load | The header still renders from metadata; the board area shows **Replay unavailable right now** with a retry and the share link intact. |
| Reduced motion | Autoplay off; the scrubber jumps between static frames; the live dot does not breathe. |

---

## 10. Grand Slams: the boundary

**Dates, fixed:** Monday 8 February to Sunday 14 February 2027. Finals Sunday 14 February 2027 at 19:00 Pacific (03:00 UTC on Monday 15 February). The December 2026 date is cancelled and must not appear anywhere, including copy inherited from the prototypes in the zip.

This brief designs only three things for Grand Slams:

1. **The teaser slot** (§7.4) on Home and its phone card.
2. **The nav entry**: `Grand Slams` in the desktop header; the trophy top-left on phone. `/grand-slams` is a one-screen teaser page at v1: the hero line **Grand Slams**, the date chip, the finals line with local-time conversion, a two-sentence description, **Get notified**, and the honesty line **Only confirmed entrants, brackets and results will appear here.** No format explainer, no seeded contenders, no bracket until they are real.
3. **Event mode** for the week: a slim ribbon under the chrome on Arena and Battlefield (`Grand Slams · Day 3 · Quarter-finals tonight 7:00 pm PT`) and a **Grand Slams** filter on the Battlefield programme. The matches of the day are ordinary Battlefield matches; the replays are ordinary replay pages. Nothing else changes.

Open question for the founder: the opening time on Monday 8 February. Until it is set, the countdown counts days, not hours.

---

## 11. Secondary surfaces

Built now, not the focus. Same chrome, same tokens.

### 11.1 Labs (`/labs`)

Replaces the dead page. A short page with three doors, each a card: **Watch a demo match** (deep-links a chosen Battlefield replay) · **Quickstart** (`pip install eslams-core`, run a match locally, open the replay; links to GitHub and PyPI) · **Visualise a replay** (drop a `.eslams` file, rendered in the browser, nothing uploaded). The third door ships only when built and is not shown until then. One line at the bottom: **Labs bring their own model keys. Nothing here stores a secret.** No demo wall, no feature grid.

### 11.2 Open source (`/open-source`)

The Open source door from Home, expanded: what Core is, the terminal, three links (GitHub, PyPI, the Hugging Face warehouse described as **the archive of past evaluation runs and results**), Contributing, licence. Historical results are mentioned here only as an archive, never as a product.

### 11.3 Profile (`/<username>`, `/profile`)

Identity block (avatar, username, member since) → overview strip (W / L / D, win rate by game as bars, favourite game) → **match history** where every row opens the replay Stage → public/private visibility of the profile and of individual matches. Followers and following remain if already shipped; nothing here ranks anyone.

### 11.4 Auth

Phone: a sheet, SSO first (Apple on iOS, Google, GitHub), then email; signup asks for a username only. Desktop: the existing split screen. Copy on the brand panel: **Welcome back.** · **Play frontier models, keep every match on your profile, share the scorelines.** Retire "Profile and replay uploads".

### 11.5 Settings

One screen, plain words: Appearance (System / Light / Dark) · Sound & haptics (two toggles) · Notifications · Account (email, password, linked accounts, sessions, via the existing flows; identity changes re-verify) · Your data (match visibility default, per-match toggles, delete account via the existing request flow) · Sign out. Nothing here should feel like a bank.

### 11.6 Legal, not found, offline

Same chrome. Not found: the canonical empty card with a **Back to the stadium** link. Offline (app): a quiet ribbon; cached replays play; Arena explains it needs a connection.

---

## 12. The board system

One system, twelve families, rendering identically on web and native. Marks, pieces and cards are content (drawn in `--text` and side-neutral fills); the accent is reserved for turn, last move and result. Full specs per family are in `09-reference-docs/DESIGN_NOTE_battlefield.md` §6; the touch-input column is from the mobile note §7. Games per family come from `05-data/game-catalog-50-games.json`.

| Family | Games | Framing | Arena input |
|---|---|---|---|
| `grid_3x3` | Tic-Tac-Toe, Ultimate Tic-Tac-Toe | Large centred lattice; Ultimate lifts the active local board | Tap a cell |
| `connect_four` | Connect Four | Seven wells, full width | Tap a column; press-and-hold previews the drop |
| `square_board` | Chess, Othello, Checkers, Shogi, Xiangqi (+ Battleship, Mancala, Nine Men's Morris, Pentago, Backgammon via `custom`) | Width-filling checker grid; flat side-coloured pieces; permissive SVG chess set | Tap piece → legal-move dots → tap target; drag optional |
| `go_board` | Go 9×9, Gomoku 15×15 | Stones on intersections; 15×15 gets pinch-zoom and a loupe | Tap an intersection |
| `hex_board` | Hex | 11×11 parallelogram, edges tinted per seat | Tap a hex |
| `card_table` | 16 card games (poker ×3, Bridge, Hearts, Spades, Euchre, Gin Rummy, Cribbage, Hanabi, Mahjong, Dou Dizhu, Goofspiel, Crazy Eights, Blackjack, Shedding) | Your hand fanned in the thumb zone, table centre above; hidden hands as backs with counts | Tap to select, tap again or drag up to play |
| `dice_table` | Liar's Dice | Cups in an arc, counts never pips | Stepper wheel for the bid; **Call** as the big moment |
| `payoff_matrix` | Prisoner's Dilemma, Rock Paper Scissors | Matrix centred; choices as large chips; simultaneous reveal | Tap a chip |
| `auction_panel` | First-Price Sealed-Bid Auction | Fintech-grade panel, sealed chips reveal together | Slider plus stepper; **Seal bid** |
| `economic_panel` | Negotiation, Bargaining | Offer cards stacked; convergence strip | Slider or stepper; **Propose / Accept / Reject** |
| `control_benchmark` | The twelve Control & Arcade games | Schematic scene, mono score, Battlefield only | Watch-only |
| `custom` | Battleship, Mancala, Nine Men's Morris, Pentago, Backgammon, Checkers variants | Family-specific boards already built in production; keep their visual language | Tap-based |

Shared across families: the last-move motif (arrive → one ring pulse → thin accent outline, exactly one at a time), the reveal choreography (crossfade and scale-settle, all seats on the same frame), the three motion beats (move 220 ms, reveal 300 ms, result 520 ms; Connect Four's move is 320 ms with the system's only gravity settle), reduced motion = static final state. Seat identity always carries a non-colour cue. Card and tile art in `04-game-art/`; provider marks in `03-provider-marks/`.

---

## 13. Copy deck

### 13.1 Verbatim lines

- `Here, AI plays games.` (hero H1, meta description, app store tagline)
- `No signup to watch.`
- `Think you can beat a frontier model?`
- `Play a frontier model, head-to-head. Pick a game, choose your opponent, and go.` (Arena sub, or the shorter Arena-voiced variant in §7.3)
- `Run the engine yourself.`
- `Only confirmed entrants, brackets and results will appear here.` (Grand Slams)

### 13.2 Vocabulary, locked

| Use | Never |
|---|---|
| Game (the public word; "fifty games") | arena as a synonym for game, "catalog rows", "arenas" |
| Arena (the play surface, capital A) | "the arena" for a game |
| Match (one contest) · Replay (its playback) | battle, battles, "Latest battles" |
| Battlefield (the watch surface, capital B) | Battlefield as a word for the matches themselves |
| Model, opponent, the model's display name | Seat A / Seat B in Arena; raw ids as the primary name |
| Live (only when a match is live right now) | live for roster size, "0 live now", "Watch live" over a replay |
| Records (real match results) | leaderboard, ranking, score, rating, Elo, evidence, official |
| Ready · Slower turns · Not available for this game · Coming soon | Gateway ready, Requestable, Verified playable, Untested, Locked |
| Grand Slams, 8–14 Feb 2027 | December 2026, "DEC '26" |
| Open source, Labs | research lab, Trinity, artifact (in consumer copy) |

### 13.3 Voice

Player language, sentence case, confident and a little playful in consumer surfaces, precise in anything with a number. No exclamation-mark pileups. Approved cheek, for Arena only: `Pick your game. Pick your victim.` · `Thinking… it's been 14 seconds. That's usually a good sign, for it.` · `You won. Somewhere, a datacenter is embarrassed.` · `It took GPT-5 41 moves to beat you. Make it 50 next time.` The cheek never touches the numbers.

### 13.4 Dates and numbers

- Dates are relative for recency (`2h ago`, `3d ago`) with the absolute date on hover or in the detail (`26 Jun 2026`). Beyond 30 days, show the absolute date outright. Day-month-year, British style, no ordinal suffixes.
- Times carry a zone (`7:00 pm PT`) and the viewer's local time beside them where it matters.
- Counts are real, derived, and dated (`1,204 matches · updated 2h ago`). No counts of simulations, providers, or anything not a played match, except "fifty games".
- Model display names: proper casing and punctuation (`Claude Opus 4.8`, `GPT-4o (May 2024)`, `Qwen3 235B A22B`), never separators turned into spaces.

---

## 14. Facts to design against (as of 30 September 2026)

From the catalogue (`05-data/game-catalog-50-games.json`), the live site, and the audits. Verify before relying on any that may move.

- **Fifty games** in four categories: Board & Strategy 16, Card & Hidden-Info 17, Social & Economic 5, Control & Arcade 12. Every game has exactly one variant token and a help block (objective, turn rules, legal actions, scoring, first-move tip).
- **Arena surfaces:** 13 main Arena games (Tic-Tac-Toe, Connect Four, Othello, Chess, Go, Gomoku, Hex, Ultimate Tic-Tac-Toe, Battleship, Goofspiel, Rock Paper Scissors, Prisoner's Dilemma, Sealed-Bid Auction); 18 advanced Arena games; 6 table-mode-pending games (Leduc, Limit and No-Limit Hold'em, Mahjong, Dou Dizhu, Bridge); 13 solo benchmarks (the twelve Control & Arcade games plus Blackjack) that are Battlefield content only. Seat layouts: two sides 31, solo 13, table ring 5, compass 1.
- **Engine dependency:** only Tic-Tac-Toe and Connect Four run without the Python engine container. Everything else can hit a cold or busy engine. Design for it (§8.3).
- **Roster today:** 313 opponents from 50 providers through the live API; every one reports available; named opponents cover 28 games; three "wildcard" entries cover all games. Several display names carry raw date suffixes. Summary in `05-data/arena-opponent-roster-2026-09-30.json`; provider list with hues and marks in `05-data/providers-90.json`.
- **Replays:** about 51 publicly ready replays out of 108 replay ids (9 September audit). The last completed platform match was 26 June 2026, so the home slate was 75 to 92 days old in September. A scheduled job will refresh it; design the stale and empty states regardless.
- **Streaming:** nothing is built; only broadcast placeholders exist in the data. Do not show streaming UI until real.
- **Replay data available per turn:** the action label, the model's public explanation (up to 6,000 characters), per-seat scores, terminal state, markers. **Not available:** per-turn advantage or win probability, per-move thinking time in persisted replays (live only), typed story-beat markers. Sample frames and reasoning in `05-data/sample-replay-chess/`.
- **Arena session facts:** one active human session per account; sessions wait for the human indefinitely (seven-day idle expiry); the model's hard timeout is 120 seconds, server-enforced, after which the player may claim the win and the result is labelled a timeout award.
- **Installability today:** no service worker, a 68 × 68 manifest icon, manifest start URL and scope "/", no store association files. §5.3 fixes the design side.
- **The old home page** (screenshots in `06-current-site-2026-09-30/`) still carries the leaderboard narrative, the evidence board, the 90-provider wall, the 713,339 count, and the December 2026 Grand Slams date. Treat it as the "before".

---

## 15. Accessibility, motion, performance

- Global 2 px accent focus ring on everything; no component suppresses it. Modals and sheets trap focus, close on Escape, and return focus.
- Boards are keyboard-playable on desktop and expose accessible actions per cell or piece on native; live regions announce moves politely (`Turn 14. Claude drops column 4.`).
- Tables and lists carry proper semantics; icon-only buttons have labels; seat identity never relies on colour alone.
- WCAG AA contrast in both themes; the known thin areas are `--text-3` on tinted surfaces and the muted win/loss on the advantage bar. Check every new tint.
- `prefers-reduced-motion` maps every beat to its end state: hero animation, previews, posters, the Stage, the splash, the accent sweep. Nothing is conveyed by motion alone.
- Dynamic Type and font scaling respected everywhere outside the board itself.
- Budgets: home first-load JavaScript under 180 KB gzipped; Arena under 350 KB; replay pages under 300 KB. Home never loads the Arena or replay player code; posters are static end-states with at most one small live island. Phone cold start to interactive under 2.5 s; one animating poster at a time; renderers lazy-load per family.

---

## 16. Handoff: what to produce

Design in both themes (light and dark), on both canvases (phone 390 × 844 and desktop 1440), every state named in this brief. Work strictly in the token set. Reuse the component anatomies from `09-reference-docs/COMPONENT_REFERENCE.md` where they still apply (buttons, tags, chips, badges, cards, section heads, inputs, the game tile, the terminal, the nav and footer). Propose the smallest possible set of new tokens.

1. **Chrome.** Desktop header and footer; the phone dock (rest, active, transition); top-corner entries; the now-playing bar; the Grand Slams event ribbon.
2. **Home.** All six movements (§7), with the slate's fresh, old and empty states; phone and desktop.
3. **Arena landing.** Resume card; the matchup stage with the rotating hero; the opponent module and the roster sheet (with search, grouping, status words, formatted names); side and seat pickers; the game grid with Active and Coming soon tiles; the records strip.
4. **The curtain-riser.** The four-step load screen, its expectation line, the 10 s and 30 s escalations, the failure state, the transition into the Stage.
5. **The Stage, play mode.** Portrait layout for the two-sides, table-ring and compass seat layouts; input overlays for the ten playable families; the thinking micro-states (clock, reasoning writes in, move lands); freshness states; premove; reconnecting ribbon; leave-match sheet; claim-the-win.
6. **The result.** Scoreline card for win, loss, draw and timeout award; the accent sweep; the share image card in both themes and both outcomes; the inline visibility toggle.
7. **Stadium records.** Banner, gauntlet rows with Challenge, your standing, the gated and empty states.
8. **Battlefield landing.** The auto-programmed Stage; living posters (rail and feed); the status strip in live and not-live states; the programme with its filter sheet; the box office sheet; the benchmark lane; the hidden-until-real Watch live slot and Past broadcasts shelf; all states in §9.4.
9. **The replay page.** Match header (and its Open Graph image), seat headers for all four layouts, board, transport and filmstrip, reasoning ledger in natural language, Next up; phone and landscape; live variant.
10. **Grand Slams.** Teaser card, teaser page, event ribbon, Battlefield event filter.
11. **Secondary.** Labs, Open source, Profile, Sign-in sheet and split screen, Settings, Not found, Offline.
12. **Installable web.** Maskable icons (192, 512, both backgrounds), splash, standalone-chrome back affordances.
13. **Boards.** Show at least the high-traffic families first (`square_board` chess and othello, `connect_four`, `grid_3x3`, `go_board`, `card_table` poker, `payoff_matrix`) in both Arena play mode and Battlefield replay mode, visibly the same board; then the long tail.

Name files by surface and state (`arena-stage-play-thinking-dark-phone`). Where this brief and an inherited note conflict, this brief wins; where this brief is silent, the inherited notes apply; where both are silent, choose the option that best fits "a calm, credible stadium that happens to contain live games", and say so.

**The measure of success:** a stranger opens eslams.com, sees two models mid-game with today's date on it, understands why one of them just moved, clicks **Play Against AI**, is seated against a frontier model in two taps and a few honest seconds, feels it think, and shares the scoreline. Nothing on the page claimed anything it could not show.

---

## Appendix A: the asset zip

```
eslams-stadium-design-assets/
├─ README.md                          index, what is canonical, what is superseded
├─ 00-brief/eSlams-Stadium-Design-Brief.md   this document
├─ 01-brand/                          mark + wordmarks (hi-res and web-optimised), social card, favicon, app icons
├─ 02-tokens/                         tokens.css (canon), game-motion.css, game-shell.css, table-games.css, components.css
├─ 03-provider-marks/                 61 provider SVG marks
├─ 04-game-art/                       playing-cards/ (52 + backs), mahjong-tiles/
├─ 05-data/                           game-catalog-50-games.json, providers-90.json, arena-opponent-roster-2026-09-30.json,
│                                     home-hero-animation-records.ts, sample-replay-chess/ (display frames, reasoning, result)
├─ 06-current-site-2026-09-30/        full-page screenshots of the live site: desktop light/dark, phone light/dark
├─ 07-prior-design-screens/           June web prototype renders, July mobile QA comparisons, early references
├─ 08-prototypes/                     runnable HTML: web-v4 (Arena rebuild), home-v2, mobile-v3, identity (auth/profile)
├─ 09-reference-docs/                 DESIGN_BRIEF (July), COMPONENT_REFERENCE, DESIGN_NOTE_battlefield, DESIGN_NOTE_home,
│                                     DESIGN_NOTE_mobile_app, TECH_NOTE_battlefield_visualization, onboarding/profile spec,
│                                     July mobile handoff spec
└─ 10-audio/                          the production move and result sounds, per family
```

## Appendix B: what in the inherited material is superseded

| Material | Still true | Superseded by this brief |
|---|---|---|
| `DESIGN_BRIEF.md` (July) | Principles §2, brand §3, tokens §4, vocabulary §5, a11y §10, performance §11, voice §12 | §6 header (no Leaderboard, no marquee box), §7 Leaderboard/Models/Provider/Game page anatomies, §8 data display rules (retired with the leaderboard), §13 gap list |
| `COMPONENT_REFERENCE.md` | Every recipe except the leaderboard table (§11) and the champion cards (§10) | Leaderboard anatomy, medal usage for ranks |
| `DESIGN_NOTE_battlefield.md` | The whole Stage system, families, motion, live and replay, mobile layout | Any "official score" or credible-interval copy in seat headers |
| `DESIGN_NOTE_home.md` | The living-poster movement (M1), the play band (M3), the games grid (M4), the open-source band (M5) | M2 (the leaderboard instrument) is removed; the Grand Slams date |
| `DESIGN_NOTE_mobile_app.md` | Splash, Stage, curtain-riser, haptics and sound grammar, result and share, Battlefield feed, settings | Two-tab dock (now three), the Humans-vs-Models board as a top-corner entry (now Stadium records inside Arena), the data pact screen, phone OTP, six themes, December 2026 |
| `onboarding-signin-profile-design.md` | Sign-in and settings anatomy | Trinity sections, three-step onboarding (now username only) |
| Prototypes (`08-prototypes/`) | Visual grammar, motion, the Arena stage, the result curtain | All leaderboard pages, all counts, "DEC '26", the six themes in mobile-v3, phone OTP screens |
