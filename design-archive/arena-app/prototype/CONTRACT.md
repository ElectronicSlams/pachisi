# eSlams Arena app prototype: build contract

This folder produces **one interactive HTML prototype** of the Arena-only app described in
`../ARENA_APP_DESIGN_BRIEF.md` (read it first; it is the spec; its Appendices A to E are the data).
The format matches the earlier v3 prototype (`../assets/05-old-app-designs/prototype-v3/`): a dark
design canvas, one fully interactive phone, side panels. No build tools, no frameworks, no bundler.
Vanilla HTML + CSS + JS, ES2020, runs from `file://` and over HTTP.

Several agents build this in parallel. **Each agent owns the files listed under its name and edits
nothing else.** Every public surface below is the interface between them. If you need something that
is not here, add it under your own namespace and document it at the top of your file; never reach
into another agent's internals.

```
prototype/
  CONTRACT.md            this file
  src/
    tokens.css           [E] production tokens, light + dark, base element styles, fonts
    assets.js            [E] window.ESA: brand data-URIs, provider SVG map, glyph SVGs
    data.js              [A] window.ESD: catalogue, roster, help, copy
    engines.js           [B] window.ESE: game engines, recorders, previews
    boards.js            [C] window.ESB: board renderers + input overlays
    boards.css           [C] board styles (.bd- prefix)
    app.js               [D] window.ESApp: state machine, screens, sheets, stage
    app.css              [D] screens/sheets/stage styles (.ap- .sh- .st- .rs- prefixes)
    canvas.css           [D] page canvas, device frame, side panels (.cv- prefix)
    index.html           [D] dev entry; loads src files in the order listed below
  build.py               [E] inlines everything into ../"eSlams Arena App.html"
  qa/                    [F] screenshots and the Playwright script
```

Load order in `index.html`: tokens.css, boards-grid.css, boards-table.css, app.css, canvas.css, then assets.js, data.js,
engines-core-a.js, engines-core.js, engines-scripted-board.js, engines-scripted-table.js, engines.js, boards-grid.js, boards-table.js, app.js.
(`engines-core-a.js` defines `window.ESE_CORE_A` with five engines; `engines-core.js` defines `window.ESE_CORE_B` with the other five and then assembles `window.ESE_CORE` from both.)
(The board layer is split in two: `boards-grid.js` defines `window.ESB` with the `render` dispatcher, helpers, the
`ESB.families` registry and the grid families; `boards-table.js` registers the table/panel/custom families into it.)
(The engine layer is split into three part files that define `window.ESE_CORE`, `window.ESE_SCRIPTED_BOARD`,
`window.ESE_SCRIPTED_TABLE`; `engines.js` is a small aggregator that assembles `window.ESE` from them.)
Every agent writes files in chunks of at most 20 KB per tool call and saves early; one giant write stalls. `app.js` calls `ESApp.boot(document.getElementById('phone'))` on
`DOMContentLoaded`.

Fonts: Inter (sans) and JetBrains Mono (mono) from Google Fonts via `<link>`, with the token
font stacks as fallback. Nothing else external. No CDN scripts.

---

## 1. Design rules every agent obeys

- **Tokens only.** Every colour, radius, shadow, font comes from `var(--*)` in `tokens.css`.
  No hex literals in `app.css`, `boards.css`, `canvas.css` except inside `tokens.css` itself and
  the canvas page chrome (`.cv-*`, which is not the app).
- **Two themes.** `[data-theme="light"]` and `[data-theme="dark"]` on the phone root element
  (`#phone`). Default follows `prefers-color-scheme`; the canvas controls override. Everything must
  look finished in both.
- **Vocabulary is locked** (brief §5). Arena · Table · Seat · Side · Opponent · Model roster ·
  Match · Replay · `Ready` · `Slower turns` · `Not available for this game` · Claim the win ·
  How to play. Never: battle, Elo, rating, live (as a status), locked, bot, refresh, Verified
  playable, Requestable.
- **Honesty.** No fake spinners, no advantage bar, no invented numbers. Counts come from the data.
  Every scripted preview and demo is a legal game (engine-recorded or legal by construction).
