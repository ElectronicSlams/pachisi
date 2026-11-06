# Individual game and variant review — 2026-11-01

Reviewed latest local branch at c83e260 after a fast-forward-only pull (already current). F1–F10 from the prior review were already fixed in edfdca5; this pass builds on those fixes.

## Delivered

- Every one of the 50 games has an individual inspection priority and declared-variant boundary in the catalogue. Their existing live-adapter maturity remains visible.
- 33 additional authored studies contain 47 inspectable frames. They cover board-size variations, castling/en passant/promotion, captures and wins, concealed/public cards, long rows, folded seats, map extremes, slope/landing/wall contacts and shared hockey cells. These are presentation studies, not new engine implementations.
- A reusable GameReplay component provides pause/play, exact stepping, seeking, speed, reduced-motion support and terminal versus excerpt status. Existing GameAnimation scheduling remains compatible.
- Presentation fixes cover tall maps, all shooter columns, both walker feet, road/car alignment and camera fit, shared hockey-cell identity, dealer conceal/reveal, explicit card overflow, card/seat spacing, non-table crop protection, mobile board size, Go contrast and wrapping captions.
- Racing, walker and lander-lite transitions now have equation checks, supplemented by eight new negative mutations. The original dataset is unchanged: 722 frames, 672 transitions.

## Design inspiration and resulting decisions

Primary sources were consulted on 2026-11-01. Only interaction principles and factual distinctions informed this original implementation; no external artwork, branding or code was imported.

