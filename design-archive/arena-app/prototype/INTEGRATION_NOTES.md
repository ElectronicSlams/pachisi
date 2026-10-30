# Integration notes (collected from the build agents' reports)

Read before integrating. Each section lists deviations from CONTRACT.md and extra fields the integrator must reconcile.

## engines-core.js (ultimate-tic-tac-toe, rock-paper-scissors, prisoners-dilemma, first-price-sealed-bid-auction, goofspiel)
- Simultaneous games (RPS, PD, auction, goofspiel): `toMove` returns the human seat until the game ends; the model's reply is computed inside `apply`, so the state returned by `apply` is already the revealed frame. The Stage must NOT wait for a model turn after these applies; show the reveal directly. `modelAction(state, humanAction)` exists on all four for ledger text.
- UTTT view adds: `cells` (9x9 global), `lastBoard`, `lastLocal`, `winBoards`; `terminal.line` and `view.winLine` are big-board coords (0..2), `lastMove` is global 0..8. Legal actions: `{kind:'cell', cell:{r,c} global 0..8, board, label, shortLabel, hint}`.
- payoff_matrix view adds: `choices`, `rounds`, `played`, `lastWinner`, `youSeat`; history entries carry `pay:[a,b]`. RPS ends at 3 round wins or 5 rounds; PD always 5 rounds.
- auction_panel view adds: `youSeat`, `lot`, `bidRange`, `scores`; `values` only after reveal. `legal` returns one value action `{kind:'value', min:0, max:yourValue, step:1, verb:'Seal bid', value}`.
- goofspiel (card_table) view adds: `lastBids`, `lastPrize`, `lastWinner`, `round`, `rounds`, `youSeat`, `history`, per-seat `count`, `used`, `won`; `center.cards` = upcoming prize. Tie DISCARDS the prize (data.js help text says it carries over: fix data.js help to match the engine).
- `window.ESE_CORE` is assembled at the end of engines-core.js from `ESE_CORE_A` + `ESE_CORE_B`.

## engines-core-a.js (tic-tac-toe, connect-four, othello, gomoku, hex)
- Exposed as `window.ESE_CORE_A = { rng, engines, util }`. All five pass ai-vs-ai, illegal-apply, immutability and §5 shape tests. AI timing: connect-four max 4 ms, hex max 18 ms.
- Othello view adds `counts:{p1,p2}`, `passed:'p1'|'p2'|null`, `highlights:[]`; p1 is black 'b', p2 white 'w'; `terminal.scores` present; `explain` appends a pass sentence when the opponent passes.
- Hex: rhombus layout, neighbours (r,c±1), (r±1,c), (r-1,c+1), (r+1,c-1); Black (p1) joins row 0 to row 10, White joins col 0 to col 10; `path` on the terminal view and `terminal.line`.
- Gomoku and hex legal lists are large (225 / 121 on an empty board); render legal cells as the enlarged dot, never as a list.
- Cell labels read like "H8" (gomoku skips the letter I). Rows count from the top.