- **Motion.** move 220ms (Connect Four 320ms with one gravity settle), reveal 300ms hidden-info /
  180ms otherwise, result 520ms, sheet 280ms, push 200ms. One ease: `cubic-bezier(.2,.8,.2,1)`.
  Honour `prefers-reduced-motion` and the canvas "Reduced motion" toggle (`html.reduced-motion`):
  every beat snaps to its end state.
- **Phone canvas:** 390 × 844 CSS px, portrait. Safe areas: 47px top (status bar), 34px bottom
  (home indicator). Side padding 18px on scrolling screens. Tap targets ≥ 44px. Type scale from the
  brief §6.3.
- **No em dashes** in any UI string. Sentence case. Numbers in mono.

---

## 2. `ESA` (assets.js) [E]

```js
window.ESA = {
  mark: 'data:image/png;base64,...',            // the mark alone, 256px, transparent
  wordmarkLight: 'data:image/png;base64,...',   // for light backgrounds (dark text), ~480px wide
  wordmarkDark: 'data:image/png;base64,...',    // for dark backgrounds (light text), ~480px wide
  providerSvg: { 'anthropic': '<svg ...>', 'openai': '<svg ...>', ... },  // inline SVG markup, viewBox kept
  providerLogo(providerSlug) -> '<svg ...>' | null,
  icons: { close:'<svg>', back:'<svg>', chevron:'<svg>', search:'<svg>', shuffle:'<svg>',
           play:'<svg>', help:'<svg>', more:'<svg>', check:'<svg>', share:'<svg>', replay:'<svg>',
           settings:'<svg>', signout:'<svg>', sound:'<svg>', eye:'<svg>', user:'<svg>',
           // arena glyphs (outline, 24 viewBox, stroke currentColor 1.75):
           g_chess:'<svg>', g_board:'<svg>', g_card:'<svg>', g_social:'<svg>', g_c4:'<svg>',
           g_ttt:'<svg>', g_go:'<svg>', g_hex:'<svg>', g_dice:'<svg>', g_poker:'<svg>' },
  icon(name, size=20) -> '<svg ... width height>'   // returns markup with currentColor
};
```
Brand PNGs come from `../assets/01-brand/`, downscaled with `sips` before base64. Provider SVGs
come from `../assets/01-brand/provider-logos/*.svg` (all 61 if the total stays under 400KB; else the
providers used by `ESD.roster`). Icons are hand-drawn outline SVGs, consistent 1.75 stroke.

## 3. `ESD` (data.js) [A]

