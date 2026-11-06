# Design Brief: the eSlams Arena app

**For:** Claude Design. **Status:** design intent, ready to design against. **Date:** 2026-09-30, revised 2026-10-01 and 2026-10-02 (the first-run journey: Welcome, Authentication, one-page Profile setup, Theme pick, personalised Home).
**Scope:** one native app (iOS + Android, Expo) that is **Arena and nothing else**: a human picks a table, seats a frontier model, and plays it turn by turn. No Battlefield, no leaderboard, no Grand Slams, no labs, no sponsors, no profiles-as-a-product.
**Reads with (in the asset pack):** `03-design-canon/DESIGN_BRIEF.md` (the house language; obey it), `COMPONENT_REFERENCE.md` (recipes), `DESIGN_NOTE_battlefield.md` §4 and §6 (the one board system the app inherits), `recommendations-for-arena.md` (game disposition and help content), `09-platform-reference/ARENA_PLATFORM_CONTRACT_DIGEST.md` (the code-verified reference behind every platform fact here), and the web Arena screenshots in `04-web-arena-today/`. On design, **this brief wins** for the app. On what the platform does, the digest wins.
**Sibling brief:** the eSlams Stadium brief (the whole site, web-first) was written the same day. This brief is deliberately narrower: it shares the Stadium brief's facts and vocabulary and does not adopt its scope.

---

## 0. The decision, in five lines

1. The Arena app is **the existing web Arena at eslams.com/arena, made good, as a native app**, reached through one journey: **Welcome → Authentication → Profile setup (new users) → Theme pick (app, once) → Personalised home → Play.** Same games, tables, seats, opponents and rules as the web.
2. **Welcome is the only signed-out screen** (§7.0): a weightless, interactive field of game pieces, the tagline and one button, `Play Against AI`. The app has no signed-out browsing surface; playing needs an account, so nothing else is designed for a visitor. A signed-out cold start and every logout return to Welcome.
3. **Authentication is the web flow in one step; setup is one page.** Same accounts and sign-in (Google, GitHub, email, plus the existing two-factor and session rules), re-skinned natively; Apple on iOS only if Ramu enables it (§4, decision 2). Existing players go straight to Home. New players get one Profile setup page (§7.0b): a generated handle and Public preselected, optional bio, location and favourite games, `Create account`. The web gets the same page. The server holds every provider key and secret; the client holds none.
4. **One theme pick, then a personalised Home.** After setup, six theme tiles with `Follow system` preselected and one tap `Continue` (§7.0c); afterwards themes change only in Settings. Six themes ship as materials: Classic Light and Classic Dark follow the OS; Neon, Club, Arcade and Midnight are fixed skins (§6.1). Home opens on the first favourite game with a `Ready` opponent and `Play now` (§7.2).
5. **We leave every past mistake behind** (§3). Arena-only scope. No phone verification, no device attestation, no watch-first landing, no signed-out feed, no theme choice before authentication or in place of play, no onboarding wizard, no social graph, no notification centre.

---

## 1. The essence

> **You open the app and a weightless field of chess pieces, Go stones and poker chips drifts in the dark, and over it one line: *Here, AI plays games.* One tap on `Play Against AI`, one sign-in, and a single page that already knows your handle; you tap the games you like, then `Create account`, then a theme. Your first favourite is waiting, a frontier model seated across from it, the status line saying it is ready. You tap `Play now`. The model takes its seat, visibly thinks, drops a disc, and tells you in one sentence why. You answer. Ten minutes later a scoreline rises over the final position: "You won. Somewhere, a datacenter is embarrassed." You share it. Tomorrow the table is already set.**

That is the whole app. One verb: **Play**. The way in is one door (Welcome, one sign-in, one page of setup, one theme tap); everything after it (settings, your past matches) is support cast reached from one corner.

Time-to-first-move is the product metric. Returning player: **two taps** (Play now, then your first move). New visitor: **under sixty seconds from Welcome to first move, including sign-in, setup and the theme pick**; every screen before the board is one tap when the defaults are right.

The strategic reason the app exists (context, not copy): mass human-vs-model game volume. Every decision should cut time-to-first-move, make finishing feel great, and make sharing irresistible. A played game is the product.

---

## 2. What Arena is, and what the app is not

### 2.1 What Arena is (the web, today)

Arena is where a visitor plays a game against an AI model. The web setup reads top to bottom: **"Pick your table, seat your opponents, and play a frontier model turn by turn, in the browser."** Then one card for the selected arena: name and variant in mono, **How to play**, **Choose your table** (only when the arena has more than one), a static preview tile (the web has no animated setup board), **You vs Model**, an **Opponent** module ("Model roster · 313 live", "36 shown opponents", Shuffle, model rows with a "27 games" or "All games" coverage line), **Choose your side** ("You move first" or "Model moves first"; Red "Drop first." / Yellow "Model drops first."), or for tables a **seat ring** ("Seat 1 · you", "Seat 2 · tap to swap", "Your seat" 1 to 4 with "You open" / "Model opens", "Auto-fill table", "3 model seats · Ready"), then **Start game** over a readiness line ("Connect Four · Ready" or "Choose a live model"). Below it: **Choose an arena** ("37 live games · 24 arenas"), category chips, and tiles naming each arena and its tables ("Chess · 3 tables · Chess / Shogi / Xiangqi").

Pressing Start on the web opens `/arena/play`, a launch card with a **second** Start button. That press fires the sign-in gate: a full-page redirect to `/login` that remembers the setup and auto-starts after sign-in. The app needs no gate at Start: every player is signed in before Home (§7.0a), so one Start starts. The web's rule survives only for an expired session: sign in again, return to the exact setup, start automatically (§7.5).