## engines.js (aggregator) and engines-scripted-table.js (17 table/panel games)
- `ESE` also exposes `isEngine(slug)`, `rng`, `parts`; never throws; merges ESE_CORE_A/B itself if ESE_CORE is missing.
- `preview()` for engine games returns the LAST 6 to 12 frames (ends on the result); scripted games return the first 12 frames.
- Engine results normalised to `{winner, line, reason, winLine?, scores?}`. Ledger reasoning is null on 'you' rows and for every hiddenInfo game (incl. RPS, PD, auction, goofspiel).
- KNOWN GAP: first-price-sealed-bid-auction is a one-move game, so its preview has 2 frames. Use the auction's two frames (sealed, revealed) as a slow two-beat preview, or render the auction preview as the panel in its sealed state; do not pad with fake rounds.
- card_table extra fields: frame-level `revealed`, `metrics:[{label,value}]`, `stock`, `trump`, `piles:[{label,cards}]`, bridge `contract` and `declarer`; per seat `bet`, `tricks`, `score`, `note`, `winner`, gin showdown `melds`/`deadwood`; `center.cards[i].by` = seat id; mahjong tiles `{rank, suit:'bamboo'|'dots'|'characters'|'honors', id}` with honor ranks E/S/W/N/Rd/Gr/Wh; hanabi cards `{rank:'1'..'5', suit:colour, id}` and your own cards `{hidden:true, known:{suit?,rank?}}`; dou-dizhu jokers `{rank:'BJ'|'RJ', suit:'joker'}`; `role` values Dealer / Small blind / Big blind / Declarer / Dummy / Landlord / Peasant / winds. All families add `toAct` and `terminal`.
- dice_table extra: `phase`, `history:[{seat,count,face}]`, `actual` on reveal, `wild:1` (ones are wild).
- economic_panel extra: `kind:'split'|'grid'`, `pool`, `fallback`, `round`, `maxRounds`, `roles`, `phase`, `lastAction`, `grid:{prices,deliveries}`; offers carry `split` or `price`/`delivery`/`payoffs`; `current` = `{seat, round, split|price, delivery, payoffs, status}`.
- Results: `scores` keyed p1/p2 or seat1..seat4 (chips for poker, placement for mahjong/dou-dizhu, points elsewhere); multi-seat adds `winners:[ids]` and `winner` is a seat id; shedding, crazy-eights and liars-dice return no scores. Hanabi result is `winner:'draw'` with `shared:true` (cooperative).
- Frames per game: leduc 11, limit 20, no-limit 16, hearts 17, spades 19, euchre 13, bridge 14, shedding 22, crazy-eights 20, gin 12, cribbage 14, hanabi 29, mahjong 29, dou-dizhu 25, liars-dice 10, bargaining 14, negotiation 10.

## engines-scripted-board.js (10 scripted board games)
- Chess = Morphy's Opera Game (34 frames, you win); go 29 (model by half a point, komi 7.5); checkers 20 and backgammon 16 end in a HUMAN RESIGNATION (last ledger row "Resigns", `result.reason:'resignation'`, last frame `resigned:'p1'`); battleship is 51 frames (realistic shooting). Shared helpers on `window.ESE_SCRIPTED_BOARD_KIT`.
- All records: `result.reason` ('normal'|'resignation'); ledger rows carry `cell` where it applies; chess rows add `notation` (SAN); r=0 is the top row and you (p1) sit at the bottom.
- chess: `highlights` holds the mated king on the last frame. go: `prisoners`, `komi`, pass frames have `lastMove:null` + `passed`, last frame `territory:{p1:[..],p2:[..]}` + `score`.
- battleship (square_board): rows 10, cols 10, `pieces:[]`, `fog:true`, `shots:{you,model}`, `fleet`, `sunk:{you:[{name,cells}],model:[...]}`, `lastMove:{r,c,by,hit,sunk}`.
- custom kinds: shogi `pieces:[{r,c,piece,side}]` with promoted as '+B', `hands`, `lastMove:{from|null,to,drop?,promoted?}`; xiangqi rows 10 cols 9 `pieces` K/A/E/H/R/C/P, `river:{afterRow:4}`, `palaces:[{r0,r1,c0,c1}]`; mancala `pits:{p1:[6],p2:[6]}` (p2 pit i opposite p1 pit 5-i), `stores`, `lastMove:{side,pit,sown,extraTurn,captured}`; morris `points:[{id,x,y,owner}]` on a 0..6 grid, `edges`, `phase`, `inHand`, `lastMove:{from|null,to,removed}`, `mill`; pentago `cells` 6x6 'B'|'W'|'', `lastMove:{cell,quadrant 0 TL/1 TR/2 BL/3 BR,rotation}`, `landed`, `winLine`; backgammon `points[24]` (index i = your point i+1, positive you, negative model, you move 23->0), `bar`, `off`, `dice`, `lastMove:{side,moves:[{from|'bar',to|'off',die,hit}]}`, `resigned`.