```js
window.ESD = {
  categories: [ {id:'board', label:'Board & Strategy'}, {id:'card', label:'Card & Hidden-Info'},
                {id:'social', label:'Social & Economic'} ],
  arenas: [ { id:'chess', name:'Chess', category:'board', glyph:'g_chess',
              games:['chess','shogi','xiangqi'], marquee:true }, ... 24 total, brief Appendix A.1 order
            with the 13 marquee games' arenas first when category is 'all' ],
  games: { 'connect-four': { slug, name:'Connect Four', arena:'connect-four', tableLabel:'Standard',
            variantToken:'standard', category:'board', seats:2, family:'connect_four',
            seatLayout:'two_sides', boardSize:{rows:6, cols:7} | null, hiddenInfo:false,
            sides:{ p1:{name:'Red', helper:'Drop first.'}, p2:{name:'Yellow', helper:'Model drops first.'} } | null,
            seatNames:['Seat 1','Seat 2','Seat 3','Seat 4'] | ['North','East','South','West'] | null,
            scoreType:'wld'|'points'|'chips'|'placement', noDraws:false,
            play:'engine'|'scripted',      // engine = real human-vs-engine play in the prototype
            mobileExcluded:false }, ... all 37 },
  gameOrder: [...37 slugs, marquee 13 first],
  roster: [ { id:'anthropic/claude-haiku-4.5', publicName:'Claude Haiku 4.5', provider:'anthropic',
              providerName:'Anthropic', family:'claude', turnSpeed:'ready'|'slower_turns',
              hiddenInfoCapable:true, recommended:true, medianTurnMs: 4200 }, ... ~40 models,
              providers interleaved, exactly 4 hiddenInfoCapable: anthropic/claude-haiku-4.5,
              google/gemini-2.5-flash, openai/gpt-4.1-mini, xai/grok-4.20 ],
  rosterTotal: 313,                        // the "live" count the UI renders (from data, never typed in app.js)
  canPlay(modelId, slug) -> bool,          // hiddenInfo games need hiddenInfoCapable
  help: { [slug]: { quick, objective, yourTurn, legalActions, hiddenInfo, scoring, winRule,
                    firstMove, fullRules:[...strings], example } },   // all 37; written copy for the
                    // engine/scripted games, honest templates for the rest (from the mobile rule content)
  copy: { ...every string in brief §10 keyed, e.g. playNow:'Play now', signInToStart:'Sign in to start', ... },
  defaultsForNewPlayer: { game:'connect-four', modelId:'anthropic/claude-haiku-4.5', side:'p1' },
  providerHue(providerSlug) -> 0..359     // stable hash, for the tint behind a logo
};
```
`help` for at least these games must be real written copy (use
`../assets/03-design-canon/recommendations-for-arena.md` and the platform's mobile rule content
at `~/Downloads/eSlams/eSlamsPlatform/apps/mobile/src/arena/mobile-game-rule-content.ts`):
tic-tac-toe, connect-four, othello, chess, go, gomoku, hex, ultimate-tic-tac-toe, battleship,
goofspiel, rock-paper-scissors, prisoners-dilemma, first-price-sealed-bid-auction,
no-limit-texas-holdem, liars-dice, gin-rummy, bargaining, negotiation.

## 4. `ESE` (engines.js) [B]

Pure functions, no DOM. State objects are plain, immutable (return new objects).

```js
window.ESE = {
  engines: {
    [slug]: {
      slug, family,
      start({ humanSide:'p1'|'p2', seed:number }) -> state,
      legal(state) -> [ { token, label, shortLabel, hint, kind:'cell'|'col'|'move'|'choice'|'value'|'card'|'bid',
                          cell?:{r,c}, col?, from?, to?, choice?, value? } ],   // empty if not human's turn
      apply(state, action) -> state,
      ai(state, { seed }) -> action,            // engine's move for the model seat; deterministic for a seed
      terminal(state) -> null | { winner:'p1'|'p2'|'draw', reason:string, line?:[{r,c}...], scores?:{p1,p2} },
      explain(stateBefore, action, stateAfter) -> string,   // player-language reasoning for the model's move
      view(state) -> ViewState,                 // what ESB renders, see §5
      toMove(state) -> 'p1'|'p2'|null
    }
  },
  engineGames: ['tic-tac-toe','connect-four','othello','gomoku','hex','ultimate-tic-tac-toe',
                'rock-paper-scissors','prisoners-dilemma','first-price-sealed-bid-auction','goofspiel'],
  scripted: {
    // legal-by-construction recorded games for every non-engine game. Chess uses a real famous game
    // (moves and resulting positions hard-coded as piece maps per ply); card games deal from a real
    // shuffled deck with a seed; dice from seeded rolls; etc. Minimum 8 frames each, a terminal frame last.
    [slug]: () -> { frames:[ViewState...], ledger:[LedgerRow...], result:{winner:'p1'|'p2'|'draw', line:string, scores?} }
  },
  preview(slug, seed) -> frames[]                 // 6..12 ViewStates for living previews; engine games
                                                  // run ai-vs-ai from start; scripted games slice `scripted`
  recordGame(slug, { humanSide, seed }) -> { frames:[ViewState], ledger:[LedgerRow], result, moves:number }
                                                  // full legal game ai-vs-ai, used for "Your matches" fixtures
};
// LedgerRow = { turn:number, seat:'you'|'model'|'seat1'..'seat4', action:string (player language),
//               reasoning:string|null, cell?:{r,c} }
```
Reasoning strings are the voice of the product: one or two dry sentences, player language
("Takes the centre. It keeps three lines open."). Hidden-information games produce `reasoning: null`.

