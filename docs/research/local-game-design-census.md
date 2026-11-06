# Local game design census

This inventory separates usable Pachisi web designs, archived drawing implementations, shared layouts, local native captures and imported source selections. Counts refer to game/design pairs or explicitly named evidence types. Two source files can draw the same design. The prototype/source lists are restoration candidates, not a certified count of distinct looks.

**50 games · 170 currently usable game/design pairs · 36 games with native captures · 27 distinct active-turn PNGs · 38 locally archived public repositories.**

## Counting and scope

- Connect Four has its 20 selectable designs. At the start of this census the other 49 games each had one existing Pachisi scene (69 game/design pairs overall). The table below includes the subsequent shared web editions, with the same underlying geometry. Shared editions are counted once per supported game, not claimed as independently authored games. A layout, rule variant, study position, palette, icon, sample trace or shared deck is not counted as another shipped design.
- The first-party sweep covers Mobile v3, the Arena App grid and table registries, the Stadium board prototype, Home v1/v2 posters, early web game/picker routes, the original Arena reference and the pinned Platform replay/table sources and native compatibility matrix. The old picker uses several unrelated generic fallbacks. The mobile prototype has explicit drawing routines and card configurations for cases those fallbacks miss.
- Home revisions, repeated web v3/v4 modules, the generated Arena HTML and its editable source are grouped by lineage. Historical code was inspected as text. Native state names and six family appearances are indexed separately. Only one byte-identical active-turn sample per SHA-256 is copied into the catalogue.
- External references come from the existing pin/selection manifests. Each association points to a local selected file and its snapshot. Dedicated UI, shared interaction, partial artwork, related games and rules references carry separate labels. Availability of a reference is not proof of a working upstream application or permission to ship a port.
- Evidence is scoped to identifiable game drawing routes and reviewed public assets. Original handoff screenshots, branding, duplicate workspace checkouts, unrelated projects and private/operator files are outside the shipped inventory. See the [archive exclusions](../../design-archive/ARCHIVE_INDEX.md) and [upstream import record](public-game-designs.md).

The [workspace cross-check](local-design-workspace.json) compares 139 identifiable renderer and prototype files in the original handoffs and three Platform checkouts against their in-repo counterparts. 133 are byte-identical. Six are revisions of replay-board.tsx or replay-visualization.ts. Those revisions are candidates for further comparison and add zero to the shipped count.

## Index