| Category | Reference | Applied principle |
|---|---|---|
| Board | [Lichess studies](https://lichess.org/study) | Inspect positions deliberately, with frame navigation and readable outcomes. |
| Board | [PyChess variants](https://www.pychess.org/variants) | Name variants explicitly and separate their rules from a familiar board shape. |
| Card | [Board Game Arena replay](https://en.doc.boardgamearena.com/Game_replay) | Reconstruct the public state at each step; replay should remain inspectable. |
| Card | [PokerStars rules](https://www.pokerstars.com/poker/games/rules/) | Make betting phases, folded seats and showdown boundaries understandable. |
| Strategy | [OpenSpiel game catalogue](https://openspiel.readthedocs.io/en/latest/games.html) | Expose information structure and testing maturity instead of implying equal coverage. |
| RL | [Gymnasium CartPole](https://gymnasium.farama.org/environments/classic_control/cart_pole/) | Keep physical state, actions, termination and excerpt boundaries distinct. |
| RL | [Gymnasium Lunar Lander](https://gymnasium.farama.org/environments/box2d/lunar_lander/) | Check contact geometry and explicitly distinguish simplified dynamics from Box2D. |

The Gymnasium lander documentation explicitly describes a Box2D environment with different action/state and fuel semantics. The catalogue therefore calls this repository's finite-fuel scene lander-lite. OpenSpiel's separation of information structure and testing maturity informs explicit coverage labels; it does not certify this library's engines.

## Local evidence

The full local release gate passed: 92 unit tests, 38 mutation checks, 200 browser game cases, 132 browser study selections, all geometry checks and all three packed consumer checks. The release gate and exact environment are recorded in [local-ci.json](../validation/local-ci.json), with [browser results](../validation/browser.json) and [packed consumer results](../validation/consumer.json). The browser suite checks all games and authored study selectors in desktop/phone × light/dark, keyboard transport, playback/pause, reduced motion, theme persistence and geometry. Static regression tests cover the special moves and failing boundaries. The physics self-test caught all 38 deliberately corrupted cases.

Contact sheets of every game's final bundled frame were visually inspected by category. The new lab was inspected in desktop light and phone dark; follow-up geometry probes found and fixed strong-curve clipping and fallback-font label bounds. Contact sheets and detailed transient captures remain in ignored artifacts/browser; durable captures are in docs/captures.

## Every game, individually

“Frames” refers to the untouched bundled public trace. A study count is additional authored presentation coverage, not a declaration of rule support. All rows receive frame rendering and transition validation; the notes identify what those checks do not establish.

| Game | Declared variant | Frames | Studies | Inspection and variant findings |
|---|---|---:|---:|---|
| Alien Shooter | standard | 13 | 1 | All eight columns and projectile rows fit the canvas; absence means no entity. Discrete arcade grid; a full-width edge study checks the last column and highest row. |
| Backgammon | standard | 13 | 1 | Bar, off trays, dice owner and capped stack counts remain distinguishable. The trace has five checkers per side. A 15-checker opening is a presentation study; cube and match rules are absent. |
| Bargaining | core_bilateral_split | 4 | 0 | The two offer shares must partition the same 100 units. Core bilateral split; discounting and multi-issue utility are outside the sample. |
| Battleship | standard | 13 | 1 | Render public hit/miss marks without exposing ship locations. 5×5 compact trace; a 10×10 shot-grid study checks geometry and private-information boundaries. |
| Bipedal Walker | standard | 48 | 1 | Both foot contacts must sample terrain at the actual foot x coordinate. Abstract alternating steps; not articulated rigid-body walking or Gymnasium hardcore terrain. |
| Blackjack | core_hit_stand_s17 | 3 | 0 | Show the dealer up-card and a concealed slot during play, then the supplied terminal hand. Core hit/stand S17; splitting, doubling, insurance and suit/deck verification are not available. |
| Boxing Style Arena | standard | 13 | 0 | Distance determines reach; health/stamina and stances are separate state. Turn-based abstract boxing; no continuous collision or ragdoll simulation is claimed. |
| Bridge | core_compact_bridge_play_phase | 13 | 0 | Partners occupy opposite seats; associate completed tricks with their winner. Compact play phase. The trace lacks declarer/dummy identity and dummy cards; do not invent an exposed dummy. |
| Car Racing | standard | 8 | 1 | Road edges, center dashes and lane-relative car position share one coordinate transform. Abstract lane/heading model; not a tire/friction or Box2D vehicle simulation. |
| CartPole | standard | 61 | 1 | Pole angle is radians; the pivot follows the cart and terminal bounds remain visible. Euler-integrated Core control. Gymnasium v0/v1 time limits are not interchangeable with excerpt length. |
| Checkers | standard | 13 | 1 | Kings need a visible crown; captures must remove the jumped piece. 8×8 Core rules; a 10×10 study exercises layout only. International draughts move rules are not supplied. |
| Chess | standard | 11 | 3 | Follow both squares of each move; captures, castling, en passant and promotion must preserve identity. Standard chess is the trace. Chess960 needs host-supplied castling semantics; this renderer does not infer them. |
| Cliff Walking | standard | 14 | 0 | Hazards must not obscure the agent or goal. 4×12 trace; alternate maps need host bounds and hazard coordinates. |
| Connect Four | standard | 8 | 1 | A disc enters from above the column, then settles at the correct row pitch. 6×7 is bundled. An 8×9 study checks scaling; alternate win lengths require an explicit host contract. |
| Crazy Eights | core_wild_eight_shedding | 13 | 0 | The visible discard and active suit matter after a wild eight. Core wild-eight shedding; alternate draw/penalty rules are host configuration. |
| Cribbage | core_discard_showdown | 3 | 0 | Show the starter and discard phase without implying a pegging race. Core discard/showdown only; pegging and full match scoring are absent. |
| Dou Dizhu | core_landlord_shedding | 13 | 1 | Three seats and landlord identity must survive compact layouts. Core landlord shedding; long combinations must display an explicit overflow count. |
| Euchre | core_call_and_play | 12 | 0 | Calling trump and playing a trick are separate phases; the left bower follows trump. Two-seat compact call-and-play, not standard four-player partnership Euchre. |
| First-Price Sealed-Bid Auction | core_two_bidder_private_values | 3 | 0 | Show sealed bids until reveal; distinguish own bid from an opponent’s value. Two bidders with private values, first-price payment; second-price is a different engine. |
| Frozen Lake | standard | 7 | 2 | Keep holes, destination and agent inside both canvas dimensions. 4×4 trace; 8×8 and tall-map studies check geometry. Slippery transitions need seeded engine evidence. |
| Gin Rummy | core_compact_gin | 13 | 0 | Draw/discard phase and stock size are public; private melds are not guessed. Seven-card compact Gin; standard ten-card hands, knock and layoff need their own trace. |
| Go | board_9x9 | 13 | 4 | Separate placement from removed stones; last-move cues must not mark captured intersections. 9×9 is bundled. 13×13 and 19×19 are geometry studies; scoring, ko and superko belong to the host. |
| Gomoku | standard | 13 | 1 | Show the terminal five and last placement without drawing a win during live play. 15×15 trace; Renju restrictions and overline policy are not inferred from the board. |
| Goofspiel | core_five_card_goofspiel | 11 | 0 | Separate the current prize from previous revealed bids and awarded points. Five-card Core game; thirteen-card variants need additional host data and traces. |
| Hanabi | core_compact_hanabi | 7 | 0 | Clues, lives, fireworks and hand counts are public; never infer concealed faces. Two-color 12-card compact game; full five-color and rainbow variants need distinct state contracts. |
| Hearts | core_penalty_tricks | 13 | 0 | Keep penalty history and trick ownership understandable. Two-seat compact penalty tricks; the trace allows an unbroken-heart lead unlike standard four-player Hearts. |
| Hex | standard | 13 | 2 | Keep the two goal axes and Core B/W versus display R/B vocabularies explicit. 11×11 trace; 7×7 and 13×13 geometry studies. Swap-rule actions stay host owned. |
| Ice Hockey Style Arena | standard | 13 | 1 | Shared-cell skaters remain identifiable; puck ownership remains attached to the correct player. Discrete rink dimensions are read from state; a shared cell is drawn as two halves, not two invented positions. |
| Leduc Hold'em | core_compact_leduc_fixed_menu | 9 | 1 | Seats, stacks, pot and the single board card must remain legible. Four-seat compact fixed-menu Leduc, not the usual two-player research setup. |
| Liar's Dice | core_single_round | 4 | 0 | Keep dice concealed until the supplied reveal, and bid quantity separate from face. Core single round with five dice per player; multi-round elimination is not modelled. |
| Limit Texas Hold'em | core_compact_holdem_fixed_menu_limit | 13 | 1 | Separate street, pot, remaining chips and folded seats. Compact fixed-menu limit variant; the bundled all-check trace does not exercise raises or side pots. |
| Lunar Lander | lander-lite | 18 | 1 | Pad geometry, fuel use and thrust come from state; no flame after termination. Lander-lite has finite fuel and simplified dynamics. It is not Gymnasium Box2D LunarLander. |
| Mahjong | core_compact_draw_discard | 13 | 1 | Show public discards and wall count; disclose earlier discards when the row is condensed. 108-tile compact draw/discard; honors, calls, scoring and regional rules are not represented. |
| Mancala | standard | 13 | 0 | Opposite pit order, store ownership and exact seed counts must agree. Six pits per side; the trace is one sowing ruleset, not every game called Mancala. |
| Mountain Car | standard | 61 | 1 | The car aligns with the sinusoidal slope; wheels touch the terrain. Discrete pushes and a supplied goal; continuous controls require a different action contract. |
| Negotiation | core_price_delivery_grid | 4 | 0 | Price and delivery are separate public offer dimensions. Core discrete price/delivery grid; private utilities remain private. |
| Nine Men's Morris | standard | 13 | 0 | All 24 nodes and mill connections remain stable through placement and movement. Reserve and occupied-node study; removal/flying phases require more engine traces. |
| No-Limit Texas Hold'em | core_compact_holdem_fixed_menu_no_limit | 13 | 1 | Keep dealer and folded-seat markers visible without revealing hole cards. Compact fixed-menu no-limit variant; arbitrary bet sizing and side-pot resolution need host data. |
| Othello | standard | 13 | 1 | Mark the placed disc, not every flipped disc; preserve black/white identity. 8×8 trace; a 6×6 geometry study exercises size variation, not alternate rule certification. |
| Paddle Ball | standard | 61 | 1 | Ball center integration, wall normals, radius and paddle-face contact must agree. Core clamps positions at collisions. Exact snapshots preserve that rule; smooth interpolation must not invent rebounds. |
| Pentago | standard | 13 | 0 | Keep quadrant boundaries; a rotation can change several cells at once. 6×6 with four 3×3 quadrants; rotation cues show changed cells, not a fabricated moving marble. |
| Prisoner's Dilemma | core_one_shot_matrix | 3 | 0 | One commitment must not reveal either choice before simultaneous reveal. One-shot matrix; iterated games need history and a payoff contract. |
| Rock Paper Scissors | core_one_shot_hidden_commit | 3 | 0 | Reveal choices together and distinguish ties from a winner. One-shot hidden commitments; best-of-series needs a host score/history contract. |
| Shedding Card Game | core_rank_suit_shedding | 13 | 0 | Public discard changes while private hands remain counts. Core rank/suit shedding; do not label it as a different branded card game. |
| Shogi | core_compact_shogi | 13 | 1 | Piece direction identifies the seat; promoted pieces and hands must stay legible. Compact Core Shogi has USI/drop syntax. Full tournament legality and repetition need an engine. |
| Spades | core_trump_tricks | 13 | 0 | Keep trump and trick ownership distinct from seat identity. Two-seat compact trump tricks; the trace permits an unbroken-spade lead. Standard partnership scoring is absent. |
| Taxi | standard | 11 | 0 | Pickup, onboard and delivered are separate passenger states. 5×5 Core grid; the pinned terminal passenger coordinate is wrong upstream and the renderer masks the origin marker. |
| Tic-Tac-Toe | standard | 10 | 1 | Distinguish a three-in-a-row win from a full-board draw. The bundled 3×3 game draws; the authored study adds a winning line. |
| Ultimate Tic-Tac-Toe | standard | 13 | 1 | Use board-major action indices but row-major visual coordinates; show won local boards. Nine nested boards. The authored study covers decided boards and the forced destination. |
| Xiangqi | core_compact_xiangqi | 13 | 0 | Pieces sit on intersections, with river and palace cues, including rank zero. Compact Core Xiangqi; flying-general/checkmate coverage needs longer engine traces. |

## Remaining limits

The trace validator reports 39 PASS, nine PASS-with-RULE, one PASS-with-RENDER (Bridge's missing dummy), and one known upstream taxi defect; there are no unexpected FAILs. Strict standard-rule certification would still fail and is not claimed. More complete live-state adapters, hidden-information contracts and new engine-generated trajectories are still needed for full match play and new rule variants. In particular, the compact card games, short Shogi/Xiangqi excerpts, poker side pots and alternative RL dynamics cannot be certified by these samples.

No upstream engine files, immutable traces, canonical theme/font bytes, reference archives or deployment settings were changed. No package was published and no remote CI was used. Implementation and tests ship together; existing public APIs remain available.
