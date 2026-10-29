# Physics validation

The 50 bundled demonstrations in `src/game/game-demonstrations.json` are synthetic public
artwork recorded from Core at the artwork pin (`7731e2f3`). This page explains what we mean by
their "physics", how it is checked on every `pnpm check`, what the last run found, and what the
traces cannot prove.

## What "physics" means here

A demonstration is physically sound when all four of these hold:

1. **Geometry.** The board has the right shape (6x7 Connect Four, 11x11 Hex rhombus, 24
   Nine Men's Morris points, 10x9 Xiangqi intersections, and so on). Where the renderer
   encodes geometry, it agrees with the rules: Hex neighbour sets, Morris mills and adjacency,
   the chess and checkers dark squares, the Mancala sowing loop, the paddle width against
   Core's bounce tolerance.
2. **Legality.** Every action is legal in the state it was played from, under Core's variant.
   Where that variant differs from the standard published rules, the finding is reported as
   `RULE` rather than hidden.
3. **Continuity.** Nothing appears, vanishes or teleports. Stones, seeds, checkers, chips,
   cards and tiles are conserved. Control tasks follow their dynamics: CartPole and
   MountainCar are replayed with the Gym equations.
4. **Motion matches the move.** The cue the renderer draws for a frame covers exactly the cells
   the move touched. A placement marks one cell, a chess move marks from and to, and a terminal
   line win highlights the line.

## How the validator works

- `scripts/validate-demonstrations.py` is stdlib-only Python and runs with `python3 -I`. It does
  **not** import Core. Every game's rules are re-implemented independently:
  - exact simulation for tic-tac-toe, Connect Four, Go (captures and suicide), Gomoku, Hex,
    Othello (exact flip sets), Pentago, Ultimate tic-tac-toe, Checkers, Mancala and Backgammon;
  - chess move legality from FEN, including king safety, castling rights, clocks and SAN;
  - piece geometry, hands, palace and river for Shogi and Xiangqi;
  - conservation and arithmetic invariants for every other game.
- It also parses `src/game/scene.tsx` and `src/game/cues.ts`:
  - It checks the Morris geometry against Core's adjacency.
  - It replays the last-move and win-line cue rule (`deriveCellCues`) in Python for the nine
    cell-board games. For every transition, the derived `last` cells must equal the move's
    cells: one placed stone (never Go captures or Othello flips), from and to for chess (four
    squares for castling, three for en passant), at least one cell for Pentago's
    place-and-rotate.
  - A terminal line win must produce a line of the right length (3, 4 or 5) in the last
    mover's colour. A draw must produce none.
  - `CUE_RULE_VERSION` in `cues.ts` must equal the mirror's version, so changing the TypeScript
    rule without updating the Python twin fails the check.
- Severity levels:
  - `FAIL`: the trace contradicts the rules or physics.
  - `KNOWN`: a FAIL that is allowlisted as an upstream Core bug.
  - `RULE`: legal in Core's variant but not under standard rules.
  - `RENDER`: the data is fine, but the bundled renderer misrepresents it.
  - `NC`: not checkable from public data.
- **Allowlist.** `scripts/physics-known-issues.json` lists upstream Core engine bugs at the
  artwork pin. An entry matches on slug, frame and check id, and turns that FAIL into `KNOWN`.
  The validator prints `KNOWN` entries and exits 0 when they are the only failures. It exits 1
  on any other FAIL, or on a stale entry that no longer matches anything. Renderer bugs never
  belong in the allowlist.
- `scripts/selftest-mutations.py` plants 25 errors and requires each one to be caught:
  - 23 trace corruptions: a teleported stone, a missing flip, an illegal jump, a phantom hand
    piece, created chips, a wrong trick winner, a pole teleport, a paddle teleport, and so on;
  - 2 renderer-source corruptions: `CellScene` stops passing cues, or the cue rule version
    changes without the mirror.

## How to run it

```sh
pnpm check:physics                         # validator, then the mutation self-test
python3 -I scripts/validate-demonstrations.py --json     # machine-readable results
python3 -I scripts/validate-demonstrations.py --strict   # also fail on KNOWN/RULE/RENDER
```

`pnpm check` runs it after the tests, and CI runs `pnpm check` on `ubuntu-latest` with its
system `python3`.

## Results (50 games, 672 transitions, artwork pin `7731e2f3`)

Summary: 37 PASS, 9 PASS-with-RULE, 3 PASS-with-RENDER, 1 KNOWN (taxi), 0 FAIL.

`generic` means:

- frames = actions + 1, and `turn` equals the frame index;
- the game is terminal only on the last frame, and `outcomeReason` is present only then;
- the "Complete ·" caption appears only on the terminal frame;
- every other caption names the actual actor and action (or "sealed choice").

| slug | family / board | frames | checks run | result |
|---|---|---|---|---|
| alien-shooter | scene/control | 13 | generic + aliens+destroyed conserved, player_x ±1 within 0..7, destroyed monotone, invasion when an alien reaches row 0 | **PASS** |
| backgammon | scene/board | 13 | generic + 24 points, dice 1-6, move distance==unused die, direction(P1 up/P2 down), no landing on >=2 opp, hit->bar, checker conservation(5/side Core variant), dice exhausted before turn passes, renderer draws bar/borne_off | **PASS*(RULE)** — RULE@- Core variant uses 5 checkers/side; standard backgammon uses 15 |
| bargaining | scene/social | 4 | generic + alternating offers, share/price bounds, accept terminates with last offer, turn-order | **PASS** |
| battleship | scene/board | 13 | generic + grid_size, one-new-shot-per-action at action cell, no repeat shots, hits==hit shots, renderer grid==grid_size, turn-order | **PASS** · NC: ship placement is private; hit/miss truth not checkable |
| bipedal-walker | scene/control | 48 | generic + distance += velocity, feet alternate, energy -2 per step, torso within ±.2 except balance | **PASS** |
| blackjack | scene/cards | 3 | generic + card values 1-11, hit adds one card, dealer draws to >=17, terminal on stand/bust | **PASS*(RENDER)** — RENDER@0 dealer hole card omitted from public state; renderer shows 1 card instead of up-card + face-down card · NC: cards carry no suit; deck composition not checkable |
| boxing-style-arena | scene/control | 13 | generic + health non-increasing, 0≤stamina≤100, jab only damages at distance 1, step-in reduces distance, turn-order | **PASS** |
| bridge | scene/cards | 13 | generic + trick winner per led suit/trump, winner leads next, rotation within trick, hand counts -1, no card played twice, provable revoke (failed to follow then later played led suit), tricks tally | **PASS*(RENDER)** — RENDER@- dummy hand is public after the opening lead in bridge; frames carry only hand_counts so dummy can't be shown |
| car-racing | scene/control | 8 | generic + progress monotone ≤1, speed monotone on accelerate, track window shifts | **PASS** |
| cartpole | scene/control | 61 | generic + Gym CartPole Euler integration (tau .02, F 10), |x|<2.4 & |theta|<.2095 while live, max error 9.2e-07 | **PASS** |
| checkers | scene/board | 13 | generic + 8x8, pieces-on-dark-squares, renderer-dark==(r+c)%2, diagonal-step/jump, man-forward-only, mandatory-capture, multi-jump-continuation, promotion, piece-conservation | **PASS** |
| chess | Board square+chess 8x8 | 11 | generic + 8x8 from FEN, piece-geometry+path, side-to-move, king-not-left-in-check, castling-shape/rights, en-passant, promotion-shape, castling-rights-update, halfmove/fullmove clocks, SAN==move, a1-dark-square(renderer), turn-order, cues: last==move cells, cues: win line on terminal frame | **PASS** |
| cliff-walking | scene/grid | 14 | generic + single-step moves, in-bounds, no hole/cliff entry, terminal at goal | **PASS** |
| connect-four | Board connect_four 6x7 | 8 | generic + 6x7, gravity, drop-lands-lowest, R=P1/Y=P2, four-in-row only at terminal, turn-order, cues: last==move cells, cues: win line on terminal frame | **PASS** |
| crazy-eights | scene/cards | 13 | generic + match rank or suit (8 wild), play: hand-1, draw: hand+1 & deck-1, card conservation(52), no card played twice, turn-order | **PASS** · NC: declared suit after an 8 is not in public state; checked against the 8's own suit |
| cribbage | scene/cards | 3 | generic + 6-card deal, discard 2 to crib, no duplicate cards, card syntax | **PASS*(RULE)** — RULE@- Core variant ends at showdown after the crib discard (no pegging/counting shown) |
| dou-dizhu | scene/cards | 13 | generic + 54 cards (17/17/20), play beats last_play (single rank order), two passes reset lead, rotation, hand -len(cards), turn-order | **PASS** |
| euchre | scene/cards | 12 | generic + trick winner per led suit/trump, winner leads next, rotation within trick, hand counts -1, no card played twice, provable revoke (failed to follow then later played led suit), tricks tally | **PASS*(RULE)** — RULE@- Core variant is 2-player; standard euchre is 4-player |
| first-price-sealed-bid-auction | scene/social | 3 | generic + hidden until both chose, revealed == actions, valid action set, turn-order | **PASS** · NC: winner / payoff values are not in frame state (only outcomeReason); renderer cannot show who won |
| frozen-lake | scene/grid | 7 | generic + single-step moves, in-bounds, no hole/cliff entry, terminal at goal | **PASS** |
| gin-rummy | scene/cards | 13 | generic + draw->discard phase, hand 7<->8, card conservation(52) | **PASS*(RULE)** — RULE@- Core deals 7 cards; standard gin rummy deals 10 |
| go | Board go 9x9 | 13 | generic + 9x9 square, place-on-empty, B=P1/W=P2, capture-removes-dead-groups-only, no-suicide, stone-count-conservation, turn-order, cues: last==move cells, cues: win line on terminal frame | **PASS** · NC: ko / superko not checked (no repeated positions in trace) |
| gomoku | Board go 15x15 | 13 | generic + 15x15, place-on-empty, B=P1/W=P2, no-five-before-terminal, turn-order, cues: last==move cells, cues: win line on terminal frame | **PASS** |
| goofspiel | scene/social | 11 | generic + each bid card used once, prizes each once, higher bid wins prize, points conservation, bids hidden until both, turn-order | **PASS** |
| hanabi | scene/cards | 7 | generic + fireworks +1 on successful play, clues 0..8, lives 0..3, deck-1 per draw, hand refills while deck>0, discard grows by one, turn-order | **PASS*(RULE)** — RULE@4 discarded with 8 clue tokens (forbidden in standard Hanabi); RULE@5 discarded with 8 clue tokens (forbidden in standard Hanabi); RULE@6 discarded with 8 clue tokens (forbidden in standard Hanabi); RULE@- Core variant: 2 colours, 12-card deck; standard Hanabi has 5 colours/50 cards |
| hearts | scene/cards | 13 | generic + trick winner per led suit/trump, winner leads next, rotation within trick, hand counts -1, no card played twice, provable revoke (failed to follow then later played led suit), tricks tally | **PASS*(RULE)** — RULE@1 first trick led with 3H; standard Hearts requires 2C lead; RULE@1 player_1 led 3H before H broken while holding 5C; RULE@- Core variant is 2-player; standard hearts is 4-player |
| hex | Board hex 11x11 | 13 | generic + 11x11 rhombus, place-on-empty, B=P1/W=P2, no-connection-before-terminal, renderer-adjacency==rule-adjacency, edge-colour==goal-axis, turn-order, cues: last==move cells, cues: win line on terminal frame | **PASS** |
| ice-hockey-style-arena | scene/control | 13 | generic + positions within rink, x moves ≤1, goals monotone, puck owner is a player, renderer: two skaters on one cell, turn-order | **PASS*(RENDER)** — RENDER@6 both skaters on the same cell; scene draws one disc on top of the other; RENDER@7 both skaters on the same cell; scene draws one disc on top of the other; RENDER@8 both skaters on the same cell; scene draws one disc on top of the other; RENDER@9 both skaters on the same cell; scene draws one disc on top of the other; RENDER@10 both skaters on the same cell; scene draws one disc on top of the other |
| leduc-holdem | scene/cards | 9 | generic + chip conservation(stacks+pot), pot==sum(contributions), committed resets per street, board size per street, no duplicate board cards, card syntax, actor rotation over non-folded, check only when matched | **PASS*(RULE)** — RULE@- Leduc Hold'em is a 2-player game; trace has 4 seats · NC: hole cards are private; hand strength/showdown winner not checkable (no winner in frame) |
| liars-dice | scene/social | 4 | generic + bids strictly increase, 5 dice/player values 1-6, challenge resolution count, turn-order | **PASS** · NC: bid 3x5, actual 2 (ones-wild variant would be 2); winner not in state |
| limit-texas-holdem | scene/cards | 13 | generic + chip conservation(stacks+pot), pot==sum(contributions), committed resets per street, board size per street, no duplicate board cards, card syntax, actor rotation over non-folded, check only when matched | **PASS** · NC: hole cards are private; hand strength/showdown winner not checkable (no winner in frame) |
| lunar-lander | scene/control | 18 | generic + y += vy (semi-implicit), x += vx, idle: vy -= .028 gravity, main burns fuel, fuel monotone, landing inside pad, renderer pad == state pad | **PASS** |
| mahjong | scene/cards | 13 | generic + tile conservation(wall+hands+discards), discarder -1 / next draws +1, rotation 1-4, discard_pile matches action, turn-order | **PASS*(RULE)** — RULE@- Core variant: 108 tiles (no honours), 10-tile hands; standard mahjong uses 136/144 tiles and 13-tile hands · NC: calls (pung/chow/kong) not present in trace |
| mancala | scene/board | 13 | generic + 2x6 pits + 2 stores, sowing CCW skip opp store, capture(opposite non-empty), extra-turn on store, seed-conservation(48), renderer-ccw-layout | **PASS** |
| mountain-car | scene/control | 61 | generic + Gym MountainCar dynamics (v+=.001a-.0025cos3x), |v|<=.07, x>=-1.2 | **PASS** |
| negotiation | scene/social | 4 | generic + alternating offers, share/price bounds, accept terminates with last offer, turn-order | **PASS** |
| nine-mens-morris | scene/board | 13 | generic + 24 points, renderer-points/lines collinear, renderer-adjacency==rule-adjacency, placement-on-empty, reserves-decrement, mill=>removal, turn-order | **PASS** |
| no-limit-texas-holdem | scene/cards | 13 | generic + chip conservation(stacks+pot), pot==sum(contributions), committed resets per street, board size per street, no duplicate board cards, card syntax, actor rotation over non-folded, check only when matched | **PASS** · NC: hole cards are private; hand strength/showdown winner not checkable (no winner in frame) |
| othello | Board square 8x8 | 13 | generic + 8x8, standard-opening, move-must-flip, exact-flip-set, B=P1/W=P2, pass-only-when-no-move, turn-order, cues: last==move cells, cues: win line on terminal frame | **PASS** |
| paddle-ball | scene/control | 61 | generic + paddle ±.12 clipped [0,1], ball x/y += v, wall reflections, paddle bounce only when |ball-paddle|<=.16 (=renderer half-width), bounces counter | **PASS** |
| pentago | Board square 6x6 | 13 | generic + 6x6, place-on-empty, quadrant-rotation(cw/ccw), no-five-before-terminal, turn-order, cues: last==move cells, cues: win line on terminal frame | **PASS** |
| prisoners-dilemma | scene/social | 3 | generic + hidden until both chose, revealed == actions, valid action set, turn-order | **PASS** · NC: winner / payoff values are not in frame state (only outcomeReason); renderer cannot show who won |
| rock-paper-scissors | scene/social | 3 | generic + hidden until both chose, revealed == actions, valid action set, turn-order | **PASS** · NC: winner / payoff values are not in frame state (only outcomeReason); renderer cannot show who won |
| shedding-card-game | scene/cards | 13 | generic + match rank or suit, play: hand-1, draw: hand+1 & deck-1, card conservation(52), no card played twice, turn-order | **PASS** |
| shogi | scene/board | 13 | generic + 9x9, USI-coordinates, piece-geometry+path, captures->hand(demoted), promotion-zone, piece-conservation(40), turn-order | **PASS** · NC: check/checkmate, nifu, uchifuzume not checked |
| spades | scene/cards | 13 | generic + trick winner per led suit/trump, winner leads next, rotation within trick, hand counts -1, no card played twice, provable revoke (failed to follow then later played led suit), tricks tally | **PASS*(RULE)** — RULE@9 player_1 led 3S before S broken while holding 5C; RULE@- Core variant is 2-player; standard spades is 4-player |
| taxi | scene/grid | 11 | generic + single-step moves, in-bounds, no hole/cliff entry, terminal at goal | **KNOWN** — KNOWN@10 after dropoff passenger reported at [0, 0] (pickup origin), not destination [4, 0]: passenger teleports; scene.tsx masks it with the `delivered` flag |
| tic-tac-toe | Board grid_3x3 | 10 | generic + 9 cells, place-one-mark, X=P1/O=P2, no-win-before-terminal, terminal-reason, turn-order, cues: last==move cells, cues: win line on terminal frame | **PASS** |
| ultimate-tic-tac-toe | Board grid_3x3 9x9 | 13 | generic + 9x(3x3), action=board*9+cell, must-play-in-next_board, next_board=cell-or-free, local_status, turn-order, cues: last==move cells, cues: win line on terminal frame | **PASS** |
| xiangqi | scene/board | 13 | generic + 10x9 intersections, file-letter/row-digit coords, piece-geometry(R,H-leg,E-eye+river,A/G-palace,C-screen,S-river), flying-general, piece-conservation, turn-order | **PASS** · NC: check/checkmate not checked |

Regenerate this table with `python3 -I scripts/validate-demonstrations.py --markdown`. Keep it
in sync when the traces or rules change.

## Known Core issues to file upstream

These come from Core's public state or variants. The renderer cannot fix them, and regenerating
the traces from the same pin reproduces them.

| Issue | Where | Status |
|---|---|---|
| Taxi: after dropoff the passenger is reported back at the pickup point `[0,0]` instead of the destination `[4,0]` | `taxi` frame 10 | `KNOWN` (allowlisted). The scene hides the waiting marker on the delivered frame. |
| Hearts: the first trick is led with 3H instead of 2C, and hearts are led before being broken | `hearts` frame 1 | `RULE` |
| Spades: spades are led before being broken while the leader still holds a club | `spades` frame 9 | `RULE` |
| Hanabi: discards are made while holding 8 clue tokens | `hanabi` frames 4-6 | `RULE` |
| Limit and No-limit hold'em demos are frame-for-frame identical: the generator always picks "check", so no bet, raise or fold is ever shown | `scripts/generate-demonstrations.py` plan | generator plan, needs a regeneration |
| Leduc Hold'em is seated 4-handed; it is a 2-player game | `leduc-holdem` | `RULE` |

Other variant deviations: Hearts, Spades and Euchre are 2-player; Hanabi uses 2 colours and 12
cards; Gin rummy deals 7; Mahjong uses 108 tiles and 10-tile hands; Backgammon has 5 checkers a
side; Cribbage stops after the crib discard, with no pegging. These are disclosed in the demo
caption through `VARIANT_NOTES` in `src/game/cues.ts`. Core owns the rules, and each note must
be removed once a regenerated trace plays the standard game.

## What the traces never exercise

The bundled plans never reach these situations, so they are proven only by the mutation
self-test and the rules code, not by real data:

- Go capture (and ko or superko);
- a Nine Men's Morris mill and removal;
- a Backgammon hit (checker to the bar) or bearing off;
- poker bet, raise and fold;
- chess castling, promotion and en passant;
- calls in Mahjong (pung, chow, kong); Shogi and Xiangqi check and checkmate.

Private information (hole cards, ship placement, hands) is not in public frames. Follow-suit
can therefore only be checked as a *provable revoke*: a player fails to follow, then later
plays the led suit.

## Artwork pin vs runtime pin

These results certify the artwork pin only: Core `7731e2f3`, recorded in
`src/game/game-demonstrations-source.json`. The production Platform runs other arena versions.
`docs/game-coverage.json` marks **32 of 50 games** `sameArenaVersion: false`. For those games
a live match may legally do things the demos never show, or follow different rules. A host
rendering live state must validate against the live arena, not against this page.