## boards-grid.js / boards-grid.css (ESB shell + grid_3x3, connect_four, square_board, go_board, hex_board)
- `ESB.render(el, props) -> {update, destroy, host}`; family from `props.family` or `props.view.family`; unknown family -> `.bd-unsupported`. `ESB.registerFamily(name, {mount(host, props)})`; host is `div.bd-host.bd-size-{size}`. `ESB.util` = {h, s, clear, markLast, svgRoot, hit, hitShape, fire, tapCtl, legalOf, winPath, pts} for C2.
- Helpers: `providerTile(model|modelId, size)`, `youTile(size)`, `glyph(arenaId|slug|'g_*'|{glyph}, size)` (tile ~1.8x icon), `card(c, {faceUp, size:'xs'|'sm'|'md'|'lg'|px})`, `ESB.motion`, `ESB.reducedMotion(props)`.
- Optional view fields read: square_board `kind` ('chess'|'othello'|'checkers'|'battleship', else inferred); `flip`; battleship `fleet`, `incoming`, `lastMove.grid`; ultimate `lastMove` global {r,c} or {board,r,c}; connect four `lastMove` {r,c} or {col}.
- Overlays: cell_tap (focusable hit buttons, Enter/Space), Connect Four column tap with press-hold ghost disc, piece_move (select -> target dots -> tap; promotions prefer queen), Gomoku two-tap confirm (size >= 13), Go single tap.
- DECISION TAKEN: Connect Four discs use --loss (Red) and a lightened --draw (Yellow) to match the platform's side names, plus shape cues (ring vs pip). Acceptable because the platform names the sides Red/Yellow; make sure the result card never relies on disc colour for win/loss meaning.
- Hex objective assumed: p1/Black top-to-bottom, p2/White left-to-right (matches engines-core-a).
- The premove ghost for TTT/C4 is app.js's responsibility (press-hold ghost here is separate).