The web page rotates its default arena on each visit (Tic-Tac-Toe, then No-Limit Hold'em, Connect Four and Chess) and randomises the default opponent per browser tab. The app replaces that roulette with the player's favourites and memory (§7.2).

**The grammar of arena, table, seats, opponent, start is the contract.** The app keeps it exactly. The exact catalogue, seat counts, side rules, and renderer families are in Appendix A; the session lifecycle and every state the UI must handle are in Appendix B.

### 2.2 What the app is not (the cut)

- **No Battlefield.** Model-vs-model spectating stays on the web. The only "watching" in the app is (a) the living previews (Welcome's background match, the Home hero and each table sheet; engine-recorded sequences) and (b) replays of **your own** matches.
- **No leaderboard, no Official Score, no credible intervals, no Grand Slams.** Not even a strip. The public leaderboard product is being retired on the web too, so there is nothing to link to. Grand Slams runs 8 to 14 February 2027 on the web. The December 2026 date is cancelled: the canon docs in the asset pack still carry "DEC '26", and it must be ignored.
- **No profiles as a destination.** No public profile pages, follows, follower approvals or people search. The player has an identity (avatar, username) and a match history; that is all the app shows.
- **No notification centre, no Trinity console, no request-a-match, no offline replay cache, no model or provider pages, no game encyclopedia.**
- **No phone verification, no device attestation, no SMS codes.** Ever again. (Two-factor stays, exactly as the web has it.)
- **No signed-out browsing.** The only pre-auth screen is Welcome (§7.0); a visitor opens no table, roster or rules sheet without an account. No coach marks, no data-pact wizard. After setup comes one theme pick (§7.0c), one tap, once; afterwards themes change only in Settings.
- **No tab bar.** An Arena-only app has one destination. A dock with one item is a confession.
- **No web parity pressure in either direction.** The app may do what the site cannot (fullscreen Stage, haptics, native sheets) and skips what it has (nav, footer, search, the "Human vs Model board" link). They share accounts, an API, a vocabulary and a board system, not a sitemap.

**One decision for Ramu (§4, decision 1):** the web Arena's "Human vs Model board" button is a plain link to `/leaderboard`, which opens on the model evidence board; its "Human vs model" tab is a static placeholder ("No public human-vs-model history is published."). That leaderboard product is being retired, so the link points at a page that is going away. The server's human rating (`human_model_arena_bayesian_v2`) **counts mobile matches only**, so app matches will feed whatever replaces it. v1 ships with no board and no link; the result card shows only the player's own record.

---

## 3. What we are leaving behind

The previous app (prototype v3, the Expo build in `apps/mobile`, and its three plans) taught us more than it shipped: **113 commits in eleven days** (21 July to 1 August 2026), opened by a 161,000-line import and closed by forty fixture-driven fixes in one day. Of roughly 43,000 lines of app code, about **10,400 are Arena** and about **16,800 everything else** (Battlefield, social, notifications, offline cache, ratings board). Nineteen database migrations followed the mobile plan; 0058 had to undo 0057. Each row is a mistake, its cost, and the rule it becomes.

| # | What we did | What it cost | Rule for the Arena app |
|---|---|---|---|
| 1 | **Watch-first landing.** Cold launch redirected to Battlefield; a coach mark pointed at Arena; every auth callback landed on Battlefield. | The app opened on a surface we no longer ship. Conversion to play hung on a tooltip. | **The signed-out app is a welcome, not a feed.** Welcome shows one real match behind glass and two doors (§7.0); authentication lands on the personalised Home with `Play now` one tap away, never on a feed. |
| 2 | **Phone OTP and device attestation** (Firebase phone auth as a login lane *and* an Arena gate; App Attest and Play Integrity in provenance; a `NOT NULL` evidence column; ratings only for attested seats). | Twenty of the 113 commits. Removal took a 303-file commit deleting 14,000 lines, a rebuild-and-copy migration, a lockstep deploy and a force-update. On the way out: session bind would have returned 409 for every install, Arena start and completion threw and stuck sessions, the Humans ladder would have frozen silently, account deletion failed closed, and the core match-intent code lived in the phone-verification folder. | **Auth is the web's Better Auth session and nothing else.** No verification lane, no identity proof, no evidence column. Match start depends on a session and nothing more. |
| 3 | **Scope creep around the thesis.** A three-lens Bayesian Humans-vs-Models board, follows with private-profile approvals, blocks and reports, unified notifications with a planned Trinity console, an encrypted offline replay cache, request-a-match, people search. The design note had said "nothing else" and "mid-match within sixty seconds". | A social graph, a notification service, store moderation requirements, and an offline cache that did not read offline until the day before the freeze. The Trinity console was never built. | **Arena only.** Anything that is not setting up, playing, finishing or replaying your own match is out. |
| 4 | **A theme screen as the front door.** The six material themes were sound; making the theme choice the first thing on install, before sign-in and before any board, was not. | Seven Skia canvases on first install before any board, and the test matrix that screen forced onto first run: seventy-two family-by-theme golden images and per-theme contrast retuning gating the first move. | **Never put a theme choice before authentication or in place of play; one tap after setup is fine.** The Theme pick (§7.0c) comes once, after Profile setup, with `Follow system` preselected so `Continue` needs no choice; mini boards are static. Afterwards Settings only. |
| 5 | **The game count drifted: 50, then 37, 38, 36 and 35.** The prototype counted Blackjack as a card game until Core made it a one-player score game; two product exclusions sat on top. "35" is still typed by hand in eight places (store listing, QA assertions, Maestro flows, docs). The web shows 37. | Every surface disagreed with every other; a core test sat red for three days. | **Counts are derived from the catalogue manifest and never typed.** The design shows a count slot, and copy never states a total. |
| 6 | **Design artefacts drifted from the build.** Centred wordmark vs title-plus-search header; chips vs dividers; "Openai" from a capitalised slug; raw ids such as "Anthropic Claude 3 5 Haiku 20241022 V1:0"; a light `--text-3` unlike production; confetti against the note's "no particles"; QA screenshots never recaptured. | Each divergence became a QA argument instead of a product decision. | Design against **production tokens** and the **web's vocabulary**. Display names come from the catalogue. Every mockup state is one the API can produce. |
| 7 | **Store blockers found late.** Apple Developer enrolment and Sign in with Apple (App Store rule 4.8), blank universal links, a web-only privacy policy, an age-verification item past its 31 August target, and a content-rating questionnaire declaring simulated gambling because Hold'em and Blackjack play for chips. | Launch plan steps 22 to 29 exist only to pay this debt; the GitHub lane was removed and re-added on the way. | Design assumes the store rules from day one (§4). Chips are a scoring unit, never currency; Blackjack stays out. |
| 8 | **The model-timeout dead end** on the old web: a "still thinking" message whose only action was to reload the game. | The worst possible outcome of a long think: a dead end. | **Escalate, never dead-end.** The server's stages at 10s and 30s, then **Claim the win** at its 120s hard cap (§9). |
| 9 | **Fake precision in prototypes.** A Tic-Tac-Toe preview that drew a winning line through a draw; an RPS preview the human always won; an advantage bar implying an evaluation nobody computed; a now-playing bar labelling the opponent by raw id. | Players who know the game notice, and trust is the brand. | **Every scripted preview is an engine-recorded legal game. No advantage bar until the data exists. Display names, never ids, face the player.** |
| 10 | **Three-screen onboarding.** After sign-in: username, then profile details, then a review with visibility; this brief's first draft kept it because the web had it. | Three headings, a bio step and a review step before a single move. | **One page, required fields first, optional below, then play.** A generated handle and Public preselected are the required block; bio, location and favourite games sit below, labelled optional; `Create account` works with them empty (§7.0b). |

What the old work got **right**, and what this app keeps: the one board system across all renderer families, drawn by Skia from pure render plans with semantic-before-pixel goldens; the derived capability manifest and its "no second game list" rule; the reasoning line as the voice of the match; the result as a curtain over the final position; honest curtain-riser states for a cold engine and a slow model; one active session with an atomic replace; WebSocket state with poll fallback; the two-tone disc with an interior ring for colour-blind safety; haptics as three notes; the recorded per-family arrival sounds; the production icon pipeline.

---

## 4. Decisions ledger

**Settled (do not relitigate in the design):**

| Decision | Value |
|---|---|
| Scope | Arena only: setup, play, result, your own replays, and a minimal account surface. |
| Welcome | The only signed-out screen (§7.0): the weightless field of the app's own pieces, the wordmark, `Here, AI plays games.` and one button, `Play Against AI`. A signed-out cold start and every logout land here. No signed-out browsing anywhere in the app. |
| Auth | One step (§7.0a): the platform's existing Better Auth flow (Google, GitHub, email+password, two-factor with authenticator or recovery code, forgot/reset), rendered natively with the same copy. GitHub and Google sign in through the system browser with Better Auth's Expo client (Appendix E). Existing players go straight to Home; new players go to Profile setup. Apple is not on the web: its sign-in surface was removed on 18 Aug 2026 (decision 2). |
| Onboarding | One page, not a wizard (§7.0b). Required: handle (prefilled with a generated on-brand handle such as `quiet-rook-42`, a shuffle button, the `eslams.com/<handle>` preview) and visibility (Public preselected). Optional, labelled: bio (160 characters), location (type-ahead over a bundled place list, free text allowed), favourite games (tiles from the catalogue, any count). `Create account` enables once handle and visibility are valid; empty optional fields are the skip. No gender, no website. The platform ships the same page on the web (Appendix E). |
| Theme pick | App only, once, after Profile setup (§7.0c): six tiles with real mini boards, `Follow system` preselected, one tap `Continue`. Never before authentication, never in place of play. Afterwards Settings only. |
| Personalised home | The hero is the first favourite game with a recommended `Ready` opponent and `Play now`; then `Your games` (the favourites); then `Choose your game` (§7.2). No favourites: Tic-Tac-Toe (or the catalogue's most played once that exists). The Resume card outranks everything while a match is active. The brand beat lives on Welcome, not on a splash. |
| Navigation | No tab bar. One home surface, fullscreen Stage, sheets for setup, a single avatar corner for account things. |
| Themes | Six themes as materials, not palette swaps (§6.1). Classic Light and Classic Dark follow the OS; Neon, Club, Arcade and Midnight are fixed skins, chosen once in the Theme pick after setup (§7.0c) and afterwards only in Settings under Appearance (§7.10). Themed alternate app icons return as an Appearance option; the store icon stays brand blue. |
| Boards | The shared eSlams board system (renderer families from Core, `DESIGN_NOTE_battlefield.md` §6), drawn by the Skia renderer. Same board as the web, with touch input. |
| Opponents | The platform's full roster (313 on the web, labelled "313 live" there; the app says `<N> models`, never "live"), presented in the opponent picker (§7.12): four recommended, filters, search and `Shuffle`. Status vocabulary: `Ready` · `Slower turns` (the worker's `turnSpeed`: a slow latency tier or a median turn over 7 seconds) · `Not available for this game`. **Hidden-information games (22 of 37: every Card and Social table plus Battleship) can be played by only four models today**, so their roster is short by design, never padded. |
| Game-card system | One game card and one match card everywhere (§7.11): glyph tile, name, table label in mono, a real mini board; a match card adds participants, one status chip and relative time. Three actions, three looks: **Play** (accent fill), **Resume** (accent soft), **Watch** (outline, replay icon). Never a bare text link for a game action. |
| Opponent picker | A stage, not a dropdown (§7.12): a full sheet with a `Recommended` row of four large cards, filter chips (`Ready` · `Fast` · `Frontier labs` · `All`), search, then the roster grouped by provider with logos. The chosen model pins to the table sheet as `Your opponent`; tables use the same picker per seat. |
| Tables | Multi-seat table games keep the web's seat ring: you take one seat, models fill the others, each seat tappable to swap, Auto-fill available. |
| Match timeouts | Server-authoritative: a model turn escalates at 10s and 30s, and the 120-second hard cap exposes **Claim the win**. That result is labelled, kept as evidence, and counts toward neither profile stats nor the server's human rating. Human inactivity expiry is seven days. |
| One active session | One active human Arena session per account across web and app. Starting a new one replaces the old one atomically, after an explicit confirm. |
| Honesty | No fake spinners, no "live" over stale data, no invented advantage, no vanity numbers. Anything shown as a number comes from real matches, with a date. Unverified says so. |

**Final polish round (2026-10-02).** `FINAL_POLISH_BRIEF_welcome_auth_home.md` supersedes this brief wherever they differ; these decisions are settled for design.

| Date | Decision | Value |
|---|---|---|
| 2026-10-02 | First-run themes | Before any theme is chosen, Welcome, Auth and Profile setup render in Classic Light or Classic Dark by the phone's appearance; Pick a look is the first place the six appear (§6.1). Open: a later Welcome after sign out adopts the stored theme (designer's reading, to confirm). |
| 2026-10-02 | Scoped gradient exception | Atmosphere gradients exist only on the Welcome, Auth and Setup scene background plane; controls stay flat; the field is the one exception to "nothing else loops" (§6.1, §8). |
| 2026-10-02 | Welcome | The weightless field of the app's own pieces, wordmark, `Here, AI plays games.` and one button, `Play Against AI` (§7.0). No count line, caption, second button or recorded board. Mood reference: Google Antigravity site, never copied. Open: Title Case on this one button stays a one-off exception to sentence case. |
| 2026-10-02 | Auth | A full page, not a sheet; Google, GitHub, Apple (iPhone), then email, equal weight; email-first with a lookup branch; the account decides the route (§7.0a). No Sign in / Create account toggle. Open: the email lookup reveals whether an account exists and needs a security review (rate limiting, enumeration); open: Sign in with Apple ships only if the platform re-adds the provider (decision 2, rule 4.8). |
| 2026-10-02 | Profile setup | Helper lines and subtitle removed; the preview ends at `eslams.com/<handle>`; dynamic, specific handle errors replace the preview; forgiving typing; `Create account` disabled while invalid with no extra text (§7.0b). |
| 2026-10-02 | Home | `Choose your game` sectioned store replaces the chip-filtered grid: Recommended for you (on device, never labelled AI), Start here, the three categories, `See all`, poster rail cards and a wide spotlight card; no footer line; hero `Change opponent` / `Change table` edge-aligned with Play now (§7.2). Open: `Popular` replaces `Start here` only when the platform reports real play counts. |
| 2026-10-02 | Settings | About loses the eslams.com watch line (§7.10). |
| 2026-10-02 | Web mirror | Whether the web platform's onboarding should mirror this is out of scope; flagged only. |

**Open, for Ramu (design the slot, do not block on the answer):**

1. **Human vs Model board.** The web Arena's link points at the public leaderboard, which is being retired. This brief ships v1 without it. Keep it out (recommended), or add one link-out to whatever replaces it on the web?
2. **Sign in with Apple on iOS.** Apple's store rule 4.8 applies when an iOS app offers third-party sign-in such as GitHub or Google. The web no longer has Apple: commit `87b4b0be` on 18 Aug 2026 removed its sign-in surface (buttons, Better Auth package, custody and unlink code). Offering it on iOS means re-adding a Better Auth provider, a product decision for Ramu that the design may not assume. Recommendation: design the button as a reserved slot at the end of the iOS provider list, shown only if the provider returns, and confirm the rule 4.8 position before any App Store submission.
3. **Themed alternate app icons.** Settled on 2026-10-01: the six themed alternates return as an App icon choice under Appearance (§7.10); the default icon and the store icon stay brand blue. Kept here so the numbering holds.
4. **Push.** v1 ships none. The one worth having later: "Your rematch with GPT-5 is waiting." when an active match has sat unfinished for 24 hours. Park.
5. **Blackjack.** Core defines it as a one-player score game against the house; the web does not seat it in Arena. Keep it out of the app too (recommended), or design a dealer table?
6. **Chips and the content rating.** The old store questionnaire declared simulated gambling because Hold'em and Blackjack play for chips. The design position: Blackjack stays out, and chips are strictly a scoring unit (no buy-in, no cash words). The rating itself needs Legal and Compliance review before any public submission.
7. **Web-started sessions on the phone.** The web resumes a mobile-started match with no channel check. The existing mobile client offers Resume only for mobile-channel sessions; a web-started active match gets "Exit and start" or "Back". Recommendation: the app's Resume card shows a web-started match read-only (`Playing on the web. Finish it there or end it here.`) rather than hiding it. Confirm.
8. **Two tables the mobile manifest excludes.** The mobile capability list drops Leduc and the Rank & Suit shedding table (35 playable, against the web's 37), so on the phone Poker and Shedding show two tables each. Keep the exclusion, or re-enable them? The design shows whatever tiles the manifest returns.
9. **The web's signed-out home.** Should the signed-out web home also become Welcome → Auth? The platform PR does not touch it: the web home belongs to the Stadium brief, so this is Ramu's call. The app's Welcome stands either way.
10. **Final polish round.** Stored theme on Welcome after sign out; email-first lookup and enumeration risk; Sign in with Apple (see 2); `Popular` needing real play counts; Title Case on `Play Against AI`; web onboarding mirror out of scope. See the dated entries above.

---

## 5. Vocabulary (fixed)

Use these words and no others in product copy. They are the web's words.

| Term | Meaning |
|---|---|
| **Arena** (capital A) | The product surface. Also, on the picker, a family tile: "Chess · 3 tables". |
| **Table** | One playable ruleset inside an arena. Its name is the web's short label where one exists ("No-Limit Hold'em", "Ultimate"), otherwise the web's Title Case **variant** label ("Standard", "Board 9x9"). The engine's variant token (`core_compact_holdem_fixed_menu_no_limit`) appears only in mono on the how-to-play sheet. |
| **Seat** | A position at a table. The web's labels: "Seat 1 · you", "Seat 3 · tap to swap"; Bridge seats are North / East / South / West. |
| **Side** | For two-sided games: X / O, Red / Yellow, White / Black, Black / White, First / Second player, Player A / B, Seat A / B. "You move first" / "Model moves first". Side labels appear on the side picker only; seat bars and the result always name You and the model. |
| **Opponent**, **Model roster** | The model(s) across the table and the full list of them. Never "bot", never "AI player". |
| **Match** | One played game. **Replay** is its turn-by-turn playback. Never "battle". |
| `Ready` · `Slower turns` · `Not available for this game` | The only three opponent statuses in the app. The canon's fourth, `Coming soon`, has no use here because the app shows nothing unplayable. Never "Verified playable", "Requestable", "Gateway ready". |
| **Claim the win** | The human outcome of a model timeout. Footnote: "Doesn't count toward your record. The model never took its turn." |
| **How to play** | The rules sheet: folded to Quick summary · Your turn · First move, expanded to the eleven mobile rule sections (Appendix D). The web modal's four headings (Objective · Your turn · Legal actions · Hidden information) and tip line are a subset. |
| Categories | Exactly: **Board & Strategy · Card & Hidden-Info · Social & Economic.** Control & Arcade games are not Arena content. |
| Model names | Display names from the catalogue's `publicName`, formatted properly ("Claude Haiku 4.5", "GPT-4.1 mini", "Gemini 2.5 Flash"); the raw id (`anthropic/claude-haiku-4.5`) in mono where it adds meaning. Provider names come from the catalogue ("OpenAI", never "Openai"). |

Retired words: battle, Elo, rating (for models), sweep, locked (use `Not available for this game`), live (as a status, or for roster size), refresh, bot, Verified playable, Requestable, Gateway ready, and arena as a synonym for a single game in body copy.

---

## 6. Visual language

Inherit `DESIGN_BRIEF.md` §2 and §4 wholesale: clean, modern, AI-native, never cyberpunk; one accent; colour is information; hairline borders; quiet surfaces; sans for everything human, mono for everything a machine produced (ids, counts, clocks, turn numbers, variant tokens); outline icons; no emoji; no gradients on controls; shadows as whispers.

### 6.1 Themes
Six themes ship, and they are materials, not palette swaps. A theme is three layers: tokens (colour), material (what the board and cards are made of) and ink (how pieces are drawn). Renderers keep their geometry, motion and layout in every theme. Win, loss and draw re-tune per theme but never re-map; each theme has exactly one accent.

| Theme | Scheme | Board surface | Ink | Card face / back | Glow |
|---|---|---|---|---|---|
| Classic Light | light, follows the OS | flat (`--board-bg`) | flat discs, hairline rim | white / `--surface-3` | none |
| Classic Dark | dark, follows the OS | flat (`--board-bg`) | flat discs, hairline rim | `--surface` / `--surface-3` | none |
| Neon | dark, fixed | glass: a near-black vertical gradient | light-tube strokes | `--surface` / near-black | accent moments only |
| Club | light, fixed | wood: a maple stripe with pale cells; green felt under card tables | lacquered discs (top rim light, soft shadow) | cream / brass | none |
| Arcade | dark, fixed | phosphor: deep green-black | phosphor-green strokes | `--surface` / deep green | accent moments only |
| Midnight | dark, fixed | void: true black, the board floats | floating discs, faint rim | `--surface` / `--surface-3` | none |

- **Classic Light** and **Classic Dark** come from `02-tokens/web-tokens.css` (production is canon; `--text-3` is `#666672` light / `#9a9aa5` dark). They follow the OS by default (`Follow system` in Settings). Their plane is the flat `--board-bg` and their cards are `--surface`, so adopting the material layer moves no Classic pixel.
- **Neon, Club, Arcade, Midnight** are fixed skins: once chosen they ignore the OS. `prototype/research/six-themes.css` is the token source for these four and for the material tokens (`--theme-plane`, `--theme-card-face`, `--theme-card-back`, `--theme-card-table`, `--glow`, `--mark-ink`, and `--win-text` / `--loss-text` / `--draw-text` for status colour as text), built from `02-tokens/mobile-six-themes.ts`, whose names map one-to-one to `02-tokens/mobile-theme-contract.ts`. Design nothing that only works in one theme.
- **Glow budget.** `--glow` is `none` in every theme except Neon and Arcade, and there it lands only on accent moments: the last-move outline, the active seat's underline and the result's accent wipe. Buttons, text, pieces, chips, cards and chrome stay flat everywhere. The Classic pair never glows.
- **Gradients** appear only as board and card material planes (Neon's glass, Club's wood stripe and felt) and, as the one scoped exception, as atmosphere on the Welcome, Auth and Profile setup scene background plane (§7.0, §8). Never on controls, which stay flat.
- **First-run themes.** Before any theme has been chosen, Welcome, Auth and Profile setup render in Classic Light or Classic Dark by the phone's appearance; no Neon, Club, Arcade or Midnight can appear before the player has chosen one. Pick a look (§7.0c) is the first place the six appear. After a theme is chosen, a later Welcome (after sign out) adopts the stored theme, because it is the player's own choice (open item, §4). The scene is token-driven, so it works in all six themes; Classic Light and Classic Dark are fully art-directed, the other four are verified.
- **No move trail in v1.** The token source declares one for Arcade; v3 never rendered it, and it would break the one-marker rule (§6.5). Arcade keeps its phosphor plane and accent glow.
- **No confetti** in any theme. The accent wipe stays the one celebration (§7.8).
- **Contrast** (`--text-3` on `--surface` / `--text` on `--bg`, AA 4.5): Classic Light 5.66 / 19.66, Classic Dark 6.71 / 16.73, Neon 4.79 / 17.21, Club 5.27 / 12.87, Arcade 5.94 / 18.24, Midnight 4.60 / 14.93. All pass. Thin spots: `--text-3` on `--surface-3` measures 4.27 in Neon, 4.22 in Club and 4.19 in Midnight, and on `--surface-2` 4.42 in Midnight; never set `--text-3` there in those themes, promote it to `--text-2`. `--win` and `--draw` fail as text on light surfaces, so text always uses the `-text` tokens.
- Classic Dark `--text-on-accent` stays `#ffffff` to match the production web tokens (the mobile token package used `#0b0b0d`); noted, not changed.
- Dark is primetime for play; every theme must be equally complete. The board is lit by its own tokens and contrast; where glow exists it marks an accent moment and never lights the board.

### 6.2 Brand
The mark (`01-brand/mark.png`) is the app icon, the splash, and the share card signature. Deep royal blue `#1b32c4` (the PNG's real fill is `#102fa4`; exports match the file). Never outline, shadow, or gradient it. **Re-tint rule:** the Classic pair never re-tints it. Neon, Club, Arcade and Midnight tint the in-app mark (Welcome and the Home header) and the share-card mark to the theme ink (`--mark-ink`, the theme accent) as one flat colour, masked from the same file so the geometry never changes. The splash, the app icon and the store icon stay brand blue in every theme. The wordmark flips polarity with the theme's scheme: dark text in Classic Light and Club, light text in the other four. In the app the mark appears exactly four times: splash, Welcome, Home header, share card (plus the icon previews in the App icon choice, §7.10).

### 6.3 Type
Inter (the app already loads `@expo-google-fonts/inter`) for sans; JetBrains Mono or the platform mono for machine facts. Scale from the old handoff holds: screen title 22/650, section 16–17/650, result headline 28–30/650 with −0.02em, body 13–15, mono eyebrow 10–11 uppercase at 0.12em, mono data 10–12. Tap targets never below 44pt. Dynamic Type respected everywhere except inside the board.

### 6.4 Identity chips
Provider avatars use the real provider logo SVGs (`01-brand/provider-logos/`, 61 providers) inside a rounded square on a tint of the platform's provider hue (`providerColor`, `oklch(0.62 0.13 h)`; the web Arena's own dot uses `oklch(0.46 0.16 h)` on a 14% tint); fall back to the provider's initials when no logo exists. You are always rendered as the accent-tinted "You" tile; the model as its provider tile. The matchup reads from typography and one accent underline, never from a VS flash.

### 6.5 Boards
One board system, eleven Arena renderer families (the twelfth, `control_benchmark`, is not Arena content), inherited from `DESIGN_NOTE_battlefield.md` §6 and drawn by the Skia renderer. Calm instruments: large rounded cells one step lighter than the surface, hairline grid, generous gaps, faint desaturated-accent dots on empty cells, the last move marked by **arrive, one ring pulse, then a thin accent outline**, exactly one last-move marker at a time. Pieces are content in `--stone-*` and seat-neutral fills; the accent is reserved for turn, last move, and result. Connect Four discs carry an interior ring shape cue so the matchup survives colour-blindness. Themes change the plane, cell tone and ink (§6.1), never geometry or the marker rule. Hidden information is face-down and shows count only. Simultaneous reveals (RPS, sealed bid, showdown) reveal every seat on the same frame.

Per-family phone framing and touch input are in Appendix A.

---

## 7. Information architecture and screens

```
Launch (native splash)
├─ Welcome                          (signed out only; cold start and every logout land here)
│  └─ Authentication [sheet]        (Google · GitHub · email · two-factor; existing players → Home)
│     └─ Profile setup              (new players only; one page) → Theme pick (once) → Home
└─ Arena Home                       (signed in; personalised; the only destination; scroll)
   ├─ Resume card                   (only when an active match exists)
   ├─ Hero                          (first favourite + recommended Ready opponent + Play now)
   ├─ Your games rail               (the favourites, as game cards)
   ├─ Arenas grid                   (Choose your game: Recommended, Start here, three category rails, See all)
   ├─ Table sheet  [bottom sheet]   (choose table · preview · how to play · opponent/seats · side · Start)
   │   ├─ Opponent picker [sheet]   (recommended · filters · search · roster by provider; or a seat)
   │   ├─ How to play [sheet]
   │   └─ Auth page [fullscreen]     (only when the session has expired at Start)
   ├─ Stage · play   [fullscreen]   → Stage · result [fullscreen]
   ├─ Stage · replay [fullscreen]   (your own matches)
   └─ Avatar corner  [menu]         → Your matches · Settings · Sign out (→ Welcome)
```

Design canvas: **390 × 844 pt** (iPhone 13 class, the Stadium brief's phone canvas), portrait-first, safe areas 47pt top and 34pt bottom; also show one Android frame (412 × 915) for the Stage. Side padding 18pt on scrolling screens. Everything is flex and gap, never margin chains.

### 7.0 Welcome (the only signed-out screen)
The first impression, and the one place the app must feel like a consumer gaming app: premium, calm, a little magical, weightless. Full-bleed, no chrome, no scroll. Mood reference only: the Google Antigravity site (objects drifting in a gravity-free field, depth, soft light). Never copy its look, layout or assets. Never cyberpunk or sci-fi cliché (no HUD lines, lens flares or neon grids). It stays AI-native, clean, confident and unmistakably eSlams, in the app's own mark, board and piece language.

**Content (this is all of it)**
| Element | Spec |
|---|---|
| Mark + wordmark | The existing mark and wordmark, the hero of the upper third. The mark settles (600 ms), the wordmark fades in. Polarity by scheme as before. |
| Tagline | `Here, AI plays games.` (28/650, tight tracking). Unchanged from the voice note. |
| Primary button | One button: **`Play Against AI`**. Full width, 56pt, thumb zone, `--accent` fill. Title Case with every word capitalised is a deliberate one-off exception to the app's sentence-case rule, for this button only (open item, §4). Fallbacks if it does not fit the voice: `Get Playing`, `Start Playing`, `Challenge an AI`. |

Welcome carries nothing else: no statistic, no manifest dependency, no caption, no second button, no board behind glass, no legal or helper text. Two doors become one: there is no browse link, no guest mode, no skip, and no separate Create account or Sign in choice. The account decides the route (§7.0a).

- A signed-out cold start (first install included) and every logout land here; a signed-in cold start goes to Home and never sees Welcome. This is where the brand beat lives (§7.1).
- Theme: before any theme has been chosen Welcome renders in Classic Light or Classic Dark by the phone's appearance; after a theme is chosen, a later Welcome adopts the stored theme (§6.1, open item).
- Offline: the button disables and reads `Back online to sign in`.

**The scene: the weightless field (§3.3 of the final polish brief)**
A full-bleed, interactive field of the app's own game pieces floating in depth, so the scene is brand-true and teaches the product without words. It is token-driven (no hard-coded hex) and draws pieces with the board renderers' ink and geometry. Classic Light and Classic Dark get full polish; the other four themes are verified, not art-directed.

- **Cast:** chess pieces (king, knight, rook, pawn, both colours), Go stones, poker chips (several denominations), Connect Four discs (red and yellow, with the interior ring), Othello discs, playing cards (backs and a few faces), Mahjong tiles, a Hex tile, Checkers pieces. About 8 to 10 distinct objects, 18 to 26 on screen at once. No dice or anything that is not a real eSlams game.
- **Depth, three layers:**

| Layer | Size | Blur | Speed | Opacity | Notes |
|---|---|---|---|---|---|
| Far | small | strong | slowest | low | many, almost dust-like |
| Mid | medium | none or slight | slow | full | the readable heroes, arranged around the text, never covering it |
| Near | large, partly off-screen | soft depth-of-field | fastest | full | two or three, passing the camera |

- **Motion:** constant slow drift with a 3D feel (translate, scale, slow rotation of no more than about 8 degrees a second), gentle ease, no bounce, no physics-toy feel; objects exit and re-enter smoothly and the field never looks like it loops. Device tilt parallax (far least, near most, at most about 14pt), with a slow auto-sway when motion sensors are unavailable. Touch: dragging gently pushes nearby pieces (soft repel, inertia, damping) and they ease back into drift; tapping a piece spins it lightly and it drifts off. No sound and no new haptics (the three notes in §8 stay three).
- **Text always wins:** a quiet zone sits behind the wordmark, tagline and button; pieces drifting behind them dim and blur slightly so text contrast stays AA at every frame.
- **Entry choreography** (first paint, under 1.2 seconds, skippable by tap): the field is already drifting, the mark settles, the wordmark and tagline fade in, the button rises last.
- **Atmosphere:** Classic Dark is deep space (dark `--bg`, very low density fine star dust, a soft radial bloom of `--accent` at no more than about 12% alpha behind the wordmark, a subtle rim light on pieces). Classic Light is a zero-g studio (high-key `--bg` with a faint cool haze, pieces in their real colours with large soft offset shadows, the same depth blur), as premium as the dark one. Atmosphere gradients exist only on this background plane (§6.1, §8); controls stay flat.

**Transition to Auth, "going into space":** tapping the button pushes the player forward through the field. Near pieces accelerate toward the camera and blur out, the wordmark shrinks and rises to the top, the Auth content settles in and the field continues behind it at a calmer speed, 600 to 800 ms. Back reverses it. The field is continuous across Welcome, Auth and Profile setup (one world, one step deeper each time) and ends at Pick a look; it never appears on Home.

**Accessibility and performance**
- Reduced motion: one still, composed frame (no drift, no parallax, no touch response); the forward transition becomes a 150 ms crossfade. Reduce transparency: opaque `--bg`, pieces at reduced contrast.
- The field is decorative and hidden from screen readers; focus order is wordmark, tagline, `Play Against AI`.
- Performance: pre-rasterised sprites on a single GPU layer (Skia), 60 fps on iPhone 12-class and above, no frame spikes at the transition; pause when backgrounded and use the still frame in Low Power Mode. The handoff states the sprite count and fps tested.

### 7.0a Authentication (a full page, not a sheet)
The sign-in bottom sheet is removed. Authentication is a **full page** with the Welcome scene behind it (on tablet and desktop frames, a centred card over the same field), one surface for everything, including an expired session later (§7.5), which routes here with the table and choices preserved. Back chevron top left returns to Welcome. Title `Welcome to eSlams`, no subtitle, sentence case, no exclamation marks.

Buttons are all the same size and equal prominence (52pt), in this order:
1. `Continue with Google`
2. `Continue with GitHub`
3. `Continue with Apple` (iPhone only, Apple's button guidelines for style and equal weight; ships only if the provider is re-added, decision 2)
4. a divider `or`
5. `Continue with email`

A small legal line sits at the bottom: `By continuing you agree to the eSlams Terms and Privacy Policy.` (links open in the system browser). There is no Sign in or Create account toggle anywhere, and no link inviting a new player to create an account: one door in, the account decides the route.

**Google and GitHub (system browser handoff).** Both open the system browser session (the secure in-app web auth sheet) and return to the app. While away the page shows a calm waiting state (`Waiting for Google…` with `Cancel`) and the field keeps drifting. On a successful return it shows `Signing you in…` for the beat it takes, then routes. Cancelled or failed (including `access_denied`, `account_deactivated`, `account_deleted`, `linking_conflict`): one quiet line on the page, buttons re-enabled, messages as in §7.5.

**Email flow (email first).** Each step is its own screen in the same page flow, with the scene behind it and a back chevron.
1. **Email step:** one field (`you@lab.ai`) and `Continue`. Nothing else.
2. The email is looked up:
   - **Account exists:** Password step (show/hide, `Forgot password?` opening the web reset flow), then two-factor if the account has it (`One more check.`, unchanged, §7.5), then Home.
   - **No account:** Create step: `Create your account`, the email shown (editable via back), a password field with dynamic requirement feedback (no static rules paragraph: show only what is still missing, for example `3 more characters` while typing toward the 12-character minimum), the security check line (`Completing security check…`) and primary `Create account`, then Profile setup (§7.0b).

**Routing.** The account decides, not the button: an account with a handle goes straight to Home; a new account goes to Profile setup; an expired session returns to the same table.

**Dependencies to flag, not solve:**
- Email-first needs a platform lookup (the web today uses a Sign in / Create account toggle) and reveals whether an email has an account. It needs an explicit security review (rate limiting, enumeration risk) before build; the alternative is a single password field that works for both. The design does not block on this.
- Sign in with Apple on iOS is a product decision: the web removed it on 18 Aug 2026. Design it in; ship it only if the provider is re-added. App Store review rule 4.8 requires an equivalent privacy-preserving sign-in alongside Google and GitHub, so the owner of App Store submission should confirm.

### 7.0b Profile setup (new players, one page)
One page, not a wizard, shown once to a new account and never to a returning one. Title `You're almost in.`, no subtitle. The same scene sits behind it (one step deeper, Classic Light or Classic Dark only, form surfaces legible over it). Required fields first, optional below, then play. Principle: no rule or reassurance text that is not an error.

**Required block**
- **`Pick your handle`**: a field prefilled with a **generated on-brand handle**, `<adjective>-<piece>-<number>` such as `quiet-rook-42`, `lucky-pawn-7` or `hex-hermit-13`: lowercase, hyphenated, 3 to 32 characters, never a reserved word, from a shared platform helper so web and app agree. A **shuffle** icon button inside the field's trailing edge (label `New handle`) regenerates instantly, no network. A mono preview beneath is exactly `eslams.com/<handle>` (domain in `--text-3`, handle in `--text`), updates on every keystroke and **ends there, with no trailing text**. Typing is forgiving: uppercase is lowercased silently and spaces become hyphens silently. Errors are dynamic and specific: they appear only when something is wrong, say exactly what, and **replace the preview line** while invalid (so the layout does not jump); the preview returns when valid, and the field border takes the loss tone. `Create account` is disabled while invalid, with no extra text. Rules are the platform's: 3 to 32 characters, `^[a-z0-9][a-z0-9-]*[a-z0-9]$`, 32 reserved words.

  | Situation | Message (`<>` is dynamic) |
  |---|---|
  | Fewer than 3 characters | `Needs at least 3 characters. <n> more.` |
  | More than 32 characters | `32 characters max. You're <n> over.` |
  | Disallowed characters | `Only lowercase letters, digits and hyphens. Remove <the offending characters, e.g. "_" or ".">` |
  | Starts or ends with a hyphen | `Can't start or end with a hyphen.` |
  | Reserved word | `That handle is reserved.` |
  | Taken (on submit, 409 `username_taken`) | `That handle is taken. Here is a new one.` |

  There is no availability check, so a taken handle surfaces on submit: the field regenerates automatically, keeps focus, and `Create account` re-enables.
- **`Who can see your profile?`**: two chips, **Public preselected** (`Anyone can view it`), one tap to Private (`Approved followers only`). No helper line beneath. Public sets the default match visibility to Public, Private to Followers.

**Optional block**, under a mono eyebrow `Optional`:
- **`Bio`**: two-line field, 160 characters, mono counter `<n>/160`.
- **`Location`**: type-ahead over a bundled, permissive-licence list of countries and major cities (lazy-loaded on this page only), suggestions as `City, Country`; free text always accepted; placeholder `City or country`. Nothing is sent anywhere until `Create account`.
- **`Favourite games`**, hint `Pick any. Your first pick opens Home.`: selectable tiles from the catalogue (the compact game card, §7.11: glyph tile, name, table label in mono), the thirteen main games first in the arenas grid's order, then `Show all <N> games`. Any count. A selected tile takes the accent border, a check and a mono order badge (`1`, `2`, `3`), so the first favourite is always visible; tapping again deselects and renumbers.

**`Create account`** (primary, 52pt, sticky in the thumb zone) is enabled as soon as handle and visibility are valid, which with the defaults is at once (and disabled, with no extra text, while the handle is invalid): leaving the optional block empty is the skip, so there is no `Skip` link and no `You can add the rest later in Settings.` line. Busy: `Creating your account…`. Failure: `Couldn't create your account. Try again.` inline, every field intact. Success goes to Theme pick (§7.0c). No gender, no website, no display name, no avatar, no pact, no phone step; display name, website and avatar are edited later on eslams.com (§7.10).

**Layout.** Phone: one scroll; the required block and `Create account` fit the first screen at 390 × 844, and the optional block starts below the fold. Tablet and desktop: two columns, identity left (handle, visibility, bio, location), favourites right (the tile grid scrolls in its column), `Create account` in a footer bar under both. Accessibility: required fields announce as required, favourites are toggle buttons announcing `selected, favourite 1`.

### 7.0c Theme pick (once, app only)
Shown once, after Profile setup, never before authentication and never in place of play. Title `Pick a look.`, sub `Six looks. Same boards. Change it any time in Settings.` A full-width **`Follow system`** row sits first, **preselected** (`Classic Light or Classic Dark with your phone.`), then the six tiles in two columns, built exactly like the Appearance grid (§7.10): a real mini Connect Four board in that theme (the same legal, unfinished position, static), the name beneath, the selected tile with a 2px accent border and a check. Tapping a tile selects it, clears `Follow system` and re-themes the page at once; tapping `Follow system` returns to it. One button, **`Continue`**, works with no choice made. Then Home. Marked seen when shown (`themePickSeen` beside `themePref`), so a relaunch never repeats it; afterwards themes change in Settings only.

### 7.1 Launch and the brand beat
The native splash (the OS draws it before the app reads the theme, so it follows only the OS light or dark: Classic, mark in brand blue) covers session restore and the catalogue and roster fetches; it hides work, never adds it. Then, signed out, **Welcome**, which carries the brand beat: the mark settles (600ms), the wordmark and `Here, AI plays games.` fade in as the background match starts, under **1.2 seconds**, no sound; reduced motion shows them static. Signed in, the app goes straight to Home with no beat and no separate splash animation. No three-beat lattice animation.

### 7.2 Arena Home (personalised)
Home is always signed in and personalised from the favourites picked in setup, so nobody lands on a dashboard. Header: mark + wordmark left (small, 24pt mark), **avatar** right (32pt circle, mono initials fallback). That is the whole chrome. No search, no trophy, no dock.

1. **Resume card** (only when the platform reports an active match): a full-width match card (§7.11) with an accent hairline, arena and table, `vs <Model>`, and the state chip from `turnPhase` (`Your move` · `<Model> is thinking…`; a web-started match per decision 7), with the **Resume** action. One tap re-enters the Stage. Nothing outranks an unfinished match; this card is the top of the page when it exists.
2. **Hero: your first favourite.** The large game card (§7.11) for the first game picked in setup, with the roster's recommended `Ready` opponent for that table (once the player has played there, the last opponent they chose). No favourites: Tic-Tac-Toe, or the catalogue's most played game once the platform reports one. It carries the **living preview** of that table (an engine-recorded real sequence, looping quietly; reduced motion shows the final frame), arena and table names, the opponent line `vs Claude Haiku 4.5 · Ready`, and one primary **Play now**, which starts the match at once. Beneath it, `Change opponent` and `Change table` are two equal-width buttons whose outer edges align exactly with the `Play now` edges, text centred, same height, one consistent gap, the group centred under Play now. `Change opponent` opens the opponent picker (§7.12); `Change table` opens the table sheet set to this table. The same alignment rule applies wherever the pattern repeats (the table sheet's `Change` opponent action is centred on its card's vertical axis and matched in height).
3. **`Your games`**: a horizontal snap-scroll rail of the favourites as game cards (§7.11) in pick order, each with **Play** (starts at once with that table's remembered or recommended opponent); a tap on the card body opens its table sheet. Absent when there are no favourites; nothing nags the player to add some.
4. **`Choose your game`** (replaces `Choose an arena`; no count slot, no category filter chips). A sectioned store: each section is a title (17/650), `See all` and a horizontal snap rail of rich game cards that peeks the next card so it reads as scrollable. Sections in order:
   - **`Recommended for you`**: derived on device from the player's favourites and the categories they have not yet played. Never labelled as AI-chosen.
   - **`Start here`**: the thirteen `main_arena` games (Tic-Tac-Toe with Ultimate, Connect Four, Othello, Chess, Go, Five in a Row for Gomoku, Hex, Battleship, Bluff & Bid for Goofspiel, Rock Paper Scissors, Prisoner's Dilemma, Sealed-Bid Auction). It becomes `Popular` **only when the platform reports real play counts**, which it does not today; popularity is never invented (§9).
   - **`Board & Strategy`**, **`Card & Hidden-Info`**, **`Social & Economic`**: the three fixed categories (§5). Control & Arcade games are not Arena content.

   Cards: poster style, the game's real mini board as the cover (a static recorded position; at most one looping preview at a time elsewhere on the page), the 40pt glyph tile, name 14/600 and the mono table label (`Standard`, `3 tables · Chess / Shogi / Xiangqi`). The whole card opens the table sheet; a small play affordance is fine, but no stacked buttons on every card (one action per card, §7.11). For rhythm the first section leads with one **wide spotlight card** (full width, larger board), then rails. `See all` opens a full grid for that category, which is where the long list lives. Loading, disabled and selected states follow §7.11; offline, sections render from the cached catalogue; everything is token-driven and correct in all six themes. The hero's game carries a small `Active` pill where it appears.
5. **No footer line.** The old `Watch models play each other on eslams.com` line is removed from Home and from Settings under About; Battlefield is no longer mentioned in the app.

Pulling down on Home re-fetches the roster and catalogue. Offline: the sections render from the cached catalogue; the Play now button disables with the label `Back online to play` (disabled buttons explain themselves).

### 7.3 Table sheet (the matchup)
Bottom sheet, 90% height, grab handle, scrolls. This is the web's setup card made for a thumb, in the web's order:

1. **Header row**: arena glyph tile, arena name 17/650, `How to play` as a secondary chip on the right.
2. **Choose your table** (only when the arena has more than one): a horizontal segmented row of table cards (table name in sans, its Title Case variant label in mono beneath; selected = accent border + accent-softer fill). Switching tables swaps the preview and the seat layout instantly.
3. **The living preview**: the board for this table playing a short engine-recorded sequence in a `--surface-inset` well, min-height 180pt. For table games, the seat ring is the preview (see 5).
4. **How to play, folded**: three lines visible (Quick summary · Your turn · First move), `More` expands inline to the full rule sections. Never a modal, never forced. Copy comes from the written mobile rule content for all 35 mobile-playable games (Appendix D), not the web's mostly templated help.
5. **Opponent(s)**, one of two shapes:
   - **Duel games (2 seats):** the chosen model's card as `Your opponent` (provider mark, display name, provider, status pill, coverage) with `Change`, which opens the opponent picker (§7.12). It pins under the header row as the sheet scrolls, so the opponent is always in view. No suggestion rail here; the picker's `Recommended` row does that job.
   - **Table games (3 or 4 seats):** the **seat ring**. An oval `--surface-2` table with the scoring unit in the centre (chips for poker, points for Bridge, placement for Mahjong and Dou Dizhu), seats around it. Your seat is always drawn at the bottom (the web arranges seats relative to you) and reads `<Seat> · you` on the accent tile; each model seat shows provider tile, short name and `<Seat> · tap to swap`. Below the ring: `Your seat` as a segmented control from 1 to the seat count, with the web's `You open` or `Model opens` beside it; `Auto-fill table` (a distinct model in every model seat); and the readiness line `<N> model seats · Ready`, true when every model seat holds a distinct model that can play the table. Tapping a model seat opens the opponent picker in seat mode, titled `<Seat> · pick a model` (§7.12), and returns with that seat updated. Bridge uses the compass (North / East / South / West); poker, Mahjong and Dou Dizhu use the ring.
6. **Choose your side** (duel games; tables use `Your seat` instead): two large toggles with the platform's labels and helpers; the eyebrow reads `You move first` or `Model moves first`. The platform has five helper pairs: `Move first.` / `The model opens.` (Tic-Tac-Toe and the White / Black and Black / White board games), `Move first.` / `Model opens.` (every other two-player game, First / Second player), `Drop first.` / `Model drops first.` (Connect Four), `Act first.` / `Model acts first.` (card games, Seat A / B), `Choose first.` / `Model chooses first.` (Strategy-category games, Player A / B). Side names: X / O, Red / Yellow, White / Black (Chess, Othello, Checkers, Shogi, Xiangqi), Black / White (Go, Gomoku, Hex, Nine Men's Morris, Pentago), First / Second player, Player A / B, Seat A / B. They appear on the picker only; the seat bar and the result always say You and the model's name.
7. **Start game**: full-width primary, 52pt, in the thumb zone, sticky to the sheet bottom. Beneath it the readiness line in mono: `Connect Four · Ready`, or `Choose an opponent` (the web says "Choose a live model"), or `<N> model seats · Ready`, or the disabled reason (`Claude Haiku · Not available for this game`). The player is always signed in here; if the session has expired, Start opens the Auth page (§7.0a, §7.5) and the match starts with every choice intact once it closes. The app sends the match visibility explicitly at start (the platform requires it for mobile), preselected to the account's default and changeable afterwards on the result card.

Statuses on the sheet: a model that cannot play this table shows `Not available for this game` and Start disables with that reason; a cold engine shows nothing here (the curtain-riser handles it). Hidden-information games get a short roster of only the models that can play them (four today): show them, say `<N> models can play hidden-information games today` in mono beneath, never pad. An empty roster reads `No models can play this table yet.` (the web: "No live models for this table yet."). The web's coverage line counts all 50 catalogue games, so its `27 games` includes the twelve Control & Arcade games and means 15 Arena games; the app counts Arena games only, or shows the status pill alone.

### 7.4 Roster sheet
Folded into the opponent picker (§7.12); there is no separate roster sheet.

### 7.5 Authentication copy and errors (the web's steps, natively)
The page and its flow are specified in §7.0a (full page, equal-weight buttons, email-first). This section keeps the copy and messages the app reuses from the web. Opened from Welcome, and again only if a session expires at Start, when it returns to the same table and starts the match.

Two-factor is unchanged and follows email password sign-in or a Google or GitHub sign-in that needs a second factor:

- **Web strings, for reference only (superseded in the app by §7.0a):** the web's `Sign in to eSlams`, `Sign in with GitHub, Google, or email.`, `or use email` and its Sign in / Create account toggle are not used in the app. `Forgot password?` still opens the web reset flow in the system browser; password and email fields keep show/hide and `you@lab.ai`.
- **Create step:** `Create your account`, Email, Password with dynamic feedback, the security check line while Turnstile runs (`Completing security check…`), primary `Create account`; legal copy is the single line on the Auth page (§7.0a).
- **Two-factor** (flow unchanged): `One more check.`, title `Two-factor verification`, sub `Open your authenticator and enter the current code.`, segmented `Authenticator · Recovery code`, `Six-digit code` or `One-time recovery code` field with one-time-code autofill, `Trust this device` toggle (the web's "Trust this browser"; **hidden when the second factor follows a GitHub or Google sign-in**), primary `Verify and continue`.
- **Sign in with Apple** (iOS, decision 2): the web removed it on 18 Aug 2026. Design a reserved third provider slot in the same list; it ships only if the provider is re-added.
- **Password rules** follow the web: minimum 12 characters; Turnstile on create-account and forgot-password.

Errors use the web's messages verbatim (`Sign in to start a game.`, `Your sign-in expired. Sign in again to start a game.`). The OAuth deep link can also return `access_denied`, `account_deactivated`, `account_deleted` or `linking_conflict`, and the provider sign-in can fail or be cancelled; each needs a one-line message. While the browser hands back, the page shows `Signing you in…`. Nothing here is designed from scratch; the job is spacing, type, and routing (§7.0a): Home for an existing account, Profile setup for a new one (§7.0b), the same table after an expiry.

### 7.6 Curtain-riser (match load)
Between Start and the first move there is real work: the active-match preflight, session create, a possible cold start of the runner container (every game except Tic-Tac-Toe and Connect Four), and the model's first move when it opens. Stage it, do not spin it. Full-bleed screen on `--bg`: the table's preview board centred, the matchup writes on (`YOU` with your username · `vs` · the model with its provider tile; for tables, the full seat list), arena and table in mono beneath, and one status line tied to real progress. `Setting the table…` shows while the start request is out. `Waking the engine…` follows for runner games only; the platform emits no warm-up event, so the line claims only that a cold start is possible. `Claude Haiku has taken its seat.` lands when the session exists.

Escalation follows the server. While the start request is out there is no server stage; a lost answer is retried with the same idempotency key, which is safe. If the model opens, its turn follows the Stage's timing: `thinking` at 10s, `keep_waiting_offer` at 30s with `Taking longer than usual…` and options (`Keep waiting` · `Switch opponent` · `Exit`), `claim_eligible` at 120s. Engine failure (502 `arena_engine_unavailable`) is one designed state, never an error screen: `The engine room is busy. Connect Four is ready right now.` with `Try again` (re-sends the same start) and a one-tap switch to Connect Four, which runs inside the worker. A roster backend failure (503 `arena_model_authority_unavailable`) reads `Opponents are unavailable right now. Try again in a moment.` When the first frame is ready, the curtain-riser **is** the Stage's opening frame: the board fades in under the matchup, which compresses into the seat bar. One continuous scene.

**One active match.** If the platform reports another active match (web or app), or start returns 409 `active_arena_session_exists`, the riser stops before creating anything and asks `You have a match in progress: <Game> vs <Model>, <state>.` ("Chess vs GPT-4.1 mini, your move.") with `Resume that match` (primary) and `Start this one instead` (secondary; it replaces atomically and says so: `Your <Game> match will end.`). The web says `This game is already running` / `Another game is already running`, with `Resume current game` and `End and restart <Game>` or `Exit and start <Game>`; keep the meaning, keep it to one card. Replace adds a busy state while it confirms (503 `arena_replacement_unavailable`, retried safely) and a re-ask if the current match changed meanwhile (409). This card and the Leave match sheet are the only confirm dialogs in the app.

### 7.7 Stage · play (portrait, one-handed)
Fullscreen. No dock exists, so nothing to hide; the status bar stays. Top to bottom:

- **Ribbon**: `×` exit (44pt), arena name centred (`Connect Four`), move counter right in mono (`move 6`).
- **Seat bar**: you and the model as a compact facing pair (tables: a compact arc of all seats above the board). Active seat wears the accent underline and its status verb: `Your move` / `thinking 0:07`. The model side carries the **deliberation clock**, honest elapsed time on the current turn, and after the first model move a mono `last turn 6.2 s` from the session's own turn telemetry. The platform has no "usually ~Ns" estimate; do not invent one.
- **The board**, pinned, filling the width with an 18pt margin. `renderer_family` and `board_size` size it; 15 × 15 boards get pinch-zoom and a magnifier loupe under the finger.
- **The reasoning line**: the model's `public_explanation` arrives on the `action.selected` event, **whole, with its move**; the platform does not stream it. The server sends that event just before the state frame, and the web ignores event frames, so the app reads them and holds the text until the move lands. Show it beneath the board, one to two sentences, sans 14 `--text-2`. The app may type it on as a presentation beat (reduced motion places it at once), never as thinking in progress. Order: **the move lands, the reasoning appears, the clock resets**. The 22 hidden-information games publish no explanation; the line stays empty and quiet, never a placeholder sentence. Where it exists it is the voice of the product: min-height two lines, never jumps the board.
- **Your controls** in the thumb zone, per family (Appendix A): tap-to-place boards need nothing extra; card games fan your hand here; bids and offers use a stepper or slider with one commit verb (`Seal bid`, `Propose`, `Call`); matrix games show two or three large choice chips. Labels come from the legal-action descriptors as on the web (`Column 4`, `Top left`, `Move e2 to e4`); raw tokens never appear. Over 36 actions, page or search.
- **Overflow** `⋯`: How to play · Sound · Resign.

Micro-states, all designed, driven by the server's turn stages (`pending` at 0s, `thinking` at 10s, `keep_waiting_offer` at 30s, `claim_eligible` at 120s; each model seat at a table gets a fresh timer): `reconnecting…` as a quiet ribbon pulse (a snapshot re-sync, never a modal); a `Your move` haptic after a long think; optimistic placement on Tic-Tac-Toe and Connect Four, rolled back if refused; a **premove** ghost on those two games only (the server sends `premoveActions` for them and rejects early moves, so the app queues the tap and submits it the instant the turn flips); at 10s the clock simply runs on, since the server has only confirmed the model is still working; at 30s `Taking longer than usual…` with `Keep waiting` and the web's `You can keep waiting or leave the app. This match stays active.`; at 120s **Claim the win** as an accent-soft button, `Claim the win. The model never showed.` A model that fails outright ends the match as `model_unavailable` (§7.8). Web lines kept verbatim: `The match changed on another device. The latest position is now loaded.` (stale-state 409, then re-sync); `The previous move still needs confirmation. Retry the same move before choosing another.` (lost answer); `This Arena match is no longer available.` An illegal move (400 `illegal_arena_action`) shows the engine's message in one quiet line.

Exit mid-match raises one sheet: `Leave match? The model will be waiting.` · `Leave` (the match stays active for up to seven days) · `Resign` (a loss on your record) · `Keep playing`. Leaving returns to Home with the Resume card at the top.

### 7.8 Stage · result (the curtain)
The board holds on the final position; the surround recedes one luminance step; a beat of stillness; the winning seat rises to full presence, the other settles to neutral. Then the **scoreline card** rises under the board:

- Outcome word, 28/650: `You won.` / `Claude Haiku wins.` / `A draw.` For tables and points games, the game's own unit from the session's per-seat `scores`: `+60 chips.` (poker), `+14 points.` (auction, bargaining, negotiation, Goofspiel, Bridge), `2nd of 4.` or `2nd of 3.` (Mahjong and Dou Dizhu score by placement). Hex, Goofspiel and the auction cannot draw.
- `YOU vs Model` chips, arena · table in mono, move count, the match date, one verdict line where data allows (`Decided on move 24.`).
- Honest sublines for every terminal reason the platform emits: `normal` (above), `resignation` (`You resigned on move 12.`), `model_timeout_award` (`Claimed on timeout. Doesn't count toward your record. The model never took its turn.`), `model_unavailable` (`The model couldn't finish. Your moves are saved; this match doesn't count toward your record.`), `abandoned` from the seven-day inactivity expiry, source `inactivity_expired` (`This match expired after seven days without a move. Not a loss.`), or from a replace, source `user_ended` (`You ended this match to start another.`; the platform sets `user_ended` only when the player ends the match, through the end action or the atomic replace, and the app exposes no standalone end, so it only ever produces `user_ended` through `Start this one instead`). Profile stats count only normal finishes and resignations; never imply a timeout win moved a number.
- A win earns the app's one celebration: a single **accent wipe** across the card plus the success haptic. No confetti, no particles, in any theme; in Neon and Arcade the wipe carries the theme's glow (§6.1).
- **Match visibility** as an inline segmented control: `Public` · `Followers` · `Only me`, with descriptions adapted from the web's Default match visibility setting, which says "new matches" (`Anyone can view and share this match.` · `Approved followers can view this match.` · `Only you can view this match.`). Preselected to the value sent at start: the account default, or if unset, Public for a public profile and Followers for a private one. A change saves at once through the worker's visibility route after completion; the web has no such route.
- `Saved to your profile` appears once `resultPublication` is `ready`; nothing shows while it is `pending`; if it is `unavailable`, `Watch replay` disables with `Replay unavailable`.
- Actions: **Play again** (same setup, instant rematch) · `New opponent` · `Watch replay` · `Share`.

**Share card**: a designed image in the player's current theme (any of the six, both outcomes; in the four material themes the mark takes the theme ink, §6.2): final board, scoreline, matchup chips, the match date, the mark, `eslams.com`. Losing to a frontier model is also shareable: `It took GPT-4.1 mini 41 moves to beat me.` Export at 1080 × 1350 and 1080 × 1920.

### 7.9 Stage · replay (your matches)
Same Stage, read-only: a full-width filmstrip scrubber with a tick per move (thumb-sized), transport in the thumb zone (restart · step · play/pause · step · end), and **the reasoning ledger as the scroll** while the board stays pinned. Ledger rows: mono turn number · seat dot · the action in player language (`Drops column 4`, never `cell 5`) · the mover's display name · the public reasoning. Current row on `--accent-soft`. A match with no public reasoning (every hidden-information game) shows one quiet line. No per-move thinking time: the platform does not persist it. Swipe down dismisses.

### 7.10 Avatar corner: Your matches, Settings
A small menu from the avatar: **Your matches** (a push: list of your Arena matches, newest first, each row a match card (§7.11) with the absolute date in the detail and a visibility icon; **Watch** opens the replay), **Settings**, `Sign out`. Signing out ends the session on the device and returns to Welcome (§7.0); the stored theme stays.

**Settings** (one screen, plain words, nothing that feels like a bank): Appearance (below), Sound, Haptics, Account (`Manage your account on eslams.com` opens the web settings, including Default match visibility; `Delete account` opens the web deletion flow, required by the stores), About (version, Privacy, Terms), `Sign out` (back to Welcome). Display name, bio, location, website and avatar are edited with the profile on eslams.com.

**Appearance** is the first group and, after the one-time Theme pick (§7.0c), the only place a theme is chosen. Under the mono eyebrow `Appearance`, a two-column grid of six tiles: `Classic Light` · `Classic Dark` · `Neon` · `Club` · `Arcade` · `Midnight`. Each tile shows a real mini Connect Four board drawn in that theme (the same legal, unfinished position in every tile, static, so tiles differ only by theme), with the name beneath. The selected tile has a 2px accent border (the app's accent, not the tile's) plus a check, so selection never rests on colour alone; no tile glows. Only while a Classic theme is selected, a `Follow system` row follows the grid with a toggle and the hint `Switches between Classic Light and Classic Dark with your phone.` A material theme hides the row; tapping a Classic tile pins it and turns Follow off. Every change applies instantly (no crossfade, toast, haptic or confirm), and Settings keeps its scroll. The grid is a radio group named `Appearance`; each tile reads `<name> theme` (`Neon theme`) with the theme's one-line description as its hint: `The calm instrument, daylit.` · `The calm instrument.` · `Glass and cold cathode.` · `Wood, felt, and brass.` · `Phosphor plane, accent glow.` · `The board floats; motion carries it.` Arrow keys move and apply; each tile is a 44pt target.

**App icon** sits beneath, in the same group: the six themed alternates (the mark in each theme's ink on its theme ground; brand blue for the Classic pair), selected with the same border and check. The default home-screen icon is brand blue, and the store icon stays brand blue whatever the player picks.

### 7.11 The game-card and match-card system
One card for every game and one for every match, everywhere: the Home hero, `Your games`, the arenas grid, setup favourites, Your matches, the Resume card. Nothing that starts, resumes or replays a game is ever a bare text link.

- **Game card**: glyph tile (40pt, `--surface-2`), name (14/600), table label in mono 11 `--text-3` (`Standard`, `3 tables · Chess / Shogi / Xiangqi`), and a **real mini board**: a quiet loop of an engine-recorded game for previews (hero and table sheet; one loops at a time), a static recorded position elsewhere. Sizes: **large** (hero, full width, board on top), **rail** (`Your games`, about 160pt wide), **compact** (arenas grid, setup favourites; the board as a small poster).
- **Match card**: board poster (the final position, or the current one for an active match), participants as provider marks and display names (`You` on the accent tile), **one status chip** (`Your move` · `Thinking` · `Final 1–0` · `+60 chips` · `2nd of 4`), relative time.
- **Three actions, three looks.** **Play** = accent fill (start a match). **Resume** = accent soft (back into an active match). **Watch** = outline with the replay icon (a finished match's replay). At most one action per card; the card body opens the detail (table sheet or replay).
- **States**: default; pressed (accent-soft tile); selected (2px accent border and a check, plus the order badge in setup); disabled (the reason replaces the action: `Not available for this game`, `Back online to play`, `Replay unavailable`); loading (a board-shaped `--surface-2` block, no shimmer).

### 7.12 The opponent picker
A stage, not a dropdown: a full-height sheet with a back chevron, opened from `Change` on the table sheet, `Change opponent` on the hero, or a model seat. Title: `Choose your opponent`, or `<Seat> · pick a model` in seat mode. Top to bottom:

1. **`Recommended`**: four large cards, mixed across providers by the platform's recommendation scoring: provider mark on its tint, display name 15/650, speed as the status pill (`Ready` or `Slower turns`; the platform has no seconds estimate), and `plays this table`. `Shuffle` deals four others, as the web's Shuffle does.
2. **Filter chips**: `Ready` (default; models that can play this table) · `Fast` (also hides `Slower turns`) · `Frontier labs` (the major labs' own models; the provider list is catalogue data, never typed) · `All` (unavailable models included at 55% opacity, still visible).
3. **Search**: `Search models or providers...`, over the full roster.
4. **The roster grouped by provider**, each group headed by its logo and name, the selected model's provider first. Rows: provider mark, display name 14/600, mono id beneath, the status pill, and table coverage (`<n> Arena games` or `All games`, §7.3).

Selecting commits and returns: the chosen card pins to the top of the table sheet as `Your opponent`. **Seat mode** (tables) assigns one seat at a time; a model already seated shows `<Seat>` and cannot take a second seat. Hidden-information tables list only the models that can play them (four today), with `<N> models can play hidden-information games today`; the Recommended row shows as many as exist, never padded. Loading: `Loading full model roster...`. Empty search: `No models match this search.` Empty roster: `No models can play this table yet.`

---

## 8. Motion, haptics, sound

- **Timings** come from the platform's animation spec per game: move 220ms (Connect Four 320ms with the system's one gravity settle), reveal 300ms for hidden-information games and 180ms otherwise, result 520ms; screen push 200ms; sheet 280ms. No web or mobile code reads the spec today, so the app is its first consumer. One calm ease-out; no bounce except the Connect Four settle.
- **Signature motion**: the weightless field on Welcome, Auth and Profile setup is the signature motion of the first run (drift, tilt parallax, touch push; §7.0), with the forward "going into space" transition between steps (600 to 800 ms, near pieces accelerate and blur out, the wordmark rises, back reverses it). After that: the living preview on the Home hero and table sheet; piece arrival with the ring pulse; reasoning writing in; the result curtain and accent wipe. That is the list. Nothing else loops, with the field as the one scoped exception to that rule and to the no-gradients rule (atmosphere gradients exist only on that scene's background plane; controls stay flat). It never appears on Home or later screens.
- **Glow and planes.** Nothing glows except, in Neon and Arcade only, the last-move outline, the active seat and the win's accent wipe (§6.1). The glow is static: it arrives with its element and never pulses. Material planes (glass, wood, felt, phosphor, void) are still backgrounds, never animated, and no theme adds a move trail. Switching themes is instant, with no transition.
- **Haptics**, three notes only: light tick when the model's move lands; medium tap when it becomes your move after a long think; success or failure pattern on result. Off switch in Settings.
- **Sound**: one physical arrival cue per family (disc drop, stone click, card slide) and one result chord, reusing the production WAVs in `apps/mobile/assets/production/audio/runtime/` (twelve per-family cues, an arrival cue, a result chord). Muted when the device is on silent; global toggle. No music.
- **Reduced motion** maps every beat to its end state: Welcome shows one still, composed frame of the field (no drift, no parallax, no touch response) and the forward transition becomes a 150 ms crossfade; the preview shows its final frame, the curtain is instant, typed-on reasoning is placed whole. The app must be fully legible and honest with zero motion.

---

## 9. Honesty and latency (non-negotiable)

Frontier models take 5–20 seconds on hard positions. That is the product's soul, not a failure. Make the thinking visible and remove every other millisecond.

- The thinking indicator is driven by the server's turn stages and WebSocket state pushes, never by a client timer. A deliberation clock on the model's seat; the last turn's real latency beside it once there is one.
- **Move first, explanation second.** The move lands as soon as the server applies it; the explanation arrives with it and is shown after it, as content, not as a fake stream.
- Escalate, never dead-end: at 10s the server confirms the model is still working, at 30s `Taking longer than usual…` with `Keep waiting`, at 120s **Claim the win**. There is no reload button anywhere in the app.
- No advantage bar until the platform emits per-turn advantage. Do not draw a neutral bar that implies one exists.
- `Live` appears nowhere, not even for roster size. `Ready` and `Slower turns` come from the worker's roster status. There is no "usually ~Ns" estimate on the platform, so the app shows none.
- Counts (games, arenas, models) render from the manifest and roster, never typed. Every other number comes from real matches, with a date: move counts, last-turn latency, scores, your record. A number standing alone (share card, Your matches) carries its match date.
- Every scripted preview is an engine-recorded legal game. If a preview cannot be real, show the empty board.

---

## 10. Copy deck (exact strings)

**From the web, verbatim (quoted in the platform digest):** `How to play` · `Choose your table` · `Choose your side` · `You move first` · `Model moves first` · the five side-helper pairs (`Move first.` / `The model opens.` · `Move first.` / `Model opens.` · `Drop first.` / `Model drops first.` · `Act first.` / `Model acts first.` · `Choose first.` / `Model chooses first.`) · `Model roster` · `Shuffle` · `Change` · `Your seat` · `You open` · `Model opens` · `<Seat> · you` · `<Seat> · tap to swap` · `Auto-fill table` · `Start game` · `<Game> · Ready` · `<N> model seats · Ready` · `Active` · `Choose your opponent` · `Search models or providers...` · `Loading full model roster...` · `Recommended picks` · `Mixed across providers` · `All providers` · `No models match this search.` · `Ready` · `Slower turns` · `Not available for this game` · `Objective` · `Your turn` · `Legal actions` · `Hidden information` · `Exit` · `Resign` · `Keep waiting` · `Claim the win` · `You can keep waiting or leave the app. This match stays active.` · `The match changed on another device. The latest position is now loaded.` · `The previous move still needs confirmation. Retry the same move before choosing another.` · `This Arena match is no longer available.` · `This saved Arena game is not available in the current catalogue.` · `Play again` · `Share` · `Public` · `Followers` · `Only me` · `Arena games coming soon` · `The playable game catalogue is unavailable right now.` · `Preparing playable games and model opponents.` The setup line `Pick your table, seat your opponents, and play a frontier model turn by turn, in the browser.` is reusable without "in the browser".

**Auth, verbatim (quoted in the platform digest):** every other string quoted in §7.5, from `Sign in to eSlams` and `or use email` through the two-factor labels to `Sign in to start a game.` and `Your sign-in expired. Sign in again to start a game.` Profile setup keeps the web's visibility strings: `Who can see your profile?` · `Anyone can view it` · `Approved followers only` · `Create account`.

**First run (new; the platform PR `feat/one-page-onboarding` ships the setup strings on the web):** Welcome: `Here, AI plays games.` · `Play Against AI` (Title Case, the one-off exception; fallbacks `Get Playing`, `Start Playing`, `Challenge an AI`) · `Back online to sign in`. Auth: `Welcome to eSlams` · `Continue with Google` · `Continue with GitHub` · `Continue with Apple` · `or` · `Continue with email` · `By continuing you agree to the eSlams Terms and Privacy Policy.` · `Waiting for Google…` · `Signing you in…` · email step `you@lab.ai` and `Continue` · `Create your account` · `Create account` · `Completing security check…`. Profile setup: `You're almost in.` · `Pick your handle` · `New handle` · `eslams.com/<handle>` · dynamic handle errors (`Needs at least 3 characters. <n> more.` · `32 characters max. You're <n> over.` · `Only lowercase letters, digits and hyphens. Remove <characters>` · `Can't start or end with a hyphen.` · `That handle is reserved.` · `That handle is taken. Here is a new one.`) · `Public` / `Anyone can view it` · `Private` / `Approved followers only` · `Optional` · `Bio` · `<n>/160` · `Location` · `City or country` · `Favourite games` · `Pick any. Your first pick opens Home.` · `Show all <N> games` · `selected, favourite <n>` · `Creating your account…` · `Couldn't create your account. Try again.` Theme pick: `Pick a look.` · `Six looks. Same boards. Change it any time in Settings.` · `Follow system` · `Classic Light or Classic Dark with your phone.` · `Continue`. Home and cards: `Your games` · `Choose your game` · `Recommended for you` · `Start here` (or `Popular` when real) · `Board & Strategy` · `Card & Hidden-Info` · `Social & Economic` · `See all` · `Change opponent` · `Play` · `Resume` · `Watch` · `Thinking` · `Final <a>–<b>`. Opponent picker: `Recommended` · `plays this table` · `Fast` · `Frontier labs` · `All` · `<n> Arena games` · `All games`.

**Auth, visible in the web screenshots in `08-auth-web-reference/` but not quoted in the digest:** `Sign in with GitHub, Google, or email.` · `Create an account with GitHub, Google, or email.` · `Create with GitHub` · `Create with Google` · `or sign up with email` · `Completing security check…` · `By creating an account you agree to the eSlams terms. Profiles become public only after onboarding chooses a username.`

**From the existing mobile rule content (not on the web):** `Quick summary` · `Objective` · `Full rules` · `Your turn` · `Turn example` · `Legal actions` · `Scoring` · `Win/draw/placement` · `Hidden information` · `First move` · `Accessibility`.

**Brand (canon):** *Here, AI plays games.*

**App-only:** `Sign out` · `Play now` · `Change table` · `Your opponent` · `More` · `Choose an opponent` · `<N> models can play hidden-information games today` · `No models can play this table yet.` · `<Seat> · pick a model` · `Trust this device` · `Signing you in…` · `Back online to play` · `Your move` · `<Model> is thinking…` · `Playing on the web. Finish it there or end it here.` · `Setting the table…` · `Waking the engine…` · `<Model> has taken its seat.` · `Taking longer than usual…` (the web's line plus an ellipsis) · `Switch opponent` · `Try again` · `The engine room is busy. Connect Four is ready right now.` · `Opponents are unavailable right now. Try again in a moment.` · `You have a match in progress: <Game> vs <Model>, <state>.` · `Resume that match` · `Start this one instead` · `Your <Game> match will end.` · `move <n>` · `thinking <m:ss>` · `last turn <n.n> s` · `reconnecting…` · `Seal bid` · `Propose` · `Claim the win. The model never showed.` · `Leave match? The model will be waiting.` · `Leave` · `Keep playing` · `You won.` · `<Model> wins.` · `A draw.` · `+<n> chips.` · `+<n> points.` · `<place> of <N>.` · `Decided on move <n>.` · `You resigned on move <n>.` · `Claimed on timeout.` · `Doesn't count toward your record. The model never took its turn.` · `The model couldn't finish. Your moves are saved; this match doesn't count toward your record.` · `This match expired after seven days without a move. Not a loss.` · `You ended this match to start another.` · `Anyone can view and share this match.` · `Approved followers can view this match.` · `Only you can view this match.` · `Saved to your profile` · `Replay unavailable` · `New opponent` · `Watch replay` · `It took <Model> <n> moves to beat me.` · `Manage your account on eslams.com` · `Delete account` · `Appearance` · `Classic Light` · `Classic Dark` · `Neon` · `Club` · `Arcade` · `Midnight` · `<name> theme` · `Follow system` · `Switches between Classic Light and Classic Dark with your phone.` · `App icon`.

**Vocabulary note (final polish round):** "Choose your game" replaces "Choose an arena" in the UI (the web's string is not used in the app). Removed strings: the Welcome count line, the secondary Welcome button, the Sign in / Create account toggle and its footer link, the Profile setup helper lines and subtitle, the Home count slot and footer line.

**Voice:** short, dry, a little cocky on the player's behalf; honest about machines. The cheek never touches the numbers. Sentence case. No exclamation marks.

**Retired:** battle, Elo, rating (for models), sweep, live (as a status, or for roster size), locked, Verified playable, Requestable, Gateway ready, refresh, bot.

---

## 11. Accessibility and performance

- VoiceOver and TalkBack labels on every control, seat, board cell group, scrubber tick, and chip. Boards are playable through accessible actions per cell or piece; moves are announced politely (`Turn 14. Claude drops column 4.`). Outcome is never colour-only; seat identity always carries a non-colour cue.
- WCAG AA in all six themes (results in §6.1); keep `--text-3` off `--surface-3` in Neon, Club and Midnight and off `--surface-2` in Midnight; check status pills and the mono readiness line. Increased contrast or reduced transparency should turn the glow off (recommended).
- Dynamic Type everywhere outside the board. 44pt minimum targets. Reduced motion, reduced transparency, and bold text all honoured.
- Cold start to interactive ≤ 2s (Welcome's brand beat signed out, straight to Home signed in). Board interactions at 60fps on a mid-range Android. One WebSocket per active match with poll fallback and snapshot re-sync after backgrounding. Previews render lazily and one at a time.

---

## 12. Handoff: what to produce

Design every screen in **Classic Light and Classic Dark**, and the screens named in item 13 in all six themes, portrait, **390 × 844**, with one Android frame (412 × 915) for the Stage. Every state in Appendix B is a screen or a component state, not a note.

1. **Launch and Welcome**: the native splash; Welcome with each of three background games (Connect Four, Chess, Go), in motion with parallax and as the reduced-motion still frame; the count line before the manifest loads; offline; **logout → Welcome**.
2. **Arena Home (personalised)**: with favourites (hero = first favourite, `Your games` rail), without favourites (Tic-Tac-Toe hero, no rail), with a Resume card (your move, model thinking, web-started per decision 7), Resume check unavailable (503: quiet retry, no card), loading, catalogue unavailable, offline, each category chip state, the pull-down re-fetch.
3. **Game-card and match-card sheets** (§7.11): game card in large, rail and compact sizes (single-table and multi-table, the phone's two-table Poker and Shedding tiles, active pill); match card with each status chip; Play, Resume and Watch; pressed, selected, disabled and loading states.
4. **Table sheet**: a duel board game (Connect Four, Red / Yellow), a simultaneous-choice duel (Rock Paper Scissors, Player A / B), a hidden-info card game with its short roster (Gin Rummy), a 4-seat ring (No-Limit Hold'em) with Auto-fill, a 3-seat ring (Dou Dizhu), Bridge's compass; How to play folded and expanded; empty roster; `Not available for this game` and `Slower turns`; `Your opponent` pinned while scrolling.
5. **Opponent picker** (§7.12): recommended (and after `Shuffle`), each filter chip, searched, empty search, loading, grouped roster with all three statuses, seat mode with a seated model, a hidden-information table.
6. **Authentication, Profile setup, Theme pick**: sign in, create account with the security check line, two-factor (authenticator and recovery; with and without `Trust this device`), `Signing you in…`; Profile setup on phone and tablet/desktop, empty (defaults only) and filled, shuffled handle, invalid and taken handle, location suggestions, favourites selected with order badges, `Create account` busy and failed; Theme pick with `Follow system` and with a material theme chosen; error states (web messages, OAuth deep-link errors, sign-in expired at Start), and the reserved Apple slot on iOS (decision 2).
7. **Curtain-riser**: instant start (Tic-Tac-Toe, Connect Four) and runner start with `Waking the engine…`, the model-opens stages at 10s and 30s, engine busy (502), opponents unavailable (503), the one-active-match card with its replace busy and re-ask states, the transition into the Stage.
8. **Stage · play**: one screen per renderer family in Appendix A.3, each with its touch affordance: `grid_3x3` (Tic-Tac-Toe, Ultimate), `connect_four`, `square_board` (Chess, Othello, Checkers, Battleship), `custom` (Shogi, Xiangqi, Mancala, Nine Men's Morris, Pentago, Backgammon), `go_board` (Go; Gomoku with the loupe), `hex_board`, `card_table` (duel hand, 4-seat ring, 3-seat ring, Bridge compass), `dice_table`, `payoff_matrix`, `auction_panel`, `economic_panel`. States: model thinking with the clock (`pending`, `thinking` at 10s), reasoning typing on, the empty reasoning line of a hidden-information game, `Your move`, optimistic placement and rollback, premove ghost (Tic-Tac-Toe and Connect Four only), a move awaiting confirmation, an illegal move, stale-state re-sync, match no longer available, reconnecting ribbon, `keep_waiting_offer` at 30s, Claim the win at 120s, the Leave match sheet. No advantage bar anywhere.
9. **Stage · result**: all seven outcomes (win, loss, draw, resigned, timeout award, abandoned after seven days, model unavailable) plus abandoned by a replace; per-seat lines in chips, points and placement; `resultPublication` pending, ready and unavailable; the visibility control, including its not-ready and busy states; the share card in each of the six themes and both outcomes.
10. **Stage · replay**: scrubber, transport, reasoning ledger, no-reasoning state, no thinking-time chip, a saved game no longer in the catalogue, swipe-down dismissal.
11. **Avatar menu, Your matches (including empty), Settings** (including the Delete account entry and `Sign out` back to Welcome), and the **Appearance screen**: the six-tile grid with each theme selected, `Follow system` on and off, the App icon choice.
12. **App icon** (the mark alone on the brand blue, exported per platform, plus the six themed alternates; the store icon stays brand blue) and a **store screenshot set**: Arena Home light, Table sheet light, Stage dark, Result dark, Replay dark, for iOS and Android.
13. **Six theme states**: Home, the Table sheet, Stage · play and Stage · result in each of the six themes, showing the board plane, ink, card face and back, the tinted Home mark in the four material themes, and the glow on last move, active seat and the win wipe in Neon and Arcade only.

Work strictly in the token set (the four material themes from `prototype/research/six-themes.css`); propose the smallest possible set of new tokens (likely: sheet radius, seat-ring geometry, share-card safe margin). No glow outside the Neon and Arcade accent moments, no gradients except board and card planes, no confetti, no emoji, no mascots.

**The measure of success:** someone installs the app in a queue, is mid-match against a frontier model inside sixty seconds, feels it think, beats it or nearly does, and shares the scoreline. Then they come back tomorrow and the table is already set.

---

## Appendix A. The catalogue the app renders

Verified against `packages/core-types/src/game-catalog.ts`, `game-surface.ts`, `mobile-capability.ts` and `apps/web/components/arena-client.tsx` on 2026-09-30. **Never type these numbers into a screen; render them from the manifest.**

**Arithmetic.** 50 catalogue games. 13 are solo score benchmarks and not Arena content (Blackjack plus the twelve Control & Arcade games). **37 are Arena-playable on the web**, shown as **24 arenas** (grouped tiles). The mobile capability manifest additionally excludes Leduc Hold'em and the Rank & Suit shedding table, giving **35** on the phone (still 24 arenas) unless decision 8 re-enables them. By category: Board & Strategy 16 games in 12 arenas · Card & Hidden-Info 16 games in 8 arenas (14 on the phone) · Social & Economic 5 games in 4 arenas.

**The arena grouping is currently hard-coded in the web client**, not in the shared contract; the app must consume the same grouping, so engineering should lift it into `packages/core-types`.

### A.1 The 24 arenas and their tables

| # | Arena tile | Category | Tables (tile subtitle on the web) | Seats | Renderer family | Sides or seats |
|---|---|---|---|---|---|---|
| 1 | Chess | Board | 3 tables · Chess / Shogi / Xiangqi | 2 | square_board / custom / custom | White / Black |
| 2 | Go | Board | Board 9x9 | 2 | go_board (9×9) | Black / White |
| 3 | Connect Four | Board | Standard | 2 | connect_four (6×7) | Red / Yellow |
| 4 | Tic-Tac-Toe | Board | 2 tables · Standard / Ultimate | 2 | grid_3x3 (3×3 / 9×9) | X / O; First / Second player |
| 5 | Othello | Board | Standard | 2 | square_board (8×8) | White / Black |
| 6 | Checkers | Board | Standard | 2 | square_board (8×8) | White / Black |
| 7 | Five in a Row | Board | 2 tables · Gomoku / Pentago | 2 | go_board (15×15) / custom | Black / White |
| 8 | Hex | Board | Standard | 2 | hex_board | Black / White |
| 9 | Mancala | Board | Standard | 2 | custom | First player / Second player |
| 10 | Nine Men's Morris | Board | Standard | 2 | custom | Black / White |
| 11 | Battleship | Board | Standard | 2 | square_board (hidden info) | First / Second player |
| 12 | Backgammon | Board | Standard | 2 | custom | First / Second player |
| 13 | Poker | Card | 3 tables · No-Limit Hold'em / Limit Hold'em / Leduc | **4** | card_table, table_ring | Seat 1–4 (chips) |
| 14 | Trick Takers | Card | 4 tables · Hearts / Spades / Euchre / Bridge | 2 / 2 / 2 / **4** | card_table; Bridge uses **compass** | Seat A / B; Bridge N / E / S / W (points) |
| 15 | Shedding | Card | 3 tables · Crazy Eights / Rank & Suit / Dou Dizhu | 2 / 2 / **3** | card_table; Dou Dizhu table_ring | Seat A / B; Seat 1–3 (placement) |
| 16 | Gin Rummy | Card | Compact Gin | 2 | card_table | Seat A / B |
| 17 | Mahjong | Card | Compact Draw Discard | **4** | card_table, table_ring | Seat 1–4 (placement) |
| 18 | Cribbage | Card | Discard Showdown | 2 | card_table | Seat A / B |
| 19 | Hanabi | Card | Compact Hanabi | 2 | card_table (you see the partner's cards, not your own) | Seat A / B |
| 20 | Bluff & Bid | Card | 2 tables · Liar's Dice / Goofspiel | 2 | dice_table / card_table | Seat A / B (Goofspiel in points, no draws) |
| 21 | Prisoner's Dilemma | Social | One Shot Matrix | 2 | payoff_matrix | Player A / B |
| 22 | Negotiation | Social | 2 tables · Bilateral Split / Price & Delivery | 2 | economic_panel | Player A / B (points) |
| 23 | Sealed-Bid Auction | Social | Two Bidder Private Values | 2 | auction_panel | Player A / B (points, no draws) |
| 24 | Rock Paper Scissors | Social | One Shot Hidden Commit | 2 | payoff_matrix | Player A / B |

Leduc (Poker) and Rank & Suit (Shedding) are not in the mobile manifest (decision 8). Hearts, Spades and Euchre are two-seat compact variants on the platform, not four-hand tables. Variant tokens render in mono only on the How to play sheet (for example `core_compact_holdem_fixed_menu_no_limit`); tiles use the web's short labels and sheets the Title Case variant label (`Compact Holdem Fixed Menu No Limit`, `Board 9x9`, `Standard`).

### A.2 Hidden information
22 of the 37 games are hidden-information: every Card and Social table plus Battleship (20 on the phone). The platform blanks their public board, frame, render hints and explanations. The player's private view (`viewerPrivate`) arrives separately and only while the match is active: `playing_cards`, `mahjong_tiles`, `hanabi_hand`, `dice`, `number_cards`, `battleship_fleet`, `private_value` or `none`, plus a `sealedCommitment` while a choice, bid or card is sealed. Only four models can sit at these tables today (Claude Haiku 4.5, Gemini 2.5 Flash, GPT-4.1 mini, Grok 4.20).

### A.3 Per-family phone framing and touch input (the mobile capability manifest's input modes)

| Family (games) | Portrait framing | Input mode and gesture |
|---|---|---|
| `grid_3x3` (Tic-Tac-Toe, Ultimate) | Board large, centred; Ultimate lifts the active local board | `cell_tap`: tap a cell; premove ghost allowed (Tic-Tac-Toe) |
| `connect_four` | Full-width columns | `cell_tap`: tap a column; press-and-hold previews the drop; premove ghost allowed |
| `square_board` (Chess, Othello, Checkers, Battleship) | Width-filling board; Battleship shows the two fog grids | `piece_move`: tap a piece, see its legal targets, tap one; Othello and Battleship are a single tap on a legal cell |
| `custom` (Shogi, Xiangqi, Mancala, Nine Men's Morris, Pentago, Backgammon) | Bespoke boards: CJK-on-tile pieces, pit rows and stores, three concentric squares, four rotatable quadrants, 24 points with bar | `piece_move`; Pentago needs a place-then-rotate preview; Backgammon needs dice and bar handling |
| `go_board` (Go 9×9, Gomoku 15×15) | 9×9 fits; 15×15 pinch-zoom with a loupe | `cell_tap` on intersections; Gomoku confirms with a dashed ghost stone |
| `hex_board` (Hex) | Parallelogram width-fit, edges seat-tinted | `cell_tap` |
| `card_table` (15 Arena games, 13 on the phone) | Your hand fanned in the thumb zone; table centre above (community cards, current trick, discard river, last play) | `card_action`: tap to select, tap again or drag up to play; verbs Bet · Bid · Call · Check · Discard · Double · Draw · Fold · Give hint · Hit · Pass · Play · Raise · Split · Stand |
| `dice_table` (Liar's Dice) | Seat cups in an arc; the current bid as the large mono claim | `dice_bid`: count × face stepper, `Call` as the big moment |
| `payoff_matrix` (RPS, Prisoner's Dilemma) | Matrix centred; your choices as large chips | `simultaneous_choice`: tap a chip; both seats reveal on the same frame |
| `auction_panel`, `economic_panel` (Auction, Bargaining, Negotiation) | Panel centred; your private value shown | `value_entry`: slider plus fine stepper, one commit verb (`Seal bid`, `Propose`, `Accept`, `Reject`) |

Legal actions arrive from the platform with `label`, `shortLabel`, `verb`, `object`, `confirm` (unused on the web), `disabledReason` and `value`, only on the human's turn; large sets (over 36) page or search. Web label examples to reuse: `Column 4`, `Top left`, `Move e2 to e4, promote to Q`, `Fold`, `Cooperate`, `Bid 7`.

### A.4 Motion timings from the platform's animation spec
Values in §8; reduced motion = `static_final_state` for every game; no web or mobile code reads the spec yet. Named move families: `tic_tac_toe_mark`, `connect_four_drop`, `othello_flip`, `chess_piece_move`, `go_stone_place`, `gomoku_line`, `hex_path`, `ultimate_tic_tac_toe_board`, `battleship_shot`, `goofspiel_reveal`, `simultaneous_reveal`, `payoff_matrix_reveal`, `sealed_bid_reveal`; other games use their renderer family.

## Appendix B. The session: every state the app must design

Verified against the Arena Durable Object, the completion service and the web client on 2026-09-30. The server owns all timing; the app reacts to state. Every mutation carries a UUIDv4 `idempotency-key`, so retrying after a lost answer is always safe.

### B.1 Lifecycle, top to bottom

| Moment | What the platform does | What the app shows |
|---|---|---|
| Open the app, signed in | `GET /api/arena/runtime-session` returns the active match summary (`clientChannel` web or mobile, `status` reserved or active, timestamps) plus its state, or null; 503 `arena_runtime_session_unavailable` with `retry-after: 1` | Resume card at the top of Home, or none; on 503, retry quietly and never claim there is no match |
| Start | `POST /api/arena/sessions` with game, model(s), side or seats, explicit `matchVisibility`, `setupVersion: 2`, and a valid platform session; nothing else on mobile. 201 → session. 409 `active_arena_session_exists` → conflict. 502 `arena_engine_unavailable` → engine failed to start. 401 → sign-in expired. 503 `arena_model_authority_unavailable` → roster backend down | Curtain-riser; the one-active-match card; engine-busy state; Auth page; `Opponents are unavailable right now. Try again in a moment.` |
| Replace | `POST /sessions/:id/replace` ends the current match and starts the new one atomically; 409 if the current match changed; 503 `arena_replacement_unavailable` while confirming | `Start this one instead` on the conflict card, with its busy and re-ask states |
| Human move | `POST /sessions/:id/action` with `expectedMoveNumber`; 202 with `modelTurn: pending` when the model is next; 409 `arena_turn_not_ready` if it is not your turn; 409 `arena_stale_session_state` if the match moved elsewhere; 400 `illegal_arena_action` with the engine's message | Optimistic placement on Tic-Tac-Toe and Connect Four (roll back on failure); otherwise placed on confirm. Stale-state and lost-answer lines as in §7.7 |
| Model turn | `turnPhase` moves `human_turn → human_move_accepted → model_thinking → model_move_applied`, and ends at `completed`. `modelTurn.status` moves `pending` (0s) → `thinking` (10s) → `keep_waiting_offer` (30s) → `claim_eligible` (120s, late reply fenced). Each model seat at a table gets a fresh timer | Deliberation clock; `Taking longer than usual…` with `Keep waiting`; `Claim the win`. Never a reload button |
| State updates | WebSocket `/sessions/:id/connect`: `snapshot` on connect, `state.updated` on every save, and `event` frames (`arena.started`, `action.selected` with `public_explanation`, `player.resigned`, `match.completed`, `match.abandoned`, `model.timeout_award_claimed`, `model.turn_status`, `model.late_response_ignored`, `model.action_failed`, `model.late_failure_ignored`). The web ignores `event` frames; the app reads `action.selected` for the reasoning line. Poll fallback: the mobile client polls every 2.5s while a match is active and every 15s once it is completed, with bounded reconnect backoff; the web polls at 450ms, then 900ms. Ordering rule: completed wins; higher move number wins; a turn stage never goes backwards | `reconnecting…` ribbon during re-sync; nothing else visible |
| Claim | `POST /sessions/:id/claim-timeout-award`, only while `claim_eligible`; otherwise 409 | Result: timeout award |
| Resign | `POST /sessions/:id/resign` (the web has no confirm; the app adds the Leave match sheet) | Result: resignation |
| Leave without resigning | Nothing; the match stays active for up to 7 days from the last accepted human move, then ends as `abandoned` (`inactivity_expired`), which is not a loss | Home with the Resume card |
| Completion | `status: completed`, `terminalReason` ∈ `normal · resignation · model_timeout_award · abandoned · model_unavailable`, `winner` ∈ human · model · draw, per-seat `scores`, `resultPublication` `pending` → `ready` (matchId, replayId, savedToProfile) or `unavailable` (the web never reads it); `abandonmentSource` `user_ended` or `inactivity_expired`; profile stats count only normal and resignation | Result curtain; `Saved to your profile` once publication is ready; replay available from the same card |
| Visibility | `PATCH /sessions/:id/visibility` (worker only) with `public · followers · only_me`; 409 `arena_result_not_ready` until completion, `arena_visibility_busy` while another update runs | Inline segmented control on the result card |
| Replay | Replay written as events plus manifest; `public_explanation` per move for non-hidden-information games; per-move latency is **not** published | Stage · replay with the reasoning ledger; no thinking-time chip |

### B.2 Result outcomes (map one-to-one; the web's current titles in brackets for reference)

win (`Victory · You beat the model.`) · loss (`Defeated · The model came out ahead.`) · draw (`Draw · Evenly matched game.`) · resigned (`You resigned · The match ended as an explicit resignation.`) · timeout-award (`Victory on timeout · The server fenced the late model response and awarded the match.`) · abandoned (`Match ended · The match ended without a rated result.`) · model-unavailable (`AI opponent unavailable · Your evidence was saved, but the opponent could not complete the match.`). The app's warmer copy for each is in §7.8; the meanings do not change.

### B.3 Engine facts that shape the curtain-riser
Tic-Tac-Toe and Connect Four run inside the worker and start instantly. The other 35 games (33 on the phone) call the runner container (30-second timeout, three attempts, containers sleep after fifteen idle minutes), so a cold start is real for them. The model call itself allows 45 seconds by default and 120 for reasoning models and Anthropic, with retries after 750ms and 1500ms; a model that fails outright ends the match as `model_unavailable`.

### B.4 What the platform does not provide today (design the honest absence, never a stand-in)
No per-turn advantage or win probability. No streamed explanations. No "usually ~Ns" estimate. No premove endpoint (the app queues a tap on Tic-Tac-Toe and Connect Four). No spectating of other humans' matches. No per-move thinking time in replays. No share or Open Graph card (the app renders its own). No difficulty picker (the three levels are a label only). No model tiers shown to players.

### B.5 Empty, loading and error copy worth keeping from the web
All listed in §10 under "From the web, verbatim" and mapped to states in §12. One changes: the web's "No live models for this table yet." becomes `No models can play this table yet.`, because the app never uses "live" as a status.

## Appendix C. Opponent roster: statuses and shape

| Fact | Value (web, September 2026) |
|---|---|
| Roster size | Web: `Model roster` with "313 live", deduplicated across all games (production data, not provable from code). App: `<N> models`, rendered, never typed, never "live". |
| Default view | Web: a rail of up to 36 ("36 shown opponents") of models that can play the game, round-robined by provider, order seeded per browser tab, the selected model pinned first. `Shuffle` picks a different opponent. Hidden-information games show four or fewer. |
| Coverage line | Web: `27 games` or `All games`, counted over all 50 catalogue games, so `27 games` means 15 Arena games. App: Arena games only, or the pill alone. |
| Status vocabulary | `Ready` (green-soft) · `Slower turns` (draw-soft) · `Not available for this game` (`--text-3`, row recedes, stays visible). Nothing else. On production web data every model shows Ready; the worker's `turnSpeed` makes `Slower turns` real in the app. |
| Readiness line | `<Game> · Ready` for duels; `<N> model seats · Ready` for tables. If a seated model cannot play the table, Start disables and the line says why. |
| Identity | Provider logo SVG (61 in `01-brand/provider-logos/`) on a provider-tinted rounded square, initials fallback. Display name in sans; `provider/model-id` in mono beneath. |

**How the roster is built.** The web route takes public models with the provider enabled, status available, a fixed model version and a non-empty allowed-games list, ordered by provider tier, provider name and slug, cached five minutes; tiers are never shown. Recommendation scoring favours models that can play the chosen game, cover all games, or carry a flagship family name or a pro/reasoning suffix, and demotes beta, preview and legacy. The app reads the worker's `GET /api/arena/models`, which adds `turnSpeed` (`slower_turns` for a slow latency tier or a median turn over 7 seconds) and the `publicName` used for display.

## Appendix D. How to play: the content contract

Every Arena game has a help block on the platform. The web shows it as a modal, opened only from the setup hero and never during play, titled with the game over a mono meta line `Standard · Board & Strategy · 2 seats`. Its five fields:

| Field | Example (Connect Four, one of three games with written web copy) (captured from the live modal, 2026-09-30) |
|---|---|
| Objective | Connect four discs in a row before the opponent does. |
| Your turn | Players alternate dropping one disc into a non-full column. |
| Legal actions | Choose a column where a disc can fall. |
| Hidden information | All essential state is visible while you choose legal actions. |
| Tip (one line, accent-softer well) | Center columns usually create more threats. |

**Where the words come from.** Only three games have written web copy (Tic-Tac-Toe, Connect Four, Battleship); the other 34 fall back to templates ("Win {Game} by making legal moves that satisfy the game objective."). The existing mobile app ships **written rules for all 35 mobile-playable games** in eleven sections (named in §10) in `apps/mobile/src/arena/mobile-game-rule-content.ts` and `mobile-game-rule-sections.ts`. That is the app's content source: folded to three sections (Quick summary · Your turn · First move), expanded to all eleven, with `More` between them. During play the same sheet opens from the overflow menu, which the web cannot do. Stage controls are labelled from the same legal-action descriptors (`label`, `verb`, `object`, `disabledReason`), so help and controls share words. `recommendations-for-arena.md` holds the per-family help emphasis that shaped the content.

## Appendix E. Auth: the web flow the app re-skins

Captured from the live site and its code on 2026-09-30; the brand-panel lines and the two-factor copy below were captured verbatim from the live `/login`, `/signup` and `/two-factor` pages on that date. The app keeps the steps and the words; the sheet's copy is in §7.5 and §10.

| Screen | Web route | Elements beyond §7.5 |
|---|---|---|
| Sign in | `/login` | Brand panel `Welcome back.` with a one-line pitch and checks. Password minimum 12 characters, with `Show password`. |
| Create account | `/signup` | Brand panel `Join the arena.` Turnstile runs behind `Completing security check…`. Footer `Already have an account? Sign in`. |
| Two-factor | `/two-factor` | `Trust this browser` (app: `Trust this device`). Brand panel "Your password or identity provider was accepted. Verify the second factor to finish signing in."; footnote "Recovery codes are single-use. A used code is removed atomically from your account." |
| Forgot / reset | `/forgot-password`, `/reset-password?token=` | `Reset password` / `Enter your email to request a reset link.`; `Set new password`, `New password`, `Confirm password`, `Back to sign in`. Opened in the system browser; the email link returns to the web. No app screen. |
| Onboarding | `/onboarding` | The one page in §7.0b, rendered natively. The platform PR `feat/one-page-onboarding` turns the web's three steps into the same page: handle and visibility required; bio, location (bundled type-ahead, free text) and favourite games optional; the shared handle generator (`quiet-rook-42`, shuffle, regenerate on 409); favourite games persisted (an existing favourites table or API if the platform has one, else one additive `profilefavouritegames` migration with the deploy-pin files updated in the same PR); then a redirect to Arena with the first favourite preselected. `POST /api/account/onboarding` already accepts `{ username, visibility }` with every profile field optional. |
| Web lanes | `/login`, `/signup` | GitHub, Google, email and password, two-factor. Apple removed on 18 Aug 2026 (decision 2). No phone lane anywhere. |

The app's design job is the sheet, the spacing, the keyboard behaviour, and the routing: after sign-in an existing player lands on Home and a new one on Profile setup; after a session expiry at Start the player returns to the same table sheet with the same table, seats, side and opponent, and the match starts.

**Native plumbing is new work.** The mobile OAuth handoff routes (`/api/auth/mobile-oauth/*`), the native identity config and `POST /api/mobile/session/bind` were deleted with the old mobile surface on 16 Aug 2026 (tag `archive/mobile-2026-08`), so the new app inherits no mobile code. It signs in through Better Auth's Expo client: a cookie-backed platform session; GitHub and Google through the system browser with a return deep link; email and password natively; two-factor through the same Better Auth routes. There is no session-bind step. Any native bridge the platform needs is a follow-up platform change, not something the design can lean on. Rule content (Appendix D) and arrival sounds (§8) come from that tag as files.
