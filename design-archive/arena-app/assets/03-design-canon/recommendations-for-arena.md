# Recommendations for Arena

Date: 2026-06-15

## Executive Summary

Arena should become a clean human-vs-model product, not a dumping ground for every Core arena that can technically step. The current catalogue is healthy from an engine perspective, but the product surface is over-broad: all 50 games are marked playable, including single-controller RL/control tasks and expert games that are hard to understand without rules, examples, and table context.

The recommended direction:

1. Keep Arena focused on games where a human can understand the goal, take a meaningful turn, and feel they are playing against one or more AI opponents.
2. Move single-controller RL/control games out of Arena into eValk/eval or a separate "Control Benchmarks" surface.
3. Add an optional "Understand this game" rules popup beside every retained board/table.
4. Hide true multi-seat games from public Arena until the user can select models for each non-human seat.
5. Use a staged launch set, not all 50 games at once.

## Evidence Base

- Core exposes 50 built-in public smoke arenas and commands for game, renderer, and smoke metadata in `eSlams Core/docs/ARENAS.md`.
- Platform's canonical catalogue marks all 50 games as `playable` in `packages/core-types/src/game-catalog.ts`.
- Platform currently treats every non-empty game slug as browser playable in `apps/web/components/platform-pages.tsx`.
- A production smoke artifact from 2026-06-09 shows all 50 games could start and accept a first human action against `openai/gpt-5-mini`.
- Core public metadata marks all 12 RL/control games as `players: 1`, while several Core implementations keep an internal `player_2` as environment/baseline.
- Car Racing explicitly accepts actions only from `player_1`; this is representative of the single-controller mismatch.

External UX basis:

- NN/g's progressive disclosure guidance supports keeping the primary UI simple and moving advanced details into optional surfaces.
- NN/g's onboarding/contextual-help guidance argues against forced tutorials and for available, unintrusive contextual help.
- Useful references: [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/), [Onboarding Tutorials vs. Contextual Help](https://www.nngroup.com/articles/onboarding-tutorials/), and [Help and Documentation](https://www.nngroup.com/articles/help-and-documentation/).

## Product Principle

Arena should answer one question immediately:

> "What can I play against an AI model right now, and what do I do on my turn?"

Anything that cannot answer that cleanly should be removed from the main Arena, even if Core can run it.

## Recommended Game Disposition

### Keep in Main Arena v1

These are the strongest candidates for a clean human-vs-model Arena. They are turn-based, explainable, and can be made understandable with compact rules/help. The default "Play now" rail should show only 6-8 of these at a time; the full v1 list can sit behind Browse.

| Game | Why It Belongs | Required UX Before Polishing |
|---|---|---|
| Tic-Tac-Toe | Simple, instant, familiar | Basic rules popup only |
| Connect Four | Simple, visual, satisfying | Basic rules popup only |
| Othello | Visual flips, understandable goal | Explain legal moves and flips |
| Chess | Marquee game, highly recognizable | Move notation help, legal move highlighting |
| Go | Marquee strategy game | Explain 9x9 variant, liberties, captures, territory simply |
| Gomoku | Simple "five in a row" goal | Explain board size and win condition |
| Hex | Strong visual goal once explained | Explain side-connection objective |
| Ultimate Tic-Tac-Toe | Familiar base game with interesting twist | Show active-board guidance clearly |
| Battleship | Familiar hidden-info game | Explain ships, shots, hit/miss, hidden boards |
| Goofspiel | Simple auction/card contest | Explain prize card and bid card |
| Rock Paper Scissors | Instant and legible | Basic matchup rules |
| Prisoner's Dilemma | Very simple strategic choice | Explain payoff matrix and one-shot nature |
| First-Price Sealed-Bid Auction | Simple economic game | Explain private value, sealed bid, highest bid wins |

### Keep Only After UX/Rules Improvements

These are valid games, but too opaque for a clean first-pass Arena without richer help, better action labels, and stronger visual explanation.

| Game | Concern | Recommendation |
|---|---|---|
| Checkers | Needs a good clickable checkers board | Keep after mandatory-capture UX |
| Shogi | High rule burden, unfamiliar notation | Advanced Arena only after strong tutorial/help |
| Xiangqi | High rule burden, unfamiliar notation | Advanced Arena only after strong tutorial/help |
| Mancala | Sowing is easy once visualized, opaque as raw actions | Keep after pit-click/sowing UI |
| Nine Men's Morris | Phases are not obvious | Keep after phase-specific help |
| Pentago | Rotation action is unintuitive | Keep after "place + rotate" action preview |
| Backgammon | Dice/bar/bearing-off are too much for generic action buttons | Keep after board-specific UI |
| Blackjack | Dealer game, not exactly "vs model" | Reframe as dealer challenge or move to table/card lab |
| Gin Rummy | Needs hand/discard/deck UI | Keep after card-table UX |
| Cribbage | Scoring is not intuitive | Keep after crib/discard/scoring UX |
| Liar's Dice | Bluffing is good, but requires dice/bid ladder UI | Keep after dice and challenge UI |
| Bargaining | Social/economic rules need context | Keep after offer/payoff explanation |
| Negotiation | Offer dimensions are abstract | Keep after price/delivery objective explanation |
| Leduc Hold'em | Poker variant unfamiliar | Keep after poker-table help |
| Limit Texas Hold'em | Heads-up poker may feel thin | Consider table-mode roadmap |
| No-Limit Texas Hold'em | Heads-up poker may feel thin | Consider table-mode roadmap |
| Shedding Card Game | Public metadata says 4-player, Core engine is 2-player | Fix metadata/copy before main Arena |
| Hearts | Public metadata says 4-player, Core engine is 2-player | Hide until 4-seat version or relabel variant |
| Spades | Public metadata says 4-player, Core engine is 2-player | Hide until 4-seat version or relabel variant |
| Euchre | Public metadata says 4-player, Core engine is 2-player | Hide until 4-seat version or relabel variant |
| Crazy Eights | Public metadata says 4-player, Core engine is 2-player | Relabel as 2-player or hide |
| Hanabi | Cooperative/hidden-info game is hard to understand | Hide until help and model-seat UX mature |

### Remove from Main Arena

These should move to eValk/eval suite or a separate Control Benchmarks surface. They are not clean human-vs-model games in the product sense.

| Game | Why Remove from Arena |
|---|---|
| Taxi | Single-controller RL task; the opponent is effectively environment/scoring |
| Frozen Lake | Single-controller gridworld benchmark |
| Cliff Walking | Single-controller gridworld benchmark |
| CartPole | Single-controller control benchmark |
| Mountain Car | Single-controller control benchmark |
| Lunar Lander | Single-controller control benchmark |
| Car Racing | Single-controller control task; confusing as a "vs model" Arena game |
| Bipedal Walker | Single-controller control benchmark |
| Paddle Ball | Single-controller arcade benchmark |
| Alien Shooter | Single-controller arcade benchmark |
| Boxing Style Arena | The user-facing concept is too game-like/arcade and weakly aligned with clean Arena; remove for now |
| Ice Hockey Style Arena | Same issue: arcade/sports simulation, not a clean board/table Arena game |

### Hide Until Multi-Model Table Mode Exists

These are true table/multi-seat games. They should not be normal one-model Arena entries. A human should select their seat, then choose a model for each other seat, or use "auto-fill table."

| Game | Seat Model Needed |
|---|---|
| Mahjong | 1 human + 3 model seats |
| Dou Dizhu | 1 human + 2 model seats |
| Bridge | 1 human + 3 model seats, with partnership explanation |

## "Understand This Game" Popup

Add a compact optional popup next to the board. It should be available before launch and during play, but never forced. Recommended button labels:

- `How to play`
- `Rules`
- `What can I do?`

Recommended placement:

- Desktop: right side of board, above legal actions.
- Mobile: sticky icon button in the play header, opens bottom sheet.
- Setup page: small link inside selected game preview.

Recommended popup sections:

1. Objective: one sentence on how to win.
2. Your turn: what the human controls right now.
3. Legal actions: decode the action buttons or board highlights.
4. Hidden information: what you cannot see and why.
5. Scoring/result: how win/loss/draw is decided.
6. First move tip: one safe beginner nudge.
7. Example action: show one real legal action token translated into plain English.

Do not show a long rulebook by default. Use progressive disclosure:

- Summary tab: 5-7 short bullets.
- Actions tab: current legal action types and examples.
- Details tab: full variant notes.

## Help Content by Game Family

### Grid and Placement Board Games

Games: Tic-Tac-Toe, Connect Four, Othello, Go, Gomoku, Hex, Pentago, Ultimate Tic-Tac-Toe.

Popup emphasis:

- How placement works.
- Which cells are legal.
- What line/territory/connection/flips mean.
- Why a cell is disabled.
- What the highlighted last move means.

### Movement Board Games

Games: Chess, Checkers, Shogi, Xiangqi, Backgammon, Mancala, Nine Men's Morris.

Popup emphasis:

- Which piece/pit/point can move.
- How source-to-target actions are represented.
- Special rules: captures, promotion, drops, bearing off, mills, extra turns.
- A "select source, then target" interaction explanation.

### Card and Hidden-Info Games

Games: Blackjack, Gin Rummy, Cribbage, Liar's Dice, Goofspiel, poker variants, Hearts/Spades/Euchre/Crazy Eights/Hanabi if retained later.

Popup emphasis:

- What information is hidden.
- What the public table state means.
- What the current phase is.
- What each action verb means: hit, stand, draw, discard, bid, call, raise, fold, pass, challenge.
- How the hand ends.

### Social and Economic Games

Games: Prisoner's Dilemma, Bargaining, Negotiation, First-Price Sealed-Bid Auction.

Popup emphasis:

- The payoff or utility model.
- What each choice commits to.
- Whether the action is simultaneous, sequential, or hidden.
- What "good" means: maximize your score, reach agreement, avoid overpaying.

### Multi-Seat Table Games

Games: Mahjong, Dou Dizhu, Bridge.

Popup emphasis:

- Seat map.
- Turn order.
- Which seats are models.
- Partnership/team structure when relevant.
- Current trick/round/phase.

These should wait for table-mode UI before returning to public Arena.

## Rules Popup Content Matrix

Use these as first-pass content packs for the retained and advanced Arena games. Removed control games should not receive main-Arena help copy; if they return, they should live in a separate Control Lab with different framing.

| Games | Objective | Turn Structure | Legal Actions | Hidden Info | Scoring / Win | First-Turn Advice |
|---|---|---|---|---|---|---|
| Tic-Tac-Toe, Connect Four, Gomoku | Make a line of 3, 4, or 5 | Players alternate; Connect Four uses gravity | Empty cell or legal column | None | Line wins; full board can draw | Prefer center/control lines |
| Hex | Connect your two target sides | Alternating placement | Any empty hex | None | First connected path wins | Build bridges, not isolated stones |
| Othello | Finish with more discs | Alternating placement | Place where at least one line flips | None | Disc count at game end | Corners and stable edges matter |
| Checkers | Capture or block the opponent | Alternating moves; jumps may chain | Diagonal move or mandatory capture | None | No pieces or no moves loses | If capture exists, expect it to be forced |
| Mancala | Collect more stones in your store | Sow from one pit; some moves grant extra turns | Non-empty own pit | None | Store total decides winner | Look for moves ending in your store |
| Nine Men's Morris | Form mills and reduce opponent pieces | Placement, movement, flying phases | Place/move, plus capture after mill | None | Opponent below 3 pieces or no moves loses | Threaten two mills at once |
| Pentago | Make five in a row after rotation | Place then rotate a quadrant | Empty cell plus quadrant/direction | None | Five in a row wins | Think about the post-rotation board |
| Ultimate Tic-Tac-Toe | Win the global 3x3 board | Move sends opponent to matching local board | Empty cell in required board | None | Global three-in-row wins | Send opponent to constrained boards |
| Battleship | Sink hidden ships | Alternating shots | Any unshot opponent cell | Ship locations private | First to sink all ships wins | Probe near hits |
| Blackjack | Beat dealer without busting | Player acts, dealer follows fixed policy | Hit or stand | Dealer hole card/deck hidden | Higher total <= 21 wins | Stand strong totals, hit weak totals |
| Gin Rummy | Lower deadwood via melds | Draw, discard, optionally knock | Draw deck/discard, discard, knock | Hands/deck hidden | Lower deadwood wins | Discard isolated high cards |
| Cribbage | Choose discards for best scoring hand | Discard phase then compact scoring | Discard two cards | Opponent hand hidden | 15s, pairs, runs, flushes score | Keep 15s/runs; mind dealer crib |
| Liar's Dice | Bluff and challenge bids | Raise bids or challenge | Bid like `3x5` or challenge | Dice hidden | Challenge resolves truth of bid | Bid conservatively, infer from history |
| Goofspiel | Bid for prize cards | Each round bids one remaining card | Play a bid card | Opponent bid hidden until reveal | Most prize points wins | Save high cards for high prizes |
| Poker variants | Win pot through betting or showdown | Betting streets | Check/call/raise/fold/bet | Hole cards hidden | Pot won by fold or best hand | Explain street, pot, and stack first |
| Rock Paper Scissors | Beat the chosen hand | One-shot hidden choice | Rock, paper, scissors | Opponent choice hidden | Standard RPS result | Mix choices |
| Prisoner's Dilemma | Maximize payoff | One-shot hidden choice | Cooperate or defect | Opponent choice hidden | Payoff matrix decides | Explain individual vs joint payoff |
| Bargaining, Negotiation | Reach a favorable deal | Alternating offers and responses | Offer, accept, reject | Preferences/reserves may be private | Accepted utility decides | Open plausible, not extreme |
| First-Price Auction | Win item without overpaying | Sealed bid | Integer bid | Other bid/value hidden | Highest bid wins; utility subtracts bid | Bid below private value |

## Advanced Precursor Requirements

Some games need a short pre-game card before they are allowed into the public Arena flow.

- Go: explain 9x9 board, liberties, captures, ko, pass/resign, two-pass ending, and komi/area scoring.
- Shogi and Xiangqi: include a piece legend, coordinate notation, one sample move, and special movement rules. Shogi also needs drops and promotion.
- Bridge, Mahjong, Dou Dizhu: require table seats, turn order, role/team explanation, and visible model identities.
- Hanabi: explain cooperative hidden-information play, clue tokens, lives, and why the player's own hand is intentionally hidden.
- Poker variants: explain street, pot, stack, showdown, and action glossary before play.
- Bargaining/Negotiation: show payoff or utility structure before the first offer.

## Multi-Model Table Mode

Current Arena mostly assumes one `modelId` for the opponent. That is not enough for true multi-seat games.

Recommended setup flow:

1. User chooses a table game.
2. User chooses their seat.
3. UI renders a seat map.
4. Each non-human seat has a model picker.
5. Provide an `Auto-fill table` button.
6. Allow repeated models, but label repeated model seats clearly.
7. During play, show active seat, model name, provider, and last action.

Backend/product contract needed:

- Replace single `modelId` with `modelSeats`, keyed by Core `player_id`.
- `chooseArenaModelAction` should resolve the model by `activePlayerId`.
- Replay and session state should label each seat distinctly.
- Match completion should preserve per-seat provider status and failure reason.
- Model unavailability should fail only the affected seat if a recoverable fallback policy exists, or clearly complete the match with the seat name.

Until this exists, Mahjong, Dou Dizhu, and Bridge should not be in main Arena.

## Model Selection Recommendations

Keep the current model wheel, but make it recommendation-led rather than an exhaustive chooser.

Recommended changes:

- Default to a "Best first opponent" for the selected game.
- Add quick chips: `Fast`, `Strong`, `Balanced`, `Newest`, `Same provider as last time`.
- Move disabled/unavailable model cards out of the main picker and into the full roster modal.
- Replace implementation/status jargon like `Gateway ready`, `Requestable`, `catalog rows`, and `50 games` with player-facing labels: `Ready`, `Slower turns`, `Not available for this game`, `Works across Arena`.
- Show why a model was recommended: fast first match, strong reasoning, popular opponent, or recently added.
- Avoid calling a model "best" unless the ranking source is visible and current.

## Game Selector Recommendations

Replace the current "all games are playable" catalogue with surface-specific availability.

Recommended statuses:

- `main_arena`: polished, human-friendly, visible by default.
- `advanced_arena`: playable but hidden behind an Advanced filter.
- `table_mode_pending`: hidden from default Arena until multi-model seats exist.
- `eval_only`: eValk/control benchmark, not shown in Arena.
- `experimental`: internal/testing only.

Recommended top-level filters:

- Quick Games
- Board Classics
- Cards & Bluffing
- Strategy & Markets
- Advanced

Do not show Control & Arcade in main Arena. If it exists publicly, it should be a separate product surface with a different promise: "Run control benchmarks," not "play a model."

## In-Match UX Improvements

1. Put the board, current objective, and "your legal actions" in one visual system.
2. Add a rules/help button next to the board.
3. Show why it is or is not the user's turn.
4. Translate legal action tokens into natural language.
5. For large action lists, group actions by type instead of a flat grid.
6. Show a "recommended beginner action" only when it is safe and clearly labeled as a hint, not model advice.
7. Show the opponent's last move with a short explanation when available.
8. Use game-specific empty states: "No legal captures," "Waiting for model to bid," "You must follow suit," etc.
9. Preserve "advanced details" like raw action token and Core state hash behind a developer/details disclosure, not the default player surface.

## Recommended Rollout

### Phase 1: Clean the Surface

- Remove the 12 RL/control/arcade games from main Arena.
- Hide Mahjong, Dou Dizhu, and Bridge until table mode exists.
- Move opaque/advanced games behind an Advanced filter.
- Stop using `Boolean(game.slug)` as the definition of browser playability.
- Add explicit `arenaSurface` metadata.
- Replace the full 50-game default grid with a small "Play now" rail plus Browse.
- Remove unavailable model cards from the main picker.

### Phase 2: Add Rules Popup

- Add `gameHelp` metadata for every retained Arena game.
- Add `How to play` button beside the board.
- Populate summary/action/details tabs.
- Add game-family templates first, then specialize game by game.

### Phase 3: Improve Action Comprehension

- Group legal actions by verb/category.
- Add current-phase labels for card/table games.
- Add board annotations for legal moves and last move.
- Add hidden-info explanation on card/dice games.

### Phase 4: Multi-Model Tables

- Add seat-map model selection.
- Add `modelSeats` session contract.
- Update replay labels and completion summaries.
- Reintroduce Mahjong, Dou Dizhu, and Bridge.

### Phase 5: Playtest and Iterate

Track:

- Start-to-first-action time.
- Help popup open rate.
- Abandon rate before first action.
- Illegal action rate.
- Resignation rate.
- Model-unavailable completions.
- "I understood what to do" survey after match.

## Suggested Main Arena Launch Set

Start with a smaller, high-quality set:

1. Tic-Tac-Toe
2. Connect Four
3. Othello
4. Chess
5. Go
6. Gomoku
7. Hex
8. Ultimate Tic-Tac-Toe
9. Battleship
10. Goofspiel
11. Rock Paper Scissors
12. Prisoner's Dilemma
13. First-Price Sealed-Bid Auction

Default "Play now" rail: show 6-8 at a time, biased toward Tic-Tac-Toe, Connect Four, Othello, Gomoku, Battleship, Rock Paper Scissors, Prisoner's Dilemma, and First-Price Sealed-Bid Auction.

Then add advanced games only when their help and action UX are good enough.

## Open Product Decisions

1. Should Chess and Go be visible as marquee games even if novice comprehension is lower?
2. Should heads-up poker remain, or should poker wait for table mode?
3. Should "Advanced Arena" be public or internal until playtesting proves comprehension?
4. Should control benchmarks have a separate public product, or remain only in eValk?
5. Should model explanations be shown after every move, or only on demand?

## Bottom Line

The engine catalogue can stay broad. Arena should be selective.

The cleanest public Arena is not "50 playable games." It is a smaller set of games where the user immediately understands the matchup, the objective, their legal actions, and why the model's response matters.