## 5. `ESB` (boards.js + boards.css) [C]

```js
window.ESB = {
  render(el, props) -> controller            // mounts into el (empties it first)
  // props = { family, view, size:'preview'|'stage'|'poster'|'share', interactive:boolean,
  //           legal:[actions], onAction(action), lastMove, reveal:boolean, youSeat:'p1'|'p2'|'seat1'..,
  //           seats:[{id,label,name,providerSlug,isYou}], reducedMotion:boolean }
  // controller = { update(props), destroy() }
  // Must animate the delta between successive views: piece arrive -> one ring pulse -> thin accent outline;
  // Connect Four gravity drop; Othello flips; card deal/fan/reveal; dice tumble; simultaneous reveal.
  providerTile(model, size=34) -> HTMLElement   // logo on tint, initials fallback; uses ESA + ESD.providerHue
  youTile(size=34) -> HTMLElement               // accent "You" tile
  glyph(arenaOrGame, size=22) -> HTMLElement    // arena glyph tile (uses ESA.icons g_*)
  card(cardObj, {faceUp, size}) -> HTMLElement  // flat card primitive: mono corner rank, suit glyph, red/black as information only
};
```
ViewState per family (the engine/scripted side produces exactly these):

| family | ViewState |
|---|---|
| grid_3x3 | `{family, rows:3, cols:3, cells:[['X','O',''],...], lastMove:{r,c}|null, winLine, ultimate?:{boards:[9 x 3x3], active:idx|null, won:[9]}}` |
| connect_four | `{family, rows:6, cols:7, cells:[[ 'R'|'Y'|'' ]], lastMove, winLine}` |
| square_board | `{family, rows:8, cols:8, pieces:[{r,c,piece:'wK'|'bP'|'w'|'b'|'wk'...}], lastMove:{from,to}|{r,c}, highlights:[{r,c}], flipped?:[{r,c}], fog?:boolean, shots?:[{r,c,hit}]}` (chess uses letter pieces, othello/checkers discs) |
| go_board | `{family, size:9|15, stones:[{r,c,color:'B'|'W'}], lastMove, captured?:[{r,c}], winLine?}` |
| hex_board | `{family, size:11, cells:[{r,c,color}], lastMove, path?:[{r,c}]}` |
| card_table | `{family, seatLayout, seats:[{id,label,isYou,cards:[{rank,suit}|{hidden:true}] ,count,chips?,role?,folded?}], center:{label, cards:[...]}, pot?, phase:string, yourHand:[{rank,suit}], lastAction?:{seat,label}}` |
| dice_table | `{family, seats:[{id,label,isYou,diceCount,dice?:[1..6]}], bid:{count,face}|null, revealed:boolean, lastAction}` |
| payoff_matrix | `{family, choices:['Cooperate','Defect'] or RPS, matrix:[[ [a,b] ]], picks:{p1,p2}|null (null until reveal), revealed:boolean, history:[{p1,p2}], scores}` |
| auction_panel | `{family, yourValue, bids:{p1,p2}|null, revealed, winner, history:[...]}` |
| economic_panel | `{family, offers:[{seat,value,round}], current:{...}, settled:boolean, payoffs?}` |
| custom | `{family, kind:'mancala'|'morris'|'pentago'|'backgammon'|'shogi'|'xiangqi', ...kind-specific minimal fields}` (render an honest schematic board) |

Boards: large rounded cells one step lighter than the surface, hairline grid (`--board-line`),
faint desaturated-accent dots on empty cells, pieces in `--stone-*` and seat-neutral fills, accent
only for last move / active / result. Connect Four discs carry an interior ring shape cue. Hidden
hands are face-down showing count only. Sizes: `preview` fits 160–220px, `stage` fills 354px width,
`poster` 120px, `share` 300px.

Input overlays when `interactive`: cell_tap (tap a legal cell; Connect Four taps a column; press-hold
previews), piece_move (tap piece → legal target dots → tap target), card_action (tap to select, tap
again to play), simultaneous_choice (two/three large chips), value_entry (slider + stepper + one commit
verb), dice_bid (count × face stepper + Call). Call `onAction(action)` once with the engine action.