| Game | Shipped web looks | First-party screen/renderer candidates | Shared layouts | Native state captures | Local upstream repositories |
|---|---:|---:|---:|---:|---:|
| [Alien Shooter](#game-alien-shooter) | 3 | 2 | 0 | 0 | 2 |
| [Backgammon](#game-backgammon) | 3 | 3 | 0 | 8 | 2 |
| [Bargaining](#game-bargaining) | 3 | 0 | 3 | 9 | 2 |
| [Battleship](#game-battleship) | 3 | 2 | 1 | 9 | 2 |
| [Bipedal Walker](#game-bipedal-walker) | 3 | 2 | 0 | 0 | 1 |
| [Blackjack](#game-blackjack) | 3 | 2 | 2 | 9 | 4 |
| [Boxing Style Arena](#game-boxing-style-arena) | 3 | 2 | 0 | 0 | 1 |
| [Bridge](#game-bridge) | 3 | 1 | 3 | 9 | 3 |
| [Car Racing](#game-car-racing) | 3 | 2 | 0 | 0 | 1 |
| [CartPole](#game-cartpole) | 3 | 2 | 0 | 0 | 1 |
| [Checkers](#game-checkers) | 3 | 2 | 1 | 8 | 1 |
| [Chess](#game-chess) | 3 | 5 | 2 | 8 | 5 |
| [Cliff Walking](#game-cliff-walking) | 3 | 1 | 1 | 0 | 1 |
| [Connect Four](#game-connect-four) | 20 | 6 | 1 | 7 | 2 |
| [Crazy Eights](#game-crazy-eights) | 3 | 1 | 3 | 9 | 2 |
| [Cribbage](#game-cribbage) | 3 | 1 | 3 | 9 | 2 |
| [Dou Dizhu](#game-dou-dizhu) | 3 | 1 | 3 | 9 | 3 |
| [Euchre](#game-euchre) | 3 | 1 | 3 | 9 | 2 |
| [First-Price Sealed-Bid Auction](#game-first-price-sealed-bid-auction) | 3 | 1 | 2 | 9 | 2 |
| [Frozen Lake](#game-frozen-lake) | 3 | 1 | 1 | 0 | 1 |
| [Gin Rummy](#game-gin-rummy) | 3 | 1 | 3 | 9 | 3 |
| [Go](#game-go) | 4 | 4 | 2 | 8 | 5 |
| [Gomoku](#game-gomoku) | 4 | 1 | 2 | 7 | 2 |
| [Goofspiel](#game-goofspiel) | 3 | 3 | 2 | 9 | 3 |
| [Hanabi](#game-hanabi) | 3 | 1 | 3 | 9 | 4 |
| [Hearts](#game-hearts) | 3 | 1 | 3 | 9 | 2 |
| [Hex](#game-hex) | 3 | 3 | 1 | 7 | 3 |
| [Ice Hockey Style Arena](#game-ice-hockey-style-arena) | 3 | 2 | 0 | 0 | 1 |
| [Leduc Hold'em](#game-leduc-holdem) | 3 | 1 | 3 | 0 | 4 |
| [Liar's Dice](#game-liars-dice) | 3 | 2 | 3 | 9 | 2 |
| [Limit Texas Hold'em](#game-limit-texas-holdem) | 3 | 1 | 3 | 9 | 4 |
| [Lunar Lander](#game-lunar-lander) | 3 | 3 | 0 | 0 | 2 |
| [Mahjong](#game-mahjong) | 3 | 1 | 3 | 9 | 3 |
| [Mancala](#game-mancala) | 3 | 3 | 0 | 8 | 1 |
| [Mountain Car](#game-mountain-car) | 3 | 2 | 0 | 0 | 1 |
| [Negotiation](#game-negotiation) | 3 | 0 | 3 | 9 | 2 |
| [Nine Men's Morris](#game-nine-mens-morris) | 3 | 3 | 0 | 8 | 1 |
| [No-Limit Texas Hold'em](#game-no-limit-texas-holdem) | 3 | 1 | 3 | 9 | 4 |
| [Othello](#game-othello) | 3 | 6 | 1 | 8 | 1 |
| [Paddle Ball](#game-paddle-ball) | 3 | 2 | 0 | 0 | 1 |
| [Pentago](#game-pentago) | 4 | 2 | 1 | 7 | 1 |
| [Prisoner's Dilemma](#game-prisoners-dilemma) | 3 | 1 | 2 | 9 | 2 |
| [Rock Paper Scissors](#game-rock-paper-scissors) | 3 | 3 | 2 | 9 | 2 |
| [Shedding Card Game](#game-shedding-card-game) | 3 | 1 | 3 | 0 | 3 |
| [Shogi](#game-shogi) | 3 | 1 | 2 | 8 | 3 |
| [Spades](#game-spades) | 3 | 1 | 3 | 9 | 2 |
| [Taxi](#game-taxi) | 3 | 1 | 1 | 0 | 1 |
| [Tic-Tac-Toe](#game-tic-tac-toe) | 3 | 7 | 1 | 7 | 3 |
| [Ultimate Tic-Tac-Toe](#game-ultimate-tic-tac-toe) | 3 | 2 | 1 | 7 | 1 |
| [Xiangqi](#game-xiangqi) | 3 | 1 | 2 | 8 | 2 |

<a id="game-alien-shooter"></a>
### Alien Shooter

**Usable today.** Blueprint, Vector Scope, Field Manual. Scene `control/shooter`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · Alien Shooter benchmark** (Prototype). Compact illustrative motion loop. Validate against the bundled trace before porting its movement. [eSlams Mobile App v3.dc.html:2979](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2979) · [eSlams Mobile App v3.dc.html:2924](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2924)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:52](../../design-archive/stadium-prototype/data.js#L52)
- **Platform replay · Pixi Alien Shooter** (Archived renderer). Game-specific arcade drawing path with a separate DOM/SVG fallback. [replay-board.tsx:529](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L529) · [replay-board.tsx:777](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L777)
- **maryrosecook/retro-games** (Renderer source). Small canvas arcade render loops and readable collision/motion feedback. Original source subset; no sound assets. [space-invaders.js](../../reference/public-games/sources/maryrosecook--retro-games@2c9a82216cd4/space-invaders/space-invaders.js) · [maryrosecook--retro-games@2c9a82216cd4](../../reference/public-games/sources/maryrosecook--retro-games@2c9a82216cd4)
- **leerob/space-invaders** (Renderer source). Arcade enemy formation, projectiles and player/collision presentation. Sprites, sound effects and font assets excluded. [spaceinvaders.py](../../reference/public-games/sources/leerob--space-invaders@ccb37ac159e8/spaceinvaders.py) · [leerob--space-invaders@ccb37ac159e8](../../reference/public-games/sources/leerob--space-invaders@ccb37ac159e8)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-backgammon"></a>
### Backgammon

**Usable today.** Blueprint, Joinery, Proof Sheet. Scene `special-board/points`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvBackgammon** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2786](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2786)
- **Arena App · custom** (Prototype). Bespoke geometry for this game. [boards-table.js:1437](../../design-archive/arena-app/prototype/src/boards-table.js#L1437) · [data.js:122](../../design-archive/arena-app/prototype/src/data.js#L122)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:20](../../design-archive/stadium-prototype/data.js#L20)
- **Platform replay · backgammon** (Archived renderer). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:64](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L64) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **sotetsuk/pgx** (Renderer source). Compact state-to-SVG renderers and game-specific board/seat geometry. Bridge reference covers bidding, not play-phase dummy. Image assets are excluded because they have separate provenance. [backgammon.py](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67/pgx/_src/dwg/backgammon.py) · [sotetsuk--pgx@87278d2d6e67](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67)
- **quasoft/backgammonjs** (Renderer source). Point stacks, bar/off areas and board CSS. Selected source files only; upstream dependencies are not installed or executed. [SimpleBoardUI.js](../../reference/public-games/sources/quasoft--backgammonjs@f85f6ff0b0af/app/browser/js/SimpleBoardUI.js) · [quasoft--backgammonjs@f85f6ff0b0af](../../reference/public-games/sources/quasoft--backgammonjs@f85f6ff0b0af)

**Native archive.** custom, 8 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/backgammon/active_turn.png). Identical active-turn bytes appear under: backgammon.

<a id="game-bargaining"></a>
### Bargaining

**Usable today.** Blueprint, Switchboard, Carbon Copy. Scene `social/offer-split`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvEcon** (Shared layout). The two economic games share an offer sequence. [eSlams Mobile App v3.dc.html:2912](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2912)
- **Arena App · economic_panel** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:1133](../../design-archive/arena-app/prototype/src/boards-table.js#L1133) · [data.js:142](../../design-archive/arena-app/prototype/src/data.js#L142)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:37](../../design-archive/stadium-prototype/data.js#L37)
- **Platform replay · strategy-matrix** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:104](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L104) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **stanmart/unstructured-bargaining-experiment** (Interaction). Offer, acceptance, coalition/status and results interfaces. Different experimental bargaining rules; not the exact Core price/delivery grid. Participant data, settings and backend excluded. [accept.js](../../reference/public-games/sources/stanmart--unstructured-bargaining-experiment@b79d3dedff04/_static/accept.js) · [stanmart--unstructured-bargaining-experiment@b79d3dedff04](../../reference/public-games/sources/stanmart--unstructured-bargaining-experiment@b79d3dedff04)
- **google-deepmind/open_spiel** (Rules). Information phases, outcome semantics and game-tree visualization. Primarily rules/information reference, not ready-made game screens. Exact dedicated licensed visual sources remain gaps for Goofspiel and first-price sealed bidding. [bargaining.cc](../../reference/public-games/sources/google-deepmind--open_spiel@8eb13ab561c4/open_spiel/games/bargaining/bargaining.cc) · [google-deepmind--open_spiel@8eb13ab561c4](../../reference/public-games/sources/google-deepmind--open_spiel@8eb13ab561c4)

**Native archive.** economic_panel, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/bargaining/active_turn.png). Identical active-turn bytes appear under: bargaining.

<a id="game-battleship"></a>
### Battleship

**Usable today.** Blueprint, Joinery, Proof Sheet. Scene `special-board/attack-grids`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvBship** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2712](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2712)
- **Arena App · square_board** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-grid.js:949](../../design-archive/arena-app/prototype/src/boards-grid.js#L949) · [data.js:121](../../design-archive/arena-app/prototype/src/data.js#L121)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · othello** (Placeholder). Sample dispatch selects othello. The catalogue records the requested game separately. [Board.dc.html:83](../../design-archive/stadium-prototype/Board.dc.html#L83) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:19](../../design-archive/stadium-prototype/data.js#L19)
- **Platform replay · battleship** (Archived renderer). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:65](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L65) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **bigardone/phoenix-battleship** (Renderer source). Own versus opponent board separation and fleet-placement controls. Chat, sessions, logo components and service integration excluded. [board.js](../../reference/public-games/sources/bigardone--phoenix-battleship@1077e13eb871/web/static/js/components/game/board.js) · [bigardone--phoenix-battleship@1077e13eb871](../../reference/public-games/sources/bigardone--phoenix-battleship@1077e13eb871)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** square_board, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/battleship/active_turn.png). Identical active-turn bytes appear under: battleship.

<a id="game-bipedal-walker"></a>
### Bipedal Walker

**Usable today.** Blueprint, Vector Scope, Field Manual. Scene `control/walker`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · Bipedal Walker benchmark** (Prototype). Compact illustrative motion loop. Validate against the bundled trace before porting its movement. [eSlams Mobile App v3.dc.html:2963](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2963) · [eSlams Mobile App v3.dc.html:2924](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2924)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:50](../../design-archive/stadium-prototype/data.js#L50)
- **Platform replay · Pixi Bipedal Walker** (Archived renderer). Game-specific arcade drawing path with a separate DOM/SVG fallback. [replay-board.tsx:597](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L597) · [replay-board.tsx:777](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L777)
- **Farama-Foundation/Gymnasium** (Renderer / physics). Reference state units, integration, control variants and rendering coordinate transforms. Blackjack is rules-only here. Box2D scenes differ from Core lite models. Sprites, fonts, binaries and external dependencies excluded. [bipedal_walker.py](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd/gymnasium/envs/box2d/bipedal_walker.py) · [farama-foundation--gymnasium@c08564bb8edd](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-blackjack"></a>
### Blackjack

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/solo`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · dealer table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:462](../../design-archive/mobile-v3/app-data-v3.js#L462)
- **Mobile v3 · dealer play** (Prototype). Separate hit/stand screen with a concealed dealer card. [eSlams Mobile App v3.dc.html:2634](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2634)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:21](../../design-archive/stadium-prototype/data.js#L21)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **datamllab/rlcard** (Terminal interaction). Gin Rummy GUI layout and input zones; terminal card presentation utilities. Only Gin Rummy has a dedicated graphical GUI in this selection; other mapped games use shared/terminal card presentation. No card images or pretrained agents. [blackjack_human.py](../../reference/public-games/sources/datamllab--rlcard@d7d0a957baf4/examples/human/blackjack_human.py) · [datamllab--rlcard@d7d0a957baf4](../../reference/public-games/sources/datamllab--rlcard@d7d0a957baf4)
- **Farama-Foundation/Gymnasium** (Renderer source). Pygame table renderer in the selected Blackjack environment. Its upstream images, fonts and dependencies are outside the source selection. [blackjack.py:308](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd/gymnasium/envs/toy_text/blackjack.py#L308) · [farama-foundation--gymnasium@c08564bb8edd](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/blackjack/active_turn.png). Identical active-turn bytes appear under: blackjack.

<a id="game-boxing-style-arena"></a>
### Boxing Style Arena

**Usable today.** Blueprint, Vector Scope, Field Manual. Scene `control/combat`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · Boxing Style Arena benchmark** (Prototype). Compact illustrative motion loop. Validate against the bundled trace before porting its movement. [eSlams Mobile App v3.dc.html:2986](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2986) · [eSlams Mobile App v3.dc.html:2924](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2924)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:53](../../design-archive/stadium-prototype/data.js#L53)
- **Platform replay · Pixi Boxing Style Arena** (Archived renderer). Game-specific arcade drawing path with a separate DOM/SVG fallback. [replay-board.tsx:618](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L618) · [replay-board.tsx:777](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L777)
- **erfansn/BoxingWithML** (Related design). Pose-feedback overlay and boxing interaction presentation. Camera/pose game differs from the discrete Core arena. No models, camera data or video imported. [main.py](../../reference/public-games/sources/erfansn--boxingwithml@254ac35a4464/main.py) · [erfansn--boxingwithml@254ac35a4464](../../reference/public-games/sources/erfansn--boxingwithml@254ac35a4464)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-bridge"></a>
### Bridge

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/tricks`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · compass table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:468](../../design-archive/mobile-v3/app-data-v3.js#L468)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:130](../../design-archive/arena-app/prototype/src/data.js#L130)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:29](../../design-archive/stadium-prototype/data.js#L29)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **sotetsuk/pgx** (Related design). Compact state-to-SVG renderers and game-specific board/seat geometry. Bridge reference covers bidding, not play-phase dummy. Image assets are excluded because they have separate provenance. [bridge_bidding.py](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67/pgx/_src/dwg/bridge_bidding.py) · [sotetsuk--pgx@87278d2d6e67](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/bridge/active_turn.png). Identical active-turn bytes appear under: bridge, euchre, hearts, spades.

<a id="game-car-racing"></a>
### Car Racing

**Usable today.** Blueprint, Vector Scope, Field Manual. Scene `control/racing`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · Car Racing benchmark** (Prototype). Compact illustrative motion loop. Validate against the bundled trace before porting its movement. [eSlams Mobile App v3.dc.html:2957](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2957) · [eSlams Mobile App v3.dc.html:2924](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2924)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:49](../../design-archive/stadium-prototype/data.js#L49)
- **Platform replay · Pixi Car Racing** (Archived renderer). Game-specific arcade drawing path with a separate DOM/SVG fallback. [replay-board.tsx:582](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L582) · [replay-board.tsx:777](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L777)
- **Farama-Foundation/Gymnasium** (Renderer / physics). Reference state units, integration, control variants and rendering coordinate transforms. Blackjack is rules-only here. Box2D scenes differ from Core lite models. Sprites, fonts, binaries and external dependencies excluded. [car_racing.py](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd/gymnasium/envs/box2d/car_racing.py) · [farama-foundation--gymnasium@c08564bb8edd](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-cartpole"></a>
### CartPole

**Usable today.** Blueprint, Vector Scope, Field Manual. Scene `control/cart-pole`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · CartPole benchmark** (Prototype). Compact illustrative motion loop. Validate against the bundled trace before porting its movement. [eSlams Mobile App v3.dc.html:2942](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2942) · [eSlams Mobile App v3.dc.html:2924](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2924)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:46](../../design-archive/stadium-prototype/data.js#L46)
- **Platform replay · Pixi CartPole** (Archived renderer). Game-specific arcade drawing path with a separate DOM/SVG fallback. [replay-board.tsx:656](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L656) · [replay-board.tsx:747](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L747)
- **Farama-Foundation/Gymnasium** (Renderer / physics). Reference state units, integration, control variants and rendering coordinate transforms. Blackjack is rules-only here. Box2D scenes differ from Core lite models. Sprites, fonts, binaries and external dependencies excluded. [cartpole.py](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd/gymnasium/envs/classic_control/cartpole.py) · [farama-foundation--gymnasium@c08564bb8edd](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-checkers"></a>
### Checkers

**Usable today.** Blueprint, Joinery, Proof Sheet. Scene `special-board/checkers`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvCheckers** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2697](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2697)
- **Arena App · square_board** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-grid.js:949](../../design-archive/arena-app/prototype/src/boards-grid.js#L949) · [data.js:115](../../design-archive/arena-app/prototype/src/data.js#L115)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · othello** (Placeholder). Sample dispatch selects othello. The catalogue records the requested game separately. [Board.dc.html:83](../../design-archive/stadium-prototype/Board.dc.html#L83) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:10](../../design-archive/stadium-prototype/data.js#L10)
- **Platform replay · checkers** (Archived renderer). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:59](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L59) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **bb4/bb4-games** (Renderer source). Board/piece separation, Mancala pits and poker chip/hand/seat composition. Generic poker layouts are shared design references, not certification of Pachisi betting variants. [CheckersBoardRenderer.scala](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad/scala-source/com/barrybecker4/game/twoplayer/checkers/ui/CheckersBoardRenderer.scala) · [bb4--bb4-games@2afbe944caad](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad)

**Native archive.** square_board, 8 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/checkers/active_turn.png). Identical active-turn bytes appear under: checkers, othello.

<a id="game-chess"></a>
### Chess

**Usable today.** Blueprint, Joinery, Proof Sheet. Scene `cell/chess`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · rChess** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:1445](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L1445)
- **Arena App · square_board** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-grid.js:949](../../design-archive/arena-app/prototype/src/boards-grid.js#L949) · [data.js:107](../../design-archive/arena-app/prototype/src/data.js#L107)
- **Home v1/v2 · match poster** (Prototype). Home poster renderer. Both historical revisions are grouped as one lineage. [eSlams Home v2.dc.html:917](../../design-archive/home-v2/eSlams%20Home%20v2.dc.html#L917) · [eSlams Home.dc.html:829](../../design-archive/home-v1/eSlams%20Home.dc.html#L829)
- **Early web · board** (Prototype). Original board component in the web v1–v4 handoff. [games.jsx:35](../../design-archive/web-v1-v4/app/games.jsx#L35)
- **Web v4 poster · PvBoardSlide** (Shared layout). Decorative preview animation from the Arena picker. [arena-preview.jsx:60](../../design-archive/web-v1-v4/app/arena-preview.jsx#L60)
- **Stadium prototype · chess** (Prototype). Documented historical sample and its view. [Board.dc.html:83](../../design-archive/stadium-prototype/Board.dc.html#L83) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:5](../../design-archive/stadium-prototype/data.js#L5)
- **Platform replay · chess** (Archived renderer). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:56](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L56) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **shaack/cm-chessboard** (Renderer source). Accessible SVG boards, responsive sizing, promotion controls and piece animation. Code only. Staunty pieces have separate CC BY-NC-SA terms and are excluded, along with all other piece art. [chessboard.css](../../reference/public-games/sources/shaack--cm-chessboard@2069b9ef3c10/assets/chessboard.css) · [shaack--cm-chessboard@2069b9ef3c10](../../reference/public-games/sources/shaack--cm-chessboard@2069b9ef3c10)
- **lichess-org/chessground** (Renderer source). Drag targets, animation plans, highlights and board-layer composition. GPL reference; do not copy into the MIT library without a compatible licensing decision. No piece artwork. [chessground.base.css](../../reference/public-games/sources/lichess-org--chessground@b4f605018e10/assets/chessground.base.css) · [lichess-org--chessground@b4f605018e10](../../reference/public-games/sources/lichess-org--chessground@b4f605018e10)
- **gbtami/chessgroundx** (Renderer source). Variant-aware dimensions, reserve pockets and piece roles. GPL variant renderer; geometry support is not a rules engine or artwork license. [anim.ts](../../reference/public-games/sources/gbtami--chessgroundx@b898e080dfa2/src/anim.ts) · [gbtami--chessgroundx@b898e080dfa2](../../reference/public-games/sources/gbtami--chessgroundx@b898e080dfa2)
- **sotetsuk/pgx** (Renderer source). Compact state-to-SVG renderers and game-specific board/seat geometry. Bridge reference covers bidding, not play-phase dummy. Image assets are excluded because they have separate provenance. [chess.py](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67/pgx/_src/dwg/chess.py) · [sotetsuk--pgx@87278d2d6e67](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67)
- **Farama-Foundation/PettingZoo** (Renderer source). Public observation rendering, turn cues, poker seats and simultaneous reveals. Code only. Minecraft font, images, Atari ROMs and third-party dependencies excluded. [chess.py](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d/pettingzoo/classic/chess/chess.py) · [farama-foundation--pettingzoo@6b3f4950d23d](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d)

**Native archive.** square_board, 8 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/chess/active_turn.png). Identical active-turn bytes appear under: chess.

<a id="game-cliff-walking"></a>
### Cliff Walking

**Usable today.** Blueprint, Vector Scope, Field Manual. Scene `grid/navigation`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · Cliff Walking benchmark** (Prototype). Compact illustrative motion loop. Validate against the bundled trace before porting its movement. [eSlams Mobile App v3.dc.html:2941](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2941) · [eSlams Mobile App v3.dc.html:2924](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2924)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:45](../../design-archive/stadium-prototype/data.js#L45)
- **Platform replay · rl-grid** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:116](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L116) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Farama-Foundation/Gymnasium** (Renderer / physics). Reference state units, integration, control variants and rendering coordinate transforms. Blackjack is rules-only here. Box2D scenes differ from Core lite models. Sprites, fonts, binaries and external dependencies excluded. [cliffwalking.py](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd/gymnasium/envs/toy_text/cliffwalking.py) · [farama-foundation--gymnasium@c08564bb8edd](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-connect-four"></a>
### Connect Four

**Usable today.** Blueprint, Gumball, Bullseye, Plotter, Redline, Marquetry, Bitcrush, Sea Glass, Needlepoint, Motherboard, Pinball, Darkroom, Kiln, Riso Club, Gearbox, Velvet Rope, Origami, Wax Seal, Moonbase, Switchyard. Scene `cell/gravity`. [connect-four-designs.ts](../../src/game/connect-four-designs.ts)

- **Mobile v3 · rC4** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:1415](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L1415)
- **Arena App · connect_four** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-grid.js:676](../../design-archive/arena-app/prototype/src/boards-grid.js#L676) · [data.js:111](../../design-archive/arena-app/prototype/src/data.js#L111)
- **Home v1/v2 · match poster** (Prototype). Home poster renderer. Both historical revisions are grouped as one lineage. [eSlams Home v2.dc.html:927](../../design-archive/home-v2/eSlams%20Home%20v2.dc.html#L927) · [eSlams Home.dc.html:830](../../design-archive/home-v1/eSlams%20Home.dc.html#L830)
- **Early web Arena · play screen** (Prototype). First-party interactive prototype with a dedicated game component. [games-arena.jsx:44](../../design-archive/web-v1-v4/app/games-arena.jsx#L44)
- **Web v4 poster · PvC4** (Prototype). Decorative preview animation from the Arena picker. [arena-preview.jsx:45](../../design-archive/web-v1-v4/app/arena-preview.jsx#L45)
- **Stadium prototype · connect-four** (Prototype). Documented historical sample and its view. [Board.dc.html:79](../../design-archive/stadium-prototype/Board.dc.html#L79) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:7](../../design-archive/stadium-prototype/data.js#L7)
- **Platform replay · connect-four** (Archived renderer). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:55](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L55) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **sotetsuk/pgx** (Renderer source). Compact state-to-SVG renderers and game-specific board/seat geometry. Bridge reference covers bidding, not play-phase dummy. Image assets are excluded because they have separate provenance. [connect_four.py](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67/pgx/_src/dwg/connect_four.py) · [sotetsuk--pgx@87278d2d6e67](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67)
- **Farama-Foundation/PettingZoo** (Renderer source). Public observation rendering, turn cues, poker seats and simultaneous reveals. Code only. Minecraft font, images, Atari ROMs and third-party dependencies excluded. [connect_four.py](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d/pettingzoo/classic/connect_four/connect_four.py) · [farama-foundation--pettingzoo@6b3f4950d23d](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d)

**Native archive.** connect_four, 7 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/connect-four/active_turn.png). Identical active-turn bytes appear under: connect-four.

<a id="game-crazy-eights"></a>
### Crazy Eights

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/discard`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · shed table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:459](../../design-archive/mobile-v3/app-data-v3.js#L459)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:131](../../design-archive/arena-app/prototype/src/data.js#L131)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:34](../../design-archive/stadium-prototype/data.js#L34)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **cezarbulancea/CrazyEights** (Renderer source). Desktop hand areas, card selection and draw/discard interaction. Card PNGs excluded; rank/suit shedding is related, not the exact Core ruleset. [ComputerPane.java](../../reference/public-games/sources/cezarbulancea--crazyeights@5952844c8289/main/src/game/controller/ComputerPane.java) · [cezarbulancea--crazyeights@5952844c8289](../../reference/public-games/sources/cezarbulancea--crazyeights@5952844c8289)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/crazy-eights/active_turn.png). Identical active-turn bytes appear under: crazy-eights, cribbage, dou-dizhu, gin-rummy, mahjong.

<a id="game-cribbage"></a>
### Cribbage

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/discard-showdown`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · count table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:458](../../design-archive/mobile-v3/app-data-v3.js#L458)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:136](../../design-archive/arena-app/prototype/src/data.js#L136)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:33](../../design-archive/stadium-prototype/data.js#L33)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **lpaulger/cribbage-the-game** (Renderer source). Pegboard/scoreboard, count/play phases and visible-hand composition. Selected source files only; upstream dependencies are not installed or executed. [CountState.js](../../reference/public-games/sources/lpaulger--cribbage-the-game@26b1657b7a37/app/scripts/gameStates/CountState.js) · [lpaulger--cribbage-the-game@26b1657b7a37](../../reference/public-games/sources/lpaulger--cribbage-the-game@26b1657b7a37)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/cribbage/active_turn.png). Identical active-turn bytes appear under: crazy-eights, cribbage, dou-dizhu, gin-rummy, mahjong.

<a id="game-dou-dizhu"></a>
### Dou Dizhu

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/shedding`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · landlord table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:467](../../design-archive/mobile-v3/app-data-v3.js#L467)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:133](../../design-archive/arena-app/prototype/src/data.js#L133)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:28](../../design-archive/stadium-prototype/data.js#L28)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **datamllab/rlcard** (Shared interaction). Gin Rummy GUI layout and input zones; terminal card presentation utilities. Only Gin Rummy has a dedicated graphical GUI in this selection; other mapped games use shared/terminal card presentation. No card images or pretrained agents. [utils.py](../../reference/public-games/sources/datamllab--rlcard@d7d0a957baf4/rlcard/utils/utils.py) · [datamllab--rlcard@d7d0a957baf4](../../reference/public-games/sources/datamllab--rlcard@d7d0a957baf4)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/dou-dizhu/active_turn.png). Identical active-turn bytes appear under: crazy-eights, cribbage, dou-dizhu, gin-rummy, mahjong.

<a id="game-euchre"></a>
### Euchre

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/tricks`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · duel table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:456](../../design-archive/mobile-v3/app-data-v3.js#L456)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:129](../../design-archive/arena-app/prototype/src/data.js#L129)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:32](../../design-archive/stadium-prototype/data.js#L32)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **ahuth/euchre** (Renderer source). Trump selection, discard and trick-play phases as separate controls. Selected source files only; upstream dependencies are not installed or executed. [Card.tsx](../../reference/public-games/sources/ahuth--euchre@57bee8016b38/src/components/Card.tsx) · [ahuth--euchre@57bee8016b38](../../reference/public-games/sources/ahuth--euchre@57bee8016b38)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/euchre/active_turn.png). Identical active-turn bytes appear under: bridge, euchre, hearts, spades.

<a id="game-first-price-sealed-bid-auction"></a>
### First-Price Sealed-Bid Auction

**Usable today.** Blueprint, Switchboard, Carbon Copy. Scene `social/sealed-bids`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · rAuction** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2660](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2660)
- **Arena App · auction_panel** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:1021](../../design-archive/arena-app/prototype/src/boards-table.js#L1021) · [data.js:144](../../design-archive/arena-app/prototype/src/data.js#L144)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:39](../../design-archive/stadium-prototype/data.js#L39)
- **Platform replay · strategy-matrix** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:104](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L104) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **google-deepmind/open_spiel** (Rules). Information phases, outcome semantics and game-tree visualization. Primarily rules/information reference, not ready-made game screens. Exact dedicated licensed visual sources remain gaps for Goofspiel and first-price sealed bidding. [first_sealed_auction.cc](../../reference/public-games/sources/google-deepmind--open_spiel@8eb13ab561c4/open_spiel/games/first_sealed_auction/first_sealed_auction.cc) · [google-deepmind--open_spiel@8eb13ab561c4](../../reference/public-games/sources/google-deepmind--open_spiel@8eb13ab561c4)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** auction_panel, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/first-price-sealed-bid-auction/active_turn.png). Identical active-turn bytes appear under: first-price-sealed-bid-auction.

<a id="game-frozen-lake"></a>
### Frozen Lake

**Usable today.** Blueprint, Vector Scope, Field Manual. Scene `grid/navigation`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · Frozen Lake benchmark** (Prototype). Compact illustrative motion loop. Validate against the bundled trace before porting its movement. [eSlams Mobile App v3.dc.html:2940](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2940) · [eSlams Mobile App v3.dc.html:2924](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2924)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:44](../../design-archive/stadium-prototype/data.js#L44)
- **Platform replay · rl-grid** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:116](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L116) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Farama-Foundation/Gymnasium** (Renderer / physics). Reference state units, integration, control variants and rendering coordinate transforms. Blackjack is rules-only here. Box2D scenes differ from Core lite models. Sprites, fonts, binaries and external dependencies excluded. [frozen_lake.py](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd/gymnasium/envs/toy_text/frozen_lake.py) · [farama-foundation--gymnasium@c08564bb8edd](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-gin-rummy"></a>
### Gin Rummy

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/draw-discard`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · meld table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:457](../../design-archive/mobile-v3/app-data-v3.js#L457)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:134](../../design-archive/arena-app/prototype/src/data.js#L134)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:26](../../design-archive/stadium-prototype/data.js#L26)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **datamllab/rlcard** (Renderer source). Gin Rummy GUI layout and input zones; terminal card presentation utilities. Only Gin Rummy has a dedicated graphical GUI in this selection; other mapped games use shared/terminal card presentation. No card images or pretrained agents. [game_app.py](../../reference/public-games/sources/datamllab--rlcard@d7d0a957baf4/rlcard/agents/human_agents/gin_rummy_human_agent/gui_gin_rummy/game_app.py) · [datamllab--rlcard@d7d0a957baf4](../../reference/public-games/sources/datamllab--rlcard@d7d0a957baf4)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/gin-rummy/active_turn.png). Identical active-turn bytes appear under: crazy-eights, cribbage, dou-dizhu, gin-rummy, mahjong.

<a id="game-go"></a>
### Go

**Usable today.** Blueprint, Kaya, Kifu, Porcelain. Scene `cell/intersections`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · rGoPrev** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:1494](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L1494)
- **Arena App · go_board** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-grid.js:1192](../../design-archive/arena-app/prototype/src/boards-grid.js#L1192) · [data.js:110](../../design-archive/arena-app/prototype/src/data.js#L110)
- **Early web · board** (Prototype). Original board component in the web v1–v4 handoff. [games.jsx:145](../../design-archive/web-v1-v4/app/games.jsx#L145)
- **Web v4 poster · PvGo** (Prototype). Decorative preview animation from the Arena picker. [arena-preview.jsx:83](../../design-archive/web-v1-v4/app/arena-preview.jsx#L83)
- **Stadium prototype · go** (Prototype). Documented historical sample and its view. [Board.dc.html:91](../../design-archive/stadium-prototype/Board.dc.html#L91) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:6](../../design-archive/stadium-prototype/data.js#L6)
- **Platform replay · stone-grid** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:57](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L57) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **SabakiHQ/Shudan** (Renderer source). Go intersections, coordinates, markers, bounded views and simple vector stones. Go is exact; Gomoku shares the intersection geometry only. Board texture is excluded. [goban.css](../../reference/public-games/sources/sabakihq--shudan@bf2be30c5683/css/goban.css) · [sabakihq--shudan@bf2be30c5683](../../reference/public-games/sources/sabakihq--shudan@bf2be30c5683)
- **online-go/goban** (Renderer source). Canvas/SVG board parity and procedural plain-board themes. Third-party goscorer, image-stone payloads, textures and networking are excluded. [Goban.css](../../reference/public-games/sources/online-go--goban@d139d00134df/src/Goban.css) · [online-go--goban@d139d00134df](../../reference/public-games/sources/online-go--goban@d139d00134df)
- **Boris-Em/Goban** (Renderer source). Native view geometry and annotations independent of rules. Selected source files only; upstream dependencies are not installed or executed. [GobanView.swift](../../reference/public-games/sources/boris-em--goban@44fcbe90a4f8/Goban/GobanView.swift) · [boris-em--goban@44fcbe90a4f8](../../reference/public-games/sources/boris-em--goban@44fcbe90a4f8)
- **sotetsuk/pgx** (Renderer source). Compact state-to-SVG renderers and game-specific board/seat geometry. Bridge reference covers bidding, not play-phase dummy. Image assets are excluded because they have separate provenance. [go.py](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67/pgx/_src/dwg/go.py) · [sotetsuk--pgx@87278d2d6e67](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67)
- **Farama-Foundation/PettingZoo** (Renderer source). Public observation rendering, turn cues, poker seats and simultaneous reveals. Code only. Minecraft font, images, Atari ROMs and third-party dependencies excluded. [go.py](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d/pettingzoo/classic/go/go.py) · [farama-foundation--pettingzoo@6b3f4950d23d](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d)

**Native archive.** go_board, 8 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/go/active_turn.png). Identical active-turn bytes appear under: go.

<a id="game-gomoku"></a>
### Gomoku

**Usable today.** Blueprint, Kaya, Kifu, Porcelain. Scene `cell/intersections`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · rGo15** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:1481](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L1481)
- **Arena App · go_board** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-grid.js:1192](../../design-archive/arena-app/prototype/src/boards-grid.js#L1192) · [data.js:116](../../design-archive/arena-app/prototype/src/data.js#L116)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · go** (Placeholder). Sample dispatch selects go. The catalogue records the requested game separately. [Board.dc.html:91](../../design-archive/stadium-prototype/Board.dc.html#L91) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:13](../../design-archive/stadium-prototype/data.js#L13)
- **Platform replay · stone-grid** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:57](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L57) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **SabakiHQ/Shudan** (Renderer source). Go intersections, coordinates, markers, bounded views and simple vector stones. Go is exact; Gomoku shares the intersection geometry only. Board texture is excluded. [goban.css](../../reference/public-games/sources/sabakihq--shudan@bf2be30c5683/css/goban.css) · [sabakihq--shudan@bf2be30c5683](../../reference/public-games/sources/sabakihq--shudan@bf2be30c5683)
- **bb4/bb4-games** (Renderer source). Board/piece separation, Mancala pits and poker chip/hand/seat composition. Generic poker layouts are shared design references, not certification of Pachisi betting variants. [GoMokuBoardRenderer.scala](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad/scala-source/com/barrybecker4/game/twoplayer/gomoku/ui/GoMokuBoardRenderer.scala) · [bb4--bb4-games@2afbe944caad](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad)

**Native archive.** go_board, 7 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/gomoku/active_turn.png). Identical active-turn bytes appear under: gomoku.

<a id="game-goofspiel"></a>
### Goofspiel

**Usable today.** Blueprint, Baize, Letterpress. Scene `social/sealed-cards`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · bid table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:453](../../design-archive/mobile-v3/app-data-v3.js#L453)
- **Arena App · card_table** (Prototype). Bid cards and prize reveal in the shared table. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:139](../../design-archive/arena-app/prototype/src/data.js#L139) · [boards-table.js:668](../../design-archive/arena-app/prototype/src/boards-table.js#L668)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · sealed cards** (Prototype). Documented historical sample and its view. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:41](../../design-archive/stadium-prototype/data.js#L41)
- **Platform replay · dice-table** (Shared layout). Default routing groups Goofspiel with dice/bids. The dedicated mobile and Arena App card views are stronger restoration candidates. [replay-board.tsx:103](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L103) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **google-deepmind/open_spiel** (Rules). Information phases, outcome semantics and game-tree visualization. Primarily rules/information reference, not ready-made game screens. Exact dedicated licensed visual sources remain gaps for Goofspiel and first-price sealed bidding. [goofspiel.cc](../../reference/public-games/sources/google-deepmind--open_spiel@8eb13ab561c4/open_spiel/games/goofspiel/goofspiel.cc) · [google-deepmind--open_spiel@8eb13ab561c4](../../reference/public-games/sources/google-deepmind--open_spiel@8eb13ab561c4)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/goofspiel/active_turn.png). Identical active-turn bytes appear under: goofspiel.

<a id="game-hanabi"></a>
### Hanabi

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/cooperative`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · hanabi table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:461](../../design-archive/mobile-v3/app-data-v3.js#L461)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:137](../../design-archive/arena-app/prototype/src/data.js#L137)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:35](../../design-archive/stadium-prototype/data.js#L35)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **Farama-Foundation/PettingZoo** (Renderer source). Public observation rendering, turn cues, poker seats and simultaneous reveals. Code only. Minecraft font, images, Atari ROMs and third-party dependencies excluded. [rendering.py](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d/pettingzoo/classic/hanabi/rendering.py) · [farama-foundation--pettingzoo@6b3f4950d23d](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d)
- **bstnfrmry/hanabi** (Renderer source). Cooperative hand information, fireworks, discard zones and clue-oriented layout. Selected source files only; upstream dependencies are not installed or executed. [card.tsx](../../reference/public-games/sources/bstnfrmry--hanabi@9a9ce26ab146/src/components/card.tsx) · [bstnfrmry--hanabi@9a9ce26ab146](../../reference/public-games/sources/bstnfrmry--hanabi@9a9ce26ab146)
- **Hanabi-Live/hanabi-live** (Renderer source). Advanced card layout, clues and collaborative replay-oriented controls. GPL source references; no artwork, audio, fonts or production game logs. [CardLayout.ts](../../reference/public-games/sources/hanabi-live--hanabi-live@1844d6db553f/packages/client/src/game/ui/CardLayout.ts) · [hanabi-live--hanabi-live@1844d6db553f](../../reference/public-games/sources/hanabi-live--hanabi-live@1844d6db553f)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/hanabi/active_turn.png). Identical active-turn bytes appear under: hanabi.

<a id="game-hearts"></a>
### Hearts

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/tricks`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · duel table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:454](../../design-archive/mobile-v3/app-data-v3.js#L454)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:127](../../design-archive/arena-app/prototype/src/data.js#L127)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:30](../../design-archive/stadium-prototype/data.js#L30)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **yyjhao/html5-hearts** (Renderer source). Trick area, hand arrangement, played-card collection and DOM interactions. BSD-2-Clause text with an additional FreeBSD views disclaimer; retain the full original LICENSE. AI and card art excluded. [Card.js](../../reference/public-games/sources/yyjhao--html5-hearts@501fffd98964/js/Card.js) · [yyjhao--html5-hearts@501fffd98964](../../reference/public-games/sources/yyjhao--html5-hearts@501fffd98964)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/hearts/active_turn.png). Identical active-turn bytes appear under: bridge, euchre, hearts, spades.

<a id="game-hex"></a>
### Hex

**Usable today.** Blueprint, Joinery, Proof Sheet. Scene `cell/hex`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvHex** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2816](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2816)
- **Arena App · hex_board** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-grid.js:1319](../../design-archive/arena-app/prototype/src/boards-grid.js#L1319) · [data.js:118](../../design-archive/arena-app/prototype/src/data.js#L118)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · hex** (Prototype). Documented historical sample and its view. [Board.dc.html:95](../../design-archive/stadium-prototype/Board.dc.html#L95) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:14](../../design-archive/stadium-prototype/data.js#L14)
- **Platform replay · hex-grid** (Archived renderer). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:60](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L60) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **sotetsuk/pgx** (Renderer source). Compact state-to-SVG renderers and game-specific board/seat geometry. Bridge reference covers bidding, not play-phase dummy. Image assets are excluded because they have separate provenance. [hex.py](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67/pgx/_src/dwg/hex.py) · [sotetsuk--pgx@87278d2d6e67](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67)
- **bb4/bb4-games** (Renderer source). Board/piece separation, Mancala pits and poker chip/hand/seat composition. Generic poker layouts are shared design references, not certification of Pachisi betting variants. [HexBoardRenderer.scala](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad/scala-source/com/barrybecker4/game/twoplayer/hex/ui/HexBoardRenderer.scala) · [bb4--bb4-games@2afbe944caad](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad)
- **playhex/playhex** (Renderer source). Pixi Hex geometry, camera fit, edge goals, coordinates and last-move marks. AGPL source reference. Sound packs have separate noncommercial licenses and are excluded; no texture or image assets. [GameView.ts](../../reference/public-games/sources/playhex--playhex@5750af48f8c3/src/packages/pixi-board/GameView.ts) · [playhex--playhex@5750af48f8c3](../../reference/public-games/sources/playhex--playhex@5750af48f8c3)

**Native archive.** hex_board, 7 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/hex/active_turn.png). Identical active-turn bytes appear under: hex.

<a id="game-ice-hockey-style-arena"></a>
### Ice Hockey Style Arena

**Usable today.** Blueprint, Vector Scope, Field Manual. Scene `control/hockey`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · Ice Hockey Style Arena benchmark** (Prototype). Compact illustrative motion loop. Validate against the bundled trace before porting its movement. [eSlams Mobile App v3.dc.html:2986](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2986) · [eSlams Mobile App v3.dc.html:2924](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2924)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:54](../../design-archive/stadium-prototype/data.js#L54)
- **Platform replay · Pixi Ice Hockey Style Arena** (Archived renderer). Game-specific arcade drawing path with a separate DOM/SVG fallback. [replay-board.tsx:629](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L629) · [replay-board.tsx:777](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L777)
- **Mknsri/HockeySlam** (Related design). Hockey camera and animation-system reference. Related real-time hockey, not Core’s discrete rink. Models, textures, fonts and bundled third-party C++ headers excluded. [anim_system.cpp](../../reference/public-games/sources/mknsri--hockeyslam@0776bc00b2a4/game/anim_system.cpp) · [mknsri--hockeyslam@0776bc00b2a4](../../reference/public-games/sources/mknsri--hockeyslam@0776bc00b2a4)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-leduc-holdem"></a>
### Leduc Hold'em

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/poker`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · ring table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:463](../../design-archive/mobile-v3/app-data-v3.js#L463)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:126](../../design-archive/arena-app/prototype/src/data.js#L126)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:22](../../design-archive/stadium-prototype/data.js#L22)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **sotetsuk/pgx** (Renderer source). Compact state-to-SVG renderers and game-specific board/seat geometry. Bridge reference covers bidding, not play-phase dummy. Image assets are excluded because they have separate provenance. [leduc_holdem.py](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67/pgx/_src/dwg/leduc_holdem.py) · [sotetsuk--pgx@87278d2d6e67](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67)
- **Farama-Foundation/PettingZoo** (Renderer source). Public observation rendering, turn cues, poker seats and simultaneous reveals. Code only. Minecraft font, images, Atari ROMs and third-party dependencies excluded. [leduc_holdem.py](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d/pettingzoo/classic/rlcard_envs/leduc_holdem.py) · [farama-foundation--pettingzoo@6b3f4950d23d](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-liars-dice"></a>
### Liar's Dice

**Usable today.** Blueprint, Baize, Letterpress. Scene `social/dice`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvDice** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2897](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2897)
- **Arena App · dice_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:844](../../design-archive/arena-app/prototype/src/boards-table.js#L844) · [data.js:138](../../design-archive/arena-app/prototype/src/data.js#L138)
- **Web v4 poster · PvDice** (Prototype). Decorative preview animation from the Arena picker. [arena-preview.jsx:142](../../design-archive/web-v1-v4/app/arena-preview.jsx#L142)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:40](../../design-archive/stadium-prototype/data.js#L40)
- **Platform replay · dice-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:103](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L103) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **Kryha/boloney** (Renderer source). Dice face/roll presentation, bid quantities and opponent dice summaries. Related Liar’s Dice variant. Wallet, backend, branding, icons and remote model assets excluded; retain NOTICE. [dice.ts](../../reference/public-games/sources/kryha--boloney@17e9e6236413/frontend/src/components/dice-animation/dice.ts) · [kryha--boloney@17e9e6236413](../../reference/public-games/sources/kryha--boloney@17e9e6236413)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** dice_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/liars-dice/active_turn.png). Identical active-turn bytes appear under: liars-dice.

<a id="game-limit-texas-holdem"></a>
### Limit Texas Hold'em

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/poker`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · ring table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:464](../../design-archive/mobile-v3/app-data-v3.js#L464)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:125](../../design-archive/arena-app/prototype/src/data.js#L125)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:23](../../design-archive/stadium-prototype/data.js#L23)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **bb4/bb4-games** (Renderer source). Board/piece separation, Mancala pits and poker chip/hand/seat composition. Generic poker layouts are shared design references, not certification of Pachisi betting variants. [ChipRenderer.scala](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad/scala-source/com/barrybecker4/game/multiplayer/poker/ui/render/ChipRenderer.scala) · [bb4--bb4-games@2afbe944caad](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad)
- **Farama-Foundation/PettingZoo** (Renderer source). Public observation rendering, turn cues, poker seats and simultaneous reveals. Code only. Minecraft font, images, Atari ROMs and third-party dependencies excluded. [texas_holdem.py](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d/pettingzoo/classic/rlcard_envs/texas_holdem.py) · [farama-foundation--pettingzoo@6b3f4950d23d](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/limit-texas-holdem/active_turn.png). Identical active-turn bytes appear under: limit-texas-holdem, no-limit-texas-holdem.

<a id="game-lunar-lander"></a>
### Lunar Lander

**Usable today.** Blueprint, Vector Scope, Field Manual. Scene `control/lander`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · Lunar Lander benchmark** (Prototype). Compact illustrative motion loop. Validate against the bundled trace before porting its movement. [eSlams Mobile App v3.dc.html:2938](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2938) · [eSlams Mobile App v3.dc.html:2924](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2924)
- **Web v4 poster · PvLander** (Prototype). Decorative preview animation from the Arena picker. [arena-preview.jsx:177](../../design-archive/web-v1-v4/app/arena-preview.jsx#L177)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:48](../../design-archive/stadium-prototype/data.js#L48)
- **Platform replay · Pixi Lunar Lander** (Archived renderer). Game-specific arcade drawing path with a separate DOM/SVG fallback. [replay-board.tsx:559](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L559) · [replay-board.tsx:777](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L777)
- **Farama-Foundation/Gymnasium** (Renderer / physics). Reference state units, integration, control variants and rendering coordinate transforms. Blackjack is rules-only here. Box2D scenes differ from Core lite models. Sprites, fonts, binaries and external dependencies excluded. [lunar_lander.py](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd/gymnasium/envs/box2d/lunar_lander.py) · [farama-foundation--gymnasium@c08564bb8edd](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd)
- **maryrosecook/retro-games** (Renderer source). Small canvas arcade render loops and readable collision/motion feedback. Original source subset; no sound assets. [lunar-lander.js](../../reference/public-games/sources/maryrosecook--retro-games@2c9a82216cd4/lunar-lander/lunar-lander.js) · [maryrosecook--retro-games@2c9a82216cd4](../../reference/public-games/sources/maryrosecook--retro-games@2c9a82216cd4)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-mahjong"></a>
### Mahjong

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/tiles`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · tiles table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:466](../../design-archive/mobile-v3/app-data-v3.js#L466)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:135](../../design-archive/arena-app/prototype/src/data.js#L135)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:27](../../design-archive/stadium-prototype/data.js#L27)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **sotetsuk/pgx** (Renderer source). Compact state-to-SVG renderers and game-specific board/seat geometry. Bridge reference covers bidding, not play-phase dummy. Image assets are excluded because they have separate provenance. [mahjong.py](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67/pgx/_src/dwg/mahjong.py) · [sotetsuk--pgx@87278d2d6e67](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67)
- **FluffyStuff/riichi-mahjong-tiles** (Shared asset). Two complete vector tile styles, including backs, honors and red fives. Upstream LICENSE.md explicitly dedicates all assets to the public domain via CC0. No flower/season fork mixed into this set. [Back.svg](../../reference/public-games/sources/fluffystuff--riichi-mahjong-tiles@26e127ba2117/Black/Back.svg) · [fluffystuff--riichi-mahjong-tiles@26e127ba2117](../../reference/public-games/sources/fluffystuff--riichi-mahjong-tiles@26e127ba2117)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/mahjong/active_turn.png). Identical active-turn bytes appear under: crazy-eights, cribbage, dou-dizhu, gin-rummy, mahjong.

<a id="game-mancala"></a>
### Mancala

**Usable today.** Blueprint, Joinery, Proof Sheet. Scene `special-board/pits`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvMancala** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2721](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2721)
- **Arena App · custom** (Prototype). Bespoke geometry for this game. [boards-table.js:1268](../../design-archive/arena-app/prototype/src/boards-table.js#L1268) · [data.js:119](../../design-archive/arena-app/prototype/src/data.js#L119)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:15](../../design-archive/stadium-prototype/data.js#L15)
- **Platform replay · mancala** (Archived renderer). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:62](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L62) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **bb4/bb4-games** (Renderer source). Board/piece separation, Mancala pits and poker chip/hand/seat composition. Generic poker layouts are shared design references, not certification of Pachisi betting variants. [MancalaBinRenderer.scala](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad/scala-source/com/barrybecker4/game/twoplayer/mancala/ui/MancalaBinRenderer.scala) · [bb4--bb4-games@2afbe944caad](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad)

**Native archive.** custom, 8 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/mancala/active_turn.png). Identical active-turn bytes appear under: mancala.

<a id="game-mountain-car"></a>
### Mountain Car

**Usable today.** Blueprint, Vector Scope, Field Manual. Scene `control/hill-car`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · Mountain Car benchmark** (Prototype). Compact illustrative motion loop. Validate against the bundled trace before porting its movement. [eSlams Mobile App v3.dc.html:2949](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2949) · [eSlams Mobile App v3.dc.html:2924](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2924)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:47](../../design-archive/stadium-prototype/data.js#L47)
- **Platform replay · Pixi Mountain Car** (Archived renderer). Game-specific arcade drawing path with a separate DOM/SVG fallback. [replay-board.tsx:641](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L641) · [replay-board.tsx:747](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L747)
- **Farama-Foundation/Gymnasium** (Renderer / physics). Reference state units, integration, control variants and rendering coordinate transforms. Blackjack is rules-only here. Box2D scenes differ from Core lite models. Sprites, fonts, binaries and external dependencies excluded. [continuous_mountain_car.py](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd/gymnasium/envs/classic_control/continuous_mountain_car.py) · [farama-foundation--gymnasium@c08564bb8edd](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-negotiation"></a>
### Negotiation

**Usable today.** Blueprint, Switchboard, Carbon Copy. Scene `social/price-delivery`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvEcon** (Shared layout). The two economic games share an offer sequence. [eSlams Mobile App v3.dc.html:2912](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2912)
- **Arena App · economic_panel** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:1133](../../design-archive/arena-app/prototype/src/boards-table.js#L1133) · [data.js:143](../../design-archive/arena-app/prototype/src/data.js#L143)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:38](../../design-archive/stadium-prototype/data.js#L38)
- **Platform replay · strategy-matrix** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:104](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L104) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **stanmart/unstructured-bargaining-experiment** (Related design). Offer, acceptance, coalition/status and results interfaces. Different experimental bargaining rules; not the exact Core price/delivery grid. Participant data, settings and backend excluded. [accept.js](../../reference/public-games/sources/stanmart--unstructured-bargaining-experiment@b79d3dedff04/_static/accept.js) · [stanmart--unstructured-bargaining-experiment@b79d3dedff04](../../reference/public-games/sources/stanmart--unstructured-bargaining-experiment@b79d3dedff04)
- **google-deepmind/open_spiel** (Rules). Information phases, outcome semantics and game-tree visualization. Primarily rules/information reference, not ready-made game screens. Exact dedicated licensed visual sources remain gaps for Goofspiel and first-price sealed bidding. [negotiation.cc](../../reference/public-games/sources/google-deepmind--open_spiel@8eb13ab561c4/open_spiel/games/negotiation/negotiation.cc) · [google-deepmind--open_spiel@8eb13ab561c4](../../reference/public-games/sources/google-deepmind--open_spiel@8eb13ab561c4)

**Native archive.** economic_panel, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/negotiation/active_turn.png). Identical active-turn bytes appear under: negotiation.

<a id="game-nine-mens-morris"></a>
### Nine Men's Morris

**Usable today.** Blueprint, Joinery, Proof Sheet. Scene `special-board/graph`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvMorris** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2731](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2731)
- **Arena App · custom** (Prototype). Bespoke geometry for this game. [boards-table.js:1310](../../design-archive/arena-app/prototype/src/boards-table.js#L1310) · [data.js:120](../../design-archive/arena-app/prototype/src/data.js#L120)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:16](../../design-archive/stadium-prototype/data.js#L16)
- **Platform replay · morris** (Archived renderer). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:63](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L63) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **calcitem/Sanmill** (Renderer source). Mill board geometry, piece paint, turn highlights and animation coordination. AGPL reference only; native engine, app branding, downloaded imagery and services excluded. [animation_manager.dart](../../reference/public-games/sources/calcitem--sanmill@8901a06f088b/src/ui/flutter_app/lib/game_page/services/animation/animation_manager.dart) · [calcitem--sanmill@8901a06f088b](../../reference/public-games/sources/calcitem--sanmill@8901a06f088b)

**Native archive.** custom, 8 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/nine-mens-morris/active_turn.png). Identical active-turn bytes appear under: nine-mens-morris.

<a id="game-no-limit-texas-holdem"></a>
### No-Limit Texas Hold'em

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/poker`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · ring table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:465](../../design-archive/mobile-v3/app-data-v3.js#L465)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:124](../../design-archive/arena-app/prototype/src/data.js#L124)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:24](../../design-archive/stadium-prototype/data.js#L24)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **bb4/bb4-games** (Renderer source). Board/piece separation, Mancala pits and poker chip/hand/seat composition. Generic poker layouts are shared design references, not certification of Pachisi betting variants. [ChipRenderer.scala](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad/scala-source/com/barrybecker4/game/multiplayer/poker/ui/render/ChipRenderer.scala) · [bb4--bb4-games@2afbe944caad](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad)
- **Farama-Foundation/PettingZoo** (Renderer source). Public observation rendering, turn cues, poker seats and simultaneous reveals. Code only. Minecraft font, images, Atari ROMs and third-party dependencies excluded. [texas_holdem_no_limit.py](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d/pettingzoo/classic/rlcard_envs/texas_holdem_no_limit.py) · [farama-foundation--pettingzoo@6b3f4950d23d](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/no-limit-texas-holdem/active_turn.png). Identical active-turn bytes appear under: limit-texas-holdem, no-limit-texas-holdem.

<a id="game-othello"></a>
### Othello

**Usable today.** Blueprint, Joinery, Proof Sheet. Scene `cell/discs`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · rOth** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:1432](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L1432)
- **Arena App · square_board** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-grid.js:949](../../design-archive/arena-app/prototype/src/boards-grid.js#L949) · [data.js:114](../../design-archive/arena-app/prototype/src/data.js#L114)
- **Home v1/v2 · match poster** (Prototype). Home poster renderer. Both historical revisions are grouped as one lineage. [eSlams Home v2.dc.html:948](../../design-archive/home-v2/eSlams%20Home%20v2.dc.html#L948) · [eSlams Home.dc.html:832](../../design-archive/home-v1/eSlams%20Home.dc.html#L832)
- **Early web Arena · play screen** (Prototype). First-party interactive prototype with a dedicated game component. [games-arena.jsx:76](../../design-archive/web-v1-v4/app/games-arena.jsx#L76)
- **Web v4 poster · PvOthello** (Prototype). Decorative preview animation from the Arena picker. [arena-preview.jsx:99](../../design-archive/web-v1-v4/app/arena-preview.jsx#L99)
- **Stadium prototype · othello** (Prototype). Documented historical sample and its view. [Board.dc.html:83](../../design-archive/stadium-prototype/Board.dc.html#L83) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:9](../../design-archive/stadium-prototype/data.js#L9)
- **Platform replay · disc-grid** (Archived renderer). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:58](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L58) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **sotetsuk/pgx** (Renderer source). Compact state-to-SVG renderers and game-specific board/seat geometry. Bridge reference covers bidding, not play-phase dummy. Image assets are excluded because they have separate provenance. [othello.py](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67/pgx/_src/dwg/othello.py) · [sotetsuk--pgx@87278d2d6e67](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67)

**Native archive.** square_board, 8 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/othello/active_turn.png). Identical active-turn bytes appear under: checkers, othello.

<a id="game-paddle-ball"></a>
### Paddle Ball

**Usable today.** Blueprint, Vector Scope, Field Manual. Scene `control/paddle`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · Paddle Ball benchmark** (Prototype). Compact illustrative motion loop. Validate against the bundled trace before porting its movement. [eSlams Mobile App v3.dc.html:2972](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2972) · [eSlams Mobile App v3.dc.html:2924](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2924)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:51](../../design-archive/stadium-prototype/data.js#L51)
- **Platform replay · Pixi Paddle Ball** (Archived renderer). Game-specific arcade drawing path with a separate DOM/SVG fallback. [replay-board.tsx:610](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L610) · [replay-board.tsx:777](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L777)
- **jatinmandav/Gaming-in-Python** (Related design). Pong paddle/ball collision and presentation reference. Two-sided Pong differs from the bundled bottom-paddle rally; no unrelated branded games are included. [Pong.py](../../reference/public-games/sources/jatinmandav--gaming-in-python@f51b9e1e0f8a/Pong/Pong.py) · [jatinmandav--gaming-in-python@f51b9e1e0f8a](../../reference/public-games/sources/jatinmandav--gaming-in-python@f51b9e1e0f8a)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-pentago"></a>
### Pentago

**Usable today.** Blueprint, Kaya, Kifu, Porcelain. Scene `cell/quadrants`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvPentago** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2763](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2763)
- **Arena App · custom** (Prototype). Bespoke geometry for this game. [boards-table.js:1374](../../design-archive/arena-app/prototype/src/boards-table.js#L1374) · [data.js:117](../../design-archive/arena-app/prototype/src/data.js#L117)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:17](../../design-archive/stadium-prototype/data.js#L17)
- **Platform replay · grid** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:119](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L119) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **girving/pentago** (Renderer source). Quadrant rotation, board transforms and board SVG construction. Source subset only; solver databases and Wasm are excluded. LICENSE text is BSD-3-Clause despite GitHub NOASSERTION. [board.js](../../reference/public-games/sources/girving--pentago@d8ae9b10d407/ios/js/board.js) · [girving--pentago@d8ae9b10d407](../../reference/public-games/sources/girving--pentago@d8ae9b10d407)

**Native archive.** custom, 7 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/pentago/active_turn.png). Identical active-turn bytes appear under: pentago.

<a id="game-prisoners-dilemma"></a>
### Prisoner's Dilemma

**Usable today.** Blueprint, Switchboard, Carbon Copy. Scene `social/sealed-actions`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · rPD** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2646](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2646)
- **Arena App · payoff_matrix** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:943](../../design-archive/arena-app/prototype/src/boards-table.js#L943) · [data.js:141](../../design-archive/arena-app/prototype/src/data.js#L141)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:36](../../design-archive/stadium-prototype/data.js#L36)
- **Platform replay · strategy-matrix** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:104](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L104) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **ncase/trust** (Interaction). Payoff matrix explanation, repeated-round teaching and interactive parameter controls. Only original simulation/control source is copied. CC BY-NC audio, third-party libraries, characters and music excluded. [PayoffsUI.js](../../reference/public-games/sources/ncase--trust@6ec45d73befd/js/core/PayoffsUI.js) · [ncase--trust@6ec45d73befd](../../reference/public-games/sources/ncase--trust@6ec45d73befd)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** payoff_matrix, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/prisoners-dilemma/active_turn.png). Identical active-turn bytes appear under: prisoners-dilemma.

<a id="game-rock-paper-scissors"></a>
### Rock Paper Scissors

**Usable today.** Blueprint, Switchboard, Carbon Copy. Scene `social/sealed-actions`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · rRPS** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:1541](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L1541)
- **Arena App · payoff_matrix** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:943](../../design-archive/arena-app/prototype/src/boards-table.js#L943) · [data.js:145](../../design-archive/arena-app/prototype/src/data.js#L145)
- **Early web Arena · play screen** (Prototype). First-party interactive prototype with a dedicated game component. [games-arena.jsx:114](../../design-archive/web-v1-v4/app/games-arena.jsx#L114)
- **Web v4 poster · PvRPS** (Prototype). Decorative preview animation from the Arena picker. [arena-preview.jsx:127](../../design-archive/web-v1-v4/app/arena-preview.jsx#L127)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:42](../../design-archive/stadium-prototype/data.js#L42)
- **Platform replay · strategy-matrix** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:104](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L104) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Farama-Foundation/PettingZoo** (Renderer source). Public observation rendering, turn cues, poker seats and simultaneous reveals. Code only. Minecraft font, images, Atari ROMs and third-party dependencies excluded. [rps.py](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d/pettingzoo/classic/rps/rps.py) · [farama-foundation--pettingzoo@6b3f4950d23d](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d)
- **boardgameio/boardgame.io** (Shared interaction). Separate player views and redacted move history for hidden-information interfaces. Shared interaction examples only, not implementations or rule certifications of the mapped games. No upstream networking or dependencies are run. [board.css](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3/examples/react-web/src/redacted-move/board.css) · [boardgameio--boardgame.io@47adef2b46e3](../../reference/public-games/sources/boardgameio--boardgame.io@47adef2b46e3)

**Native archive.** payoff_matrix, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/rock-paper-scissors/active_turn.png). Identical active-turn bytes appear under: rock-paper-scissors.

<a id="game-shedding-card-game"></a>
### Shedding Card Game

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/discard`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · shed table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:460](../../design-archive/mobile-v3/app-data-v3.js#L460)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:132](../../design-archive/arena-app/prototype/src/data.js#L132)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:25](../../design-archive/stadium-prototype/data.js#L25)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **datamllab/rlcard** (Shared interaction). Gin Rummy GUI layout and input zones; terminal card presentation utilities. Only Gin Rummy has a dedicated graphical GUI in this selection; other mapped games use shared/terminal card presentation. No card images or pretrained agents. [utils.py](../../reference/public-games/sources/datamllab--rlcard@d7d0a957baf4/rlcard/utils/utils.py) · [datamllab--rlcard@d7d0a957baf4](../../reference/public-games/sources/datamllab--rlcard@d7d0a957baf4)
- **cezarbulancea/CrazyEights** (Renderer source). Desktop hand areas, card selection and draw/discard interaction. Card PNGs excluded; rank/suit shedding is related, not the exact Core ruleset. [ComputerPane.java](../../reference/public-games/sources/cezarbulancea--crazyeights@5952844c8289/main/src/game/controller/ComputerPane.java) · [cezarbulancea--crazyeights@5952844c8289](../../reference/public-games/sources/cezarbulancea--crazyeights@5952844c8289)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-shogi"></a>
### Shogi

**Usable today.** Blueprint, Joinery, Proof Sheet. Scene `special-board/shogi`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvKanji** (Shared layout). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2705](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2705)
- **Arena App · custom** (Prototype). Bespoke geometry for this game. [boards-table.js:1532](../../design-archive/arena-app/prototype/src/boards-table.js#L1532) · [data.js:108](../../design-archive/arena-app/prototype/src/data.js#L108)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:11](../../design-archive/stadium-prototype/data.js#L11)
- **Platform replay · grid** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:119](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L119) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **WandererXII/shogiground** (Renderer source). Shogi reserve hands, promotion choices, keyboard targets and movement. GPL reference; no lishogi piece art or brand assets. [anim.ts](../../reference/public-games/sources/wandererxii--shogiground@661ed8ca0c2c/src/anim.ts) · [wandererxii--shogiground@661ed8ca0c2c](../../reference/public-games/sources/wandererxii--shogiground@661ed8ca0c2c)
- **gbtami/chessgroundx** (Renderer source). Variant-aware dimensions, reserve pockets and piece roles. GPL variant renderer; geometry support is not a rules engine or artwork license. [anim.ts](../../reference/public-games/sources/gbtami--chessgroundx@b898e080dfa2/src/anim.ts) · [gbtami--chessgroundx@b898e080dfa2](../../reference/public-games/sources/gbtami--chessgroundx@b898e080dfa2)
- **sotetsuk/pgx** (Renderer source). Compact state-to-SVG renderers and game-specific board/seat geometry. Bridge reference covers bidding, not play-phase dummy. Image assets are excluded because they have separate provenance. [shogi.py](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67/pgx/_src/dwg/shogi.py) · [sotetsuk--pgx@87278d2d6e67](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67)

**Native archive.** custom, 8 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/shogi/active_turn.png). Identical active-turn bytes appear under: shogi.

<a id="game-spades"></a>
### Spades

**Usable today.** Blueprint, Baize, Letterpress. Scene `cards/tricks`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · duel table** (Prototype). A scripted card composition with a game-specific scene configuration. [eSlams Mobile App v3.dc.html:2834](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2834) · [app-data-v3.js:455](../../design-archive/mobile-v3/app-data-v3.js#L455)
- **Arena App · card_table** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-table.js:687](../../design-archive/arena-app/prototype/src/boards-table.js#L687) · [data.js:128](../../design-archive/arena-app/prototype/src/data.js#L128)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:103](../../design-archive/stadium-prototype/Board.dc.html#L103) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:31](../../design-archive/stadium-prototype/data.js#L31)
- **Platform replay · card-table** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:66](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L66) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Platform Arena · seated card table** (Shared layout). Host table with seat and perspective handling. Compare the per-game state before treating a variation as a distinct screen. [arena-card-table.tsx:74](../../reference/platform/web-0fa7dfe/apps/web/components/arena-card-table.tsx#L74)
- **mreishus/spades** (Renderer source). Partnership seating, table rotation, card primitives and scoring. Selected source files only; upstream dependencies are not installed or executed. [Card.tsx](../../reference/public-games/sources/mreishus--spades@095d840ba008/frontend/src/components/basic/Card.tsx) · [mreishus--spades@095d840ba008](../../reference/public-games/sources/mreishus--spades@095d840ba008)
- **hayeah/playing-cards-assets** (Shared asset). Shared SVG card faces and alternative court designs. Repository MIT license retained. README attributes underlying vector-playing-cards artwork to a public-domain source; retain that provenance. These assets do not establish game-rule coverage. [10_of_clubs.svg](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d/svg-cards/10_of_clubs.svg) · [hayeah--playing-cards-assets@1e4497c05c3d](../../reference/public-games/sources/hayeah--playing-cards-assets@1e4497c05c3d)

**Native archive.** card_table, 9 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/spades/active_turn.png). Identical active-turn bytes appear under: bridge, euchre, hearts, spades.

<a id="game-taxi"></a>
### Taxi

**Usable today.** Blueprint, Vector Scope, Field Manual. Scene `grid/navigation`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · Taxi benchmark** (Prototype). Compact illustrative motion loop. Validate against the bundled trace before porting its movement. [eSlams Mobile App v3.dc.html:2939](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2939) · [eSlams Mobile App v3.dc.html:2924](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2924)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:43](../../design-archive/stadium-prototype/data.js#L43)
- **Platform replay · rl-grid** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:116](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L116) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **Farama-Foundation/Gymnasium** (Renderer / physics). Reference state units, integration, control variants and rendering coordinate transforms. Blackjack is rules-only here. Box2D scenes differ from Core lite models. Sprites, fonts, binaries and external dependencies excluded. [taxi.py](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd/gymnasium/envs/toy_text/taxi.py) · [farama-foundation--gymnasium@c08564bb8edd](../../reference/public-games/sources/farama-foundation--gymnasium@c08564bb8edd)

**Native archive.** No game-specific golden image found under this slug.

<a id="game-tic-tac-toe"></a>
### Tic-Tac-Toe

**Usable today.** Blueprint, Joinery, Proof Sheet. Scene `cell/marks`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · rTTT** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:1400](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L1400)
- **Arena App · grid_3x3** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-grid.js:545](../../design-archive/arena-app/prototype/src/boards-grid.js#L545) · [data.js:112](../../design-archive/arena-app/prototype/src/data.js#L112)
- **Home v1/v2 · match poster** (Prototype). Home poster renderer. Both historical revisions are grouped as one lineage. [eSlams Home v2.dc.html:937](../../design-archive/home-v2/eSlams%20Home%20v2.dc.html#L937) · [eSlams Home.dc.html:831](../../design-archive/home-v1/eSlams%20Home.dc.html#L831)
- **Early web Arena · play screen** (Prototype). First-party interactive prototype with a dedicated game component. [games-arena.jsx:13](../../design-archive/web-v1-v4/app/games-arena.jsx#L13)
- **Arena reference · neon crosses** (Prototype). Pink X and cyan O with luminous type on the original standalone board. [arena.html:163](../../design-archive/web-v1-v4/references/arena.html#L163)
- **Web v4 poster · PvTTT** (Prototype). Decorative preview animation from the Arena picker. [arena-preview.jsx:26](../../design-archive/web-v1-v4/app/arena-preview.jsx#L26)
- **Stadium prototype · tic-tac-toe** (Prototype). Documented historical sample and its view. [Board.dc.html:75](../../design-archive/stadium-prototype/Board.dc.html#L75) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:8](../../design-archive/stadium-prototype/data.js#L8)
- **Platform replay · tic-tac-toe** (Archived renderer). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:54](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L54) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **sotetsuk/pgx** (Renderer source). Compact state-to-SVG renderers and game-specific board/seat geometry. Bridge reference covers bidding, not play-phase dummy. Image assets are excluded because they have separate provenance. [tictactoe.py](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67/pgx/_src/dwg/tictactoe.py) · [sotetsuk--pgx@87278d2d6e67](../../reference/public-games/sources/sotetsuk--pgx@87278d2d6e67)
- **bb4/bb4-games** (Renderer source). Board/piece separation, Mancala pits and poker chip/hand/seat composition. Generic poker layouts are shared design references, not certification of Pachisi betting variants. [TicTacToeBoardRenderer.scala](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad/scala-source/com/barrybecker4/game/twoplayer/tictactoe/ui/TicTacToeBoardRenderer.scala) · [bb4--bb4-games@2afbe944caad](../../reference/public-games/sources/bb4--bb4-games@2afbe944caad)
- **Farama-Foundation/PettingZoo** (Renderer source). Public observation rendering, turn cues, poker seats and simultaneous reveals. Code only. Minecraft font, images, Atari ROMs and third-party dependencies excluded. [tictactoe.py](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d/pettingzoo/classic/tictactoe/tictactoe.py) · [farama-foundation--pettingzoo@6b3f4950d23d](../../reference/public-games/sources/farama-foundation--pettingzoo@6b3f4950d23d)

**Native archive.** grid_3x3, 7 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/tic-tac-toe/active_turn.png). Identical active-turn bytes appear under: tic-tac-toe.

<a id="game-ultimate-tic-tac-toe"></a>
### Ultimate Tic-Tac-Toe

**Usable today.** Blueprint, Joinery, Proof Sheet. Scene `cell/nested-marks`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvUTTT** (Prototype). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2808](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2808)
- **Arena App · grid_3x3** (Shared layout). The prototype routes this game to the named component. Seat layout and public state specialize the view. [boards-grid.js:545](../../design-archive/arena-app/prototype/src/boards-grid.js#L545) · [data.js:113](../../design-archive/arena-app/prototype/src/data.js#L113)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:75](../../design-archive/stadium-prototype/Board.dc.html#L75) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:18](../../design-archive/stadium-prototype/data.js#L18)
- **Platform replay · ultimate-grid** (Archived renderer). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:61](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L61) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **arnowaczynski/utttai** (Renderer source). Nested-board status, forced target, move history and analysis dashboard. Selected source files only; upstream dependencies are not installed or executed. [Dashboard.js](../../reference/public-games/sources/arnowaczynski--utttai@622dae66b181/website/src/game/Dashboard.js) · [arnowaczynski--utttai@622dae66b181](../../reference/public-games/sources/arnowaczynski--utttai@622dae66b181)

**Native archive.** grid_3x3, 7 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/ultimate-tic-tac-toe/active_turn.png). Identical active-turn bytes appear under: ultimate-tic-tac-toe.

<a id="game-xiangqi"></a>
### Xiangqi

**Usable today.** Blueprint, Joinery, Proof Sheet. Scene `special-board/xiangqi`. [visual-editions.json](../../src/game/visual-editions.json)

- **Mobile v3 · pvKanji** (Shared layout). Mobile screen or named preview drawing routine. [eSlams Mobile App v3.dc.html:2705](../../design-archive/mobile-v3/eSlams%20Mobile%20App%20v3.dc.html#L2705)
- **Arena App · custom** (Prototype). Bespoke geometry for this game. [boards-table.js:1571](../../design-archive/arena-app/prototype/src/boards-table.js#L1571) · [data.js:109](../../design-archive/arena-app/prototype/src/data.js#L109)
- **Web v4 picker fallback** (Placeholder). The dispatcher reuses a stone board, sliding token board, card fan, matrix, lander or track. This is evidence of a placement only. [arena-preview.jsx:210](../../design-archive/web-v1-v4/app/arena-preview.jsx#L210)
- **Stadium prototype · tic-tac-toe** (Placeholder). Sample dispatch selects tic-tac-toe. The catalogue records the requested game separately. [Board.dc.html:56](../../design-archive/stadium-prototype/Board.dc.html#L56) · [records.js:92](../../design-archive/stadium-prototype/records.js#L92) · [data.js:12](../../design-archive/stadium-prototype/data.js#L12)
- **Platform replay · grid** (Shared layout). Default replay composition. A supplied renderer hint can change the route. [replay-board.tsx:119](../../reference/platform/web-0fa7dfe/apps/web/components/replay-board.tsx#L119) · [replay-visualization.ts:110](../../reference/platform/web-0fa7dfe/apps/web/lib/replay-visualization.ts#L110)
- **gbtami/chessgroundx** (Renderer source). Variant-aware dimensions, reserve pockets and piece roles. GPL variant renderer; geometry support is not a rules engine or artwork license. [anim.ts](../../reference/public-games/sources/gbtami--chessgroundx@b898e080dfa2/src/anim.ts) · [gbtami--chessgroundx@b898e080dfa2](../../reference/public-games/sources/gbtami--chessgroundx@b898e080dfa2)
- **lengyanyu258/xiangqiboardjs** (Renderer source). Xiangqi board interactions and board-specific geometry. Piece images and site assets excluded. [xiangqiboard.css](../../reference/public-games/sources/lengyanyu258--xiangqiboardjs@c36e1046c424/src/xiangqiboard.css) · [lengyanyu258--xiangqiboardjs@c36e1046c424](../../reference/public-games/sources/lengyanyu258--xiangqiboardjs@c36e1046c424)

**Native archive.** custom, 8 captured states and 6 shared family appearances. [Active-turn sample](../../reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/games/xiangqi/active_turn.png). Identical active-turn bytes appear under: xiangqi.