## app.js / app.css / canvas.css / index.html (the shell)
- Assumes scripted records have frames.length === ledger.length + 1; ledger seat 'you' (or your seatN) is your move; p1 is the first mover in duels; table results use seatN winners and scores.
- Copy: count line says `games` not `live games`; keep-waiting note is the brief's verbatim line. Added strings without a brief source: wrong 2FA code, username under 3 chars, illegal-move line, hand-off toasts, `Match ended.`, `<Model> couldn't finish.`, Your matches outcome chips. Review these for voice.
- Premove ghost overlay is app.js's own and sits over the board host box (slightly offset from ESB's grid): align it to ESB's cell geometry or ask ESB to expose cell rects.
- Known gap from B: `recordGame` for rock-paper-scissors logs only 'you' rows, so replay fixtures show no model rows; the ledger for simultaneous games should show both picks per round (use `modelAction`).
- Your matches poster scales ESB's 120px poster by 0.56.
- Dev API extras beyond the contract: state, skipBrand, replayBrand, setOffline, forceCatalogue, forceRoster, forceTwoFactor, expireSignIn, oauthError(code), reconnect, staleState, forceResult(...), forcePublication, openTable(slug), startMatch(slug), openMatches, openSettings, openHowto; `ESApp.state()` returns a QA snapshot.

## Orchestrator QA observations (first look in the real browser, dev index.html)
- Page boots with no console errors; canvas, phone, Controls, App icon, Share card and States panels all render.
- DEFECT: tapping "Play now" on Home opened the Table sheet instead of starting the match (brief §7.2: Play now starts immediately, through the sign-in sheet when signed out; "Change table" opens the sheet). Verify the tap target and fix.
- DEFECT (design): the living preview on Home and the table sheet shows the LAST frames of an ai-vs-ai game (a nearly full Connect Four board with the win line). Previews should loop the first 8 to 12 moves from the start position so a newcomer sees a game beginning, not a crowded end state. Change `ESE.preview` for engine games to the first N frames (keep the result frame optional at the end).
- VERIFY: wheel scrolling inside the table sheet appeared to scroll the page, not the sheet; confirm the sheet body is a scroll container that captures wheel/touch inside the phone, and that the Start button stays sticky at the sheet bottom.
- VERIFY: the Controls "Light" theme button; a click did not visibly switch the phone (may have been a mis-click after a page scroll). Confirm System/Light/Dark all apply to #phone and persist.

## boards-table.js / boards-table.css (card_table, dice_table, payoff_matrix, auction_panel, economic_panel, custom)
- Laid out at 354px and scaled with CSS `zoom` for preview/share/poster; secondary text hidden at poster size. Uses `.bd-t-last` for the last-move marker on HTML elements (C1's `.bd-last` styles only its SVG layer).
- BUG IN boards-grid.js (reported by C2): square_board battleship mount throws because `view.shots` is an object `{you, model}` (engine B2's shape), not an array. Fix the grid renderer to accept the object shape (and `fleet`, `sunk`, `lastMove.by/hit/sunk`).
- Optional fields read: `payoff_matrix.committed:{p1,p2}` (else a sealed pick shows "Hidden"), `auction_panel.maxValue`, `card_table.seats[].lastLabel`. Legal actions: kind 'card' needs `card {rank,suit}` or hand `index`; kind 'bid' needs `value {count, face}`; Call must match /call|liar|doubt/ in token or label; range actions need `min`, `max`, `step`, `verb`.
- The agent's `\uXXXX` escapes became literal UTF-8 in the file: build.py must read and write UTF-8 (verify the built file declares `<meta charset="utf-8">`).
- Overlays: card_action (tap to lift, tap again or the "Play X" button), dice_bid (steppers + "Bid three 3s" + Call), simultaneous_choice (chips), value_entry (slider, stepper, verb button, Accept/Reject beside it).

## Integration status, 2026-10-02 (F2)

Result: all eight flows pass in light and dark, zero console errors, against `src/index.html` over HTTP and against the built `../eSlams Arena App.html` over `file://` (`qa/last-run.json`, `qa/last-run-file.json`). `qa/audit.js` (new) checks text contrast and tap targets on eleven key screens in both themes (`qa/last-audit.json`, shots `qa/shots/A-*.png`).