## 6. `ESApp` (app.js, app.css, canvas.css, index.html) [D]

State machine with these screens (brief §7): `home`, sheet `table`, sheet `roster`, sheet `howto`,
sheet `signin` (steps: choose, email-signin, create, twofactor, onboarding1, onboarding2, onboarding3,
signing), `riser`, `stage` (play), `result`, `replay`, push `matches`, push `settings`, menu `avatar`,
sheet `leave`, card `conflict`. Everything renders inside `#phone` (390×844, overflow hidden) with a
status bar (`9:41`, signal, battery) and a home indicator.

Persisted on `localStorage['eslams-arena-proto']`: theme pref, signedIn, username, last setup
(game, modelId, side/seats, visibility), settings (sound, haptics), yourMatches (fixtures generated
on first run via `ESE.recordGame`).

Simulations (dev-only, exposed via `window.ESApp.dev` and the canvas Controls panel):
`setTheme('system'|'light'|'dark')`, `setSignedIn(bool)`, `setReducedMotion(bool)`,
`modelDelayMs(min,max)` default 1500–5000, `forceStage('thinking'|'keep_waiting'|'claim')`,
`forceEngine('ok'|'cold'|'unavailable')`, `forceConflict(bool)`, `reset()`.
Model turn stages follow the brief: pending → thinking (10s) → keep_waiting_offer (30s) →
claim_eligible (120s); the dev panel can jump them.

Required flows that must work end to end in the prototype:
1. Cold launch → brand beat (<1.2s, skippable) → Home with Play now (Connect Four vs Claude Haiku 4.5, Ready).
2. Play now → (signed out) sign-in sheet → provider or email → (2FA on demand) → onboarding (3 steps, first time) → curtain-riser → Stage → human plays Connect Four against the real engine → result curtain → visibility → Share (renders the share card) → Play again.
3. Arenas grid → chip filter → arena tile → table sheet → change table → how to play (fold/expand) → opponent change via roster (search, shuffle, statuses, hidden-info 4-model case on a card table) → side → Start.
4. A 4-seat table (No-Limit Hold'em): seat ring, your seat 1–4, tap seat to swap, Auto-fill, readiness `3 model seats · Ready` → start → demo stage (scripted, `demo` pill) → result in chips.
5. Leave mid-match → Home shows Resume card → resume. Start another while one is live → conflict card.
6. Dev-forced stages: Taking longer than usual (30s), Claim the win (120s) → timeout result with footnote. Cold engine → riser escalation; unavailable → designed state.
7. Avatar → Your matches → open a replay (scrubber + reasoning ledger) → swipe-down/close. Settings → Appearance/Sound/Haptics/Account/Delete account/Sign out.
8. Reduced motion toggle: every beat snaps.

Canvas (page around the phone), mirroring the v3 prototype: dark page `#101014`; header block
(eyebrow `ESLAMS · THE ARENA APP · V1 · INTERACTIVE PROTOTYPE`, title, one paragraph); left the
device frame; right a column of panels: **Controls** (theme, signed in, reduced motion, model speed,
force stage, engine, conflict, reset), **App icon** (the mark on the squircle, dark/light), **Share
card** (live render of the last result in both themes), **States** (a short list of the honest
states and how to trigger them), **Copy deck**. Panels use the `.cv-` prefix and may use hex values.

## 7. Integration and QA [F]

After A–E deliver, F owns every file. F runs `python3 build.py`, serves the folder, drives the eight
flows with Playwright (`node` from `~/Downloads/eSlams/eSlamsPlatform/apps/web`
can `const { chromium } = require('@playwright/test')`; browsers live in `~/Library/Caches/ms-playwright`), screenshots both themes into `qa/`, fixes defects in place, and
rebuilds. Definition of done: all eight flows pass; no console errors; both themes; reduced motion;
the single-file `eSlams Arena App.html` opens from `file://` with no network except Google Fonts.