Fixed in this pass
- Flow 4 (Hold'em demo step timed out). Cause: a tall board (four-seat card table 492px) overflowed the Stage column; `.st-actions` (flex 1, min-height 0) was squeezed and its demo-step button slid up under `.st-reason`, whose stale opacity made a stacking context that took the clicks. Fix: `.st-actions` never shrinks and paints above the reasoning line (app.css); hidden-information tables hide the always-empty reasoning line; new `view.fit()` in app.js scales the board host (CSS zoom, floor 0.7, only shrinks within a match) whenever the Stage would overflow. Measured on every playable game: shogi 0.98, bridge 0.985, the rest fit at 1.
- Result curtain over a tall board: the board shrinks (floor 0.6) by what the result card lacks, so Play again is visible on a four-seat result.
- Seat bar: the You side now has the same three text lines as the model side, so the two names align.
- A reasoning line that finishes typing after you already answered lands stale (0.6), not fresh.
- Premove: Connect Four column targets span the full column pitch (38px wells became >= 44px targets).
- Tap targets >= 44px: filter chips and segmented controls get a hit-area extension, the How to play "More" link a min width, the sign-in "Create an account" link 44px of padding; the roster search input fills its field.
- Roster search placeholder no longer clipped ("providers..."): the empty field does not reserve room for the clear control.
- Table sheet seat ring: the table oval sits inside the seats, so its outline no longer runs through seat names and "tap to swap" labels.
- Replay scrubber: inset by the knob radius so the knob stays inside the gutter at either end.
- Payoff matrix corner wraps the opponent name ("Claude Haiku →") instead of cutting it ("Claude Haik…") (boards-table.css/js).
- qa/flows.js: flow 1 also opens Change table and shoots the Connect Four table sheet (`02b`).

Defects listed above, re-verified
- Play now starts the match (sign-in sheet when signed out); Change table opens the sheet: fixed (flow 2 asserts it).
- Previews loop the first frames: fixed (`ESE.preview` returns start + up to 11 moves; Connect Four frame 0 is empty).
- Battleship `shots {you, model}`: fixed (grid renderer accepts the object; the 51-frame record renders 50 marks, no throw).
- Simultaneous games reveal with no fake wait: fixed (RPS and PD are one-shot tables in the engine, `rounds: 1`, so a pick ends the match on the reveal; a Goofspiel bid returns the turn at once, no model turn).
- RPS replay ledger shows model rows: fixed (`you,model` per round; flow 7 asserts both picks highlight).
- Goofspiel help matches the engine tie rule: fixed ("If the bids tie, the prize is discarded").
- Premove ghost aligned: fixed (flow 6 asserts < 1.5px from the landing hole).
- Sheet scrolls inside the phone with a sticky Start: fixed (flow 3 checks it).
- Theme System/Light/Dark applies to #phone and persists: fixed (flow 7 checks it across a reload).

Remaining (not fixed here)
- Scripted multi-seat demos remap your seat to the recorded one: pick Seat 3 for Hold'em and the demo seats you at Seat 1. Honest (a recording cannot move seats) but surprising; say so on the sheet or rotate the recording.
- At the result a four-seat table drops to 60% and its chip and pill text gets small. A compact result layout for tables would be better.
- Connect Four "Yellow" (lightened `--draw`) reads ochre on the light-theme tan board; disc vs well separation is weak. A theme decision for the theme work.
- Hold'em side pods are narrow: a last-action pill like "Calls 4" wraps onto two lines.
- Your matches posters for panel and table games are scaled-down panels with unreadable micro text at 0.56.
- Copy: Connect Four help says "Center columns" (US) while the reasoning says "centre"; Poker's table label "Compact Holdem Fixed Menu No Limit" reads like an internal token.
- Doc drift: the engines-core note above says RPS ends at 3 wins or 5 rounds; the shipped engine is one round.
- `leduc-holdem` and `shedding-card-game` are mobile-excluded; `dev.startMatch` on them falls back to the current table (by design).

## Final QA pass, 2026-10-02

Result: `qa/flows.js` 22/22 (all 11 flows, Classic Light and Classic Dark) and 16/16 (flows 1, 3, 7, 9 in Neon, Club, Arcade, Midnight) against `src/index.html`; flows 1, 2, 9, 10 pass in both Classic themes against the built single file over `file://` (8/8). Zero console errors. `qa/audit.js` (`THEMES=light,dark,neon,club,arcade,midnight`) checks 14 screens in each of the six themes: no text under AA, no tap target under 44px. The built file is strict UTF-8 (`<meta charset="utf-8">`) and its only network requests are Google Fonts (googleapis, gstatic).

Fixed in this pass
- Tap targets: Your matches "Watch" button (30px, hit area now 44px), roster search field (42px, now 44px).
- Contrast: `--text-3` lifted in Neon (#7a84ad), Club (#6b5f41) and Midnight (#81818b) so it clears 4.5:1 on `--surface-3`; replay row number and mover (`--text-2` on the active row); the Club "Your move" verb leans 15% toward `--text`.
- Chess: black pieces get a thin light rim (`--chess-b-edge`) in Classic Dark, Neon, Arcade and Midnight; before, they were near-black on a near-black board.
- Hold'em seat ring: the side seats' 114px mono labels ("Seat 2 · tap to swap") ran through the ring card's border; the side seats move in 6px, and your own seat (bottom) gets 168px so a 32-character handle does not ellipsize at once.
- Desktop frame: compact tile names wrap inside the tile ("Ultimate Tic-Tac-Toe" ran through the tile border at 152px).
- `qa/flows.js`: material themes now work in flows 1 and 9 (`pickTheme` falls back to `ESApp.dev.setTheme`; the Follow system check expects the OS scheme). `qa/audit.js`: signed-in fixture (the old script ran under the Welcome layer), welcome, sign-in, profile-setup and theme-pick screens added, material themes supported. New `qa/final/capture.js` drives every state for one theme; `qa/final/` holds the 36 curated screenshots, the contact sheet and a README.

Still open (design or copy decisions, not defects)
- Arena tile sub-labels ("2 tables · Standard /…") truncate on nine tiles, as the brief specifies. In the desktop frame "Ultimate Tic-Tac-Toe" now wraps inside its tile, breaking at a hyphen ("Ultimate Tic- / Tac-Toe").
- The Stage leaves the lower half of the phone empty for tap-to-place boards (Connect Four, Tic-Tac-Toe): board high, controls in the board itself.
- The Classic Dark wordmark mark is the brand blue on near-black and reads dim; it is a baked-in PNG.
- Everything under "Remaining (not fixed here)" above still applies (seat remap in scripted demos, 60% four-seat result, Your matches poster micro text, "Compact Holdem Fixed Menu No Limit" as the brief's Title Case variant label).
- The two `dev` edits under Pending approval are still not applied: with a signed-in fixture, Controls "Signed in" off lands on Home with a Sign in chip rather than Welcome.

## Pending approval (agent H, 2026-10-02)
The session's permission classifier denied this app.js edit, so it is NOT applied. Whoever has approval applies these two inserts in the `dev` object of `src/app.js` (outside every G-HOOK block):
1. `dev.setSignedIn(on)`: after `refreshAll();` add
   `if (!on && W.ESOnboard && typeof W.ESOnboard.welcome === 'function') { closeAllSheets(true); goHome(); safe(() => W.ESOnboard.welcome(), null, 'onboard.welcome'); }`
2. `dev.reset()`: replace the line `brandBeat();` (after `showHome();`) with
   `if (W.ESOnboard && typeof W.ESOnboard.welcome === 'function') safe(() => W.ESOnboard.welcome({ cold: true }), null, 'onboard.welcome'); else brandBeat();`
Effect: the canvas Signed-in toggle and Reset land on Welcome, matching Sign out.

## Polish round, 2026-10-02
Source: `../FINAL_POLISH_BRIEF_welcome_auth_home.md`; handoff: `../HANDOFF_polish.md`.

Files added
- `src/scene.js`, `src/scene.css` (ESScene canvas field), `src/auth.js`, `src/auth.css` (auth page).
- `qa/scene-bench.js`, `qa/scene-test.html`, `qa/scene-contrast.js`, `qa/auth-test.html`, `qa/auth-test.js`.
- `qa/final-polish/` (84 PNGs, contact-sheet.png, README.md).

Files changed
- `src/onboard.js`, `src/onboard.css`, `src/app.js`, `src/app.css`, `src/data.js`, `src/index.html`.
- `qa/flows.js`, `qa/audit.js`.

QA numbers
- Built file 1,141,538 bytes (`build.py --strict`), zero console errors over file://.
- Scene: 23 sprites at depth 0 (11/9/3), 21 at depth 1, 18 at depth 2; 60 fps at depth 0, 58 to 59 in transition (headless Chromium 390x844 DPR 2).
- Scene contrast light 18.5 / 18.9 / 9.1, dark 16.2 / 15.8 / 5.8 (wordmark / tagline / button), all AA.
- `flows.js` 22/22; material themes flows 1,3,7,9: club 4/4, midnight 4/4, neon 3/4, arcade 3/4 (flow-1 timing gate under parallel load; pass alone).
- `audit.js` 6 themes x 19 screens: 0 FAIL, 0 console errors, no tap target under 44px.
- Known low readings: auth-create "Completing security check..." (harness artefact, about 6.9:1 in light); Club "Connect Four" tile 4.07 to 4.36.

Pending approval is unchanged: the two `dev` edits in `src/app.js` (Signed-in toggle, Reset -> Welcome) are still not applied.
