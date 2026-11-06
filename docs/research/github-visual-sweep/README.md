# GitHub visual-design sweep · 4 November 2026

Across **50 games**, 150 targeted searches returned 22,445 repository hits and **21,819 distinct public repository names**. 21,719 had not appeared in the previous search ledger. The local tree/source sampler completed **657 pinned inspections**. The curated set contains **88 game-to-design mappings across 87 repositories**. 29 repositories have visual notes from inspection of their upstream images.

**Material brought into Pachisi.** [The source snapshot collection](../../../reference/github-visual-sweep/README.md) contains 156 verbatim files from 77 repositories. Other curated entries link to pinned originals. These research selections add zero to the existing 170 usable game/design pairs.

## How to read the findings

Game screens and board components are direct visual references. A rule variant, related experiment, scoring surface or physics relative has a narrower scope. For example, an e-ink cribbage pegboard supports score tracking, whereas the bundled Cribbage trace covers a discard/showdown game. An archived code selection is a partial source snapshot. Independent implementations still need a separate port and local behavioral tests.

**Search boundary.** Queries used GitHub repository search with public visibility and forks excluded. The collector followed pages of 100 until the last available page or GitHub’s 1,000-result limit. 7 queries reported more than 1,000 matches and 0 page responses were flagged incomplete. Search indexing and ranking can change during pagination. This covers every Pachisi game and the accessible pages for these queries, not every repository on GitHub. [GitHub search limits](https://docs.github.com/en/rest/search/search#about-search).

The sampler ranked new candidates by game/UI terms, language, license hint and popularity, with additional languages represented. It read a commit tree, looked for license and preview files, and sampled likely rendering code. A rendering keyword alone does not establish a match. The curated findings were selected separately and point to specific blobs. Candidate totals exclude private repositories and forks. Per-game repository totals overlap.

[All query pages and returned repository IDs](discovery.json.gz) · [Pinned inspection evidence and dispositions](inspections.json.gz) · [Curated selections](selections.tsv) · [Visual observations](visual-notes.tsv) · [Previous local census](../local-game-design-census.md).

## Strong port candidates

| Game | Design to study | Requirement before making it selectable |
|---|---|---|
| Goofspiel | Dedicated canvas renderer and replay viewer | Map prize, both bid backs and their simultaneous reveal to public trace phases. |
| Bridge | Four named seat edges and bidding history | Show the dummy only when the supplied viewer state permits it. Separate bidding from play. |
| Cribbage | E-ink peg track with a left-hand score key | Supply actual pegging scores. The compact showdown trace alone cannot drive this surface. |
| Go | Perspective goban with stone bowls | Test hit targets and coordinate mapping at every supported size before adopting the camera. |
| Dou Dizhu | Full bottom hand with compact opponent information | Keep each private hand scoped to its owner and fit long hands on phones. |
| Pentago | Four red trays around black and white marbles | Keep quadrant boundaries legible through a rotation. Animate only the resolved change. |

## Alien Shooter

2,263 candidates · 23 of those repositories received a pinned tree inspection.

- **Amegma/Galaxy-Attack** (arcade relative). Separate Pygame play and score screens for a sprite-based shooter. A small ship and enemy sprites sit on a black field with score, lives and weapon status in the top band. [Pinned source](https://github.com/Amegma/Galaxy-Attack/blob/ecc2de618cc11d12ae55e906f3b3ba3689088f5a/screens/game.py#L1) · [Reviewed image](https://github.com/Amegma/Galaxy-Attack/blob/ecc2de618cc11d12ae55e906f3b3ba3689088f5a/images/game2.png) · [Local source](../../../reference/github-visual-sweep/sources/amegma--galaxy-attack@ecc2de618cc1/screens/game.py) · MIT.
- **iandevlin/canvasinvaders** (arcade relative). Browser canvas playfield for the invader formation and moving shots. [Pinned source](https://github.com/iandevlin/canvasinvaders/blob/25dedf94b7f5c21ba1f003459b388c7f998d4f90/canvasinvaders.js#L7) · [Local source](../../../reference/github-visual-sweep/sources/iandevlin--canvasinvaders@25dedf94b7f5/canvasinvaders.js) · MIT.

## Backgammon

259 candidates · 15 of those repositories received a pinned tree inspection.

- **eamag/nard** (game screen). Browser training board with a preview state and a separate coaching panel. [Pinned source](https://github.com/eamag/nard/blob/6468c949a9f631368ae5e1690781ca5b7d9a015d/src/components/GameBoard.svelte#L48) · [Local source](../../../reference/github-visual-sweep/sources/eamag--nard@6468c949a9f6/src/components/GameBoard.svelte) · MIT.
- **mvichosfm/plakoto** (rule variant). A three-dimensional tavli presentation with board effects, lessons and puzzles. Plakoto pins opposing checkers. An angled wooden table and triangular points occupy the centre, with controls kept outside the playfield. [Pinned source](https://github.com/mvichosfm/plakoto/blob/08f64fcd95d8196c23f74e7c6ec706f2add64855/src/effects.js#L15) · [Reviewed image](https://github.com/mvichosfm/plakoto/blob/08f64fcd95d8196c23f74e7c6ec706f2add64855/docs/screenshot.jpg) · [Local source](../../../reference/github-visual-sweep/sources/mvichosfm--plakoto@08f64fcd95d8/src/effects.js) · MIT.
- **yavuzkrm/tavla-online** (game screen). Two-player tavla board rendered as a React component. [Pinned source](https://github.com/yavuzkrm/tavla-online/blob/c3c991f027656f510ad4aa459a113d9ade112a5e/client/src/components/Board.tsx#L18) · [Local source](../../../reference/github-visual-sweep/sources/yavuzkrm--tavla-online@c3c991f02765/client/src/components/Board.tsx) · MIT.

## Bargaining

44 candidates · 10 of those repositories received a pinned tree inspection.

- **IMC-Lab/UG-causation** (related experiment). An ultimatum-game acceptance interface built from experimental response controls. Participant data are excluded. [Pinned source](https://github.com/IMC-Lab/UG-causation/blob/40890ce3feaa94316cfd28fb576f9a7acf9ee2d9/exp/exp-accept.js#L4) · [Local source](../../../reference/github-visual-sweep/sources/imc-lab--ug-causation@40890ce3feaa/exp/exp-accept.js) · MIT.
- **cherylwang2028/Ultimatum-game** (related experiment). Browser interface for a dynamic two-player ultimatum experiment. [Pinned source](https://github.com/cherylwang2028/Ultimatum-game/blob/9ec2e8369ca4b2018a1369225fefa0bb1a200883/public/index.html#L13) · Link only · Unspecified.

## Battleship

1,105 candidates · 15 of those repositories received a pinned tree inspection.

- **abdullahjamal1/battleshipBoardGame** (rule variant). Island-edition Battleship drawing code; terrain changes the placement problem. [Pinned source](https://github.com/abdullahjamal1/battleshipBoardGame/blob/c4f09f09f0a92be89034137ca2d80889c1c2d02c/src/draw.ts#L27) · [Local source](../../../reference/github-visual-sweep/sources/abdullahjamal1--battleshipboardgame@c4f09f09f0a9/src/draw.ts) · GPL-3.0.
- **scc416/battleship** (game screen). Board and coordinate-label components separate the playable grid from its axes. [Pinned source](https://github.com/scc416/battleship/blob/add5b7a9cc47f00d436dc91955735408978a4ca6/src/Components/Display/Board/index.jsx#L25) · [Local source](../../../reference/github-visual-sweep/sources/scc416--battleship@add5b7a9cc47/src/Components/Display/Board/index.jsx) · MIT.

## Bipedal Walker

5 candidates · 5 of those repositories received a pinned tree inspection.

- **De-Rosa/PPO-BipedalWalker** (physics relative). A dedicated C# renderer for a biped simulation with an impulse-based physics engine. [Pinned source](https://github.com/De-Rosa/PPO-BipedalWalker/blob/4080f451b5588d0d90bda58a29d8d2c6308dd208/Rendering/Renderer.cs#L4) · [Local source](../../../reference/github-visual-sweep/sources/de-rosa--ppo-bipedalwalker@4080f451b558/Rendering/Renderer.cs) · MIT.
- **andrefkruger/walker-ai** (physics relative). Pygame visualizer kept separate from the Box2D locomotion training code. [Pinned source](https://github.com/andrefkruger/walker-ai/blob/42c704ae883e4df03c05376b9d72922f8881d176/render/renderer.py#L1) · [Local source](../../../reference/github-visual-sweep/sources/andrefkruger--walker-ai@42c704ae883e/render/renderer.py) · MIT.

## Blackjack

878 candidates · 20 of those repositories received a pinned tree inspection.

- **JHoff1/NeonTableGames** (game screen). Browser table with explicit face-down cards, suit marks and visible rank corners. Dealer and player hands sit inside an oval marking on dark green felt with controls below. [Pinned source](https://github.com/JHoff1/NeonTableGames/blob/af8b7b5fd8f53e7ff967326e8512654dc56838c7/src/blackjack/BlackjackTable.tsx#L13) · [Reviewed image](https://github.com/JHoff1/NeonTableGames/blob/af8b7b5fd8f53e7ff967326e8512654dc56838c7/docs/images/blackjack-desktop.png) · [Local source](../../../reference/github-visual-sweep/sources/jhoff1--neontablegames@af8b7b5fd8f5/src/blackjack/BlackjackTable.tsx) · Apache-2.0.
- **tukiains/blackjack-gui** (game screen). Desktop table components keep dealer information and player controls distinct. [Pinned source](https://github.com/tukiains/blackjack-gui/blob/4203d24452ea0f5b6a75789ab56e8c87f51475e0/blackjack_gui/table_components.py#L2) · [Local source](../../../reference/github-visual-sweep/sources/tukiains--blackjack-gui@4203d24452ea/blackjack_gui/table_components.py) · MIT.

## Boxing Style Arena

34 candidates · 13 of those repositories received a pinned tree inspection.

- **san-santra/pyboxing** (arcade relative). Atari-style two-fighter boxing in a Pygame ring. [Pinned source](https://github.com/san-santra/pyboxing/blob/cbba833d49546c063c79a8bfb2c79ecccbecc1de/main.py#L1) · [Local source](../../../reference/github-visual-sweep/sources/san-santra--pyboxing@cbba833d4954/main.py) · GPL-3.0.
- **ujjwalkrmfp16-creator/air-boxing-prototype** (interaction relative). Webcam pose feedback is a different input and display treatment from the discrete arena. Ring ropes and fighter targets occupy the playfield, with a separate camera inset and health bars. [Pinned source](https://github.com/ujjwalkrmfp16-creator/air-boxing-prototype/blob/d60cafa9fcc765390f9a164218ca9073c0a1b5b7/air_boxing_vs_fast_stable.py#L5) · [Reviewed image](https://github.com/ujjwalkrmfp16-creator/air-boxing-prototype/blob/d60cafa9fcc765390f9a164218ca9073c0a1b5b7/gameplay.png) · [Local source](../../../reference/github-visual-sweep/sources/ujjwalkrmfp16-creator--air-boxing-prototype@d60cafa9fcc7/air_boxing_vs_fast_stable.py) · MIT.

## Bridge

47 candidates · 11 of those repositories received a pinned tree inspection.

- **frankwallis/redouble** (game screen). Hands and player names live on named seat edges, with separate bidding controls and history. [Pinned source](https://github.com/frankwallis/redouble/blob/22487e6e51d00b34668f97f94f96c2eef4d1dd95/src/ui/table/table.jsx#L60) · [Local source](../../../reference/github-visual-sweep/sources/frankwallis--redouble@22487e6e51d0/src/ui/table/table.jsx) · MIT.
- **juef17/LibreBridge** (game screen). Native desktop card widget from a dedicated contract-bridge client. [Pinned source](https://github.com/juef17/LibreBridge/blob/38e344a2fab649c1cce9189b92dadbe7bdb63f31/src/gui/CardWidget.cpp#L23) · [Local source](../../../reference/github-visual-sweep/sources/juef17--librebridge@38e344a2fab6/src/gui/CardWidget.cpp) · GPL-3.0.
- **yurets-16/handviewer** (board component). A single-page deal viewer with a rotate control, useful for comparing seat viewpoints. [Pinned source](https://github.com/yurets-16/handviewer/blob/61ffdcaf51f154daf048abdb17a19ffe4c22df52/handviewer.html#L13) · Link only · MIT.

## Car Racing

969 candidates · 19 of those repositories received a pinned tree inspection.

- **juzzlin/DustRacing2D** (physics relative). Top-down track scene with a minimap, timing overlay and crash overlay. [Pinned source](https://github.com/juzzlin/DustRacing2D/blob/06da67229775ddb57fcb7c4d0763e97a70a21f70/src/game/scene.cpp#L706) · [Local source](../../../reference/github-visual-sweep/sources/juzzlin--dustracing2d@06da67229775/src/game/scene.cpp) · GPL-3.0.

## CartPole

85 candidates · 15 of those repositories received a pinned tree inspection.

- **SensorsINI/CartPoleSimulation** (physics relative). Cart and pendulum drawing inside a desktop control simulator. [Pinned source](https://github.com/SensorsINI/CartPoleSimulation/blob/50402405912f199f5cfaf76efeb67a8e32a982fe/CartPole/cartpole_drawer.py#L1) · [Local source](../../../reference/github-visual-sweep/sources/sensorsini--cartpolesimulation@50402405912f/CartPole/cartpole_drawer.py) · MIT.

## Checkers

567 candidates · 19 of those repositories received a pinned tree inspection.

- **portnov/hcheckers** (game screen). Qt painter-based draughts board, separate from the rule implementation. [Pinned source](https://github.com/portnov/hcheckers/blob/511517b9b3cd2d7b6944688550f3dc5bf941a0a4/python/hcheckers/board.py#L6) · [Local source](../../../reference/github-visual-sweep/sources/portnov--hcheckers@511517b9b3cd/python/hcheckers/board.py) · BSD-3-Clause.

## Chess

877 candidates · 16 of those repositories received a pinned tree inspection.

- **Clariity/react-chessboard** (board component). Responsive React board with an independent piece layer and analysis examples. Flat brown/cream squares carry black and white figurative pieces without an enclosing console. [Pinned source](https://github.com/Clariity/react-chessboard/blob/5f99614dabadfcad6f78eaa5d7822e42b28179e6/src/Board.tsx#L26) · [Reviewed image](https://github.com/Clariity/react-chessboard/blob/5f99614dabadfcad6f78eaa5d7822e42b28179e6/docs/assets/chessboard.png) · [Local source](../../../reference/github-visual-sweep/sources/clariity--react-chessboard@5f99614dabad/src/Board.tsx) · MIT.
- **andrew-wilkes/godot-chess** (board component). Godot Control-based board with its own pieces scene, an alternative to web layout. The charcoal-and-silver board uses strongly silhouetted pieces, small capture markers and a narrow move strip. [Pinned source](https://github.com/andrew-wilkes/godot-chess/blob/e16a2423e8425f04c04807be874f54e252655fc8/src/Board.gd#L1) · [Reviewed image](https://github.com/andrew-wilkes/godot-chess/blob/e16a2423e8425f04c04807be874f54e252655fc8/social/board.png) · [Local source](../../../reference/github-visual-sweep/sources/andrew-wilkes--godot-chess@e16a2423e842/src/Board.gd) · MIT.
- **enzomanuelmangano/react-native-chessboard** (board component). Native Skia board background as an alternative to a DOM checkerboard. [Pinned source](https://github.com/enzomanuelmangano/react-native-chessboard/blob/d1c3e0aa9372b2b78c07f50412b09a50ad31d4ae/src/components/skia/board-background.tsx#L54) · [Local source](../../../reference/github-visual-sweep/sources/enzomanuelmangano--react-native-chessboard@d1c3e0aa9372/src/components/skia/board-background.tsx) · MIT.
- **luisfer-cli/gui-dgt-sim** (board component). Rust egui widget that centres piece glyphs on their ink bounds for a digital board. An olive-and-ivory grid carries large chess glyphs on a compact desktop board. [Pinned source](https://github.com/luisfer-cli/gui-dgt-sim/blob/7ef624cb900dad0bc86d965c9f111b676dd8f95d/src/board_widget.rs#L6) · [Reviewed image](https://github.com/luisfer-cli/gui-dgt-sim/blob/7ef624cb900dad0bc86d965c9f111b676dd8f95d/docs/screenshot.png) · Link only · Apache-2.0.

## Cliff Walking

22 candidates · 10 of those repositories received a pinned tree inspection.

- **Sebastian-Griesbach/MonsterCliffWalking** (rule variant). A rendered cliff grid with an additional moving hazard. Keep monster state separate from the standard cliff. The grid has grass squares, a continuous cliff edge and a character hazard separate from the agent. [Pinned source](https://github.com/Sebastian-Griesbach/MonsterCliffWalking/blob/704112ea619365fae18acc6bc3fecf25d6edd765/monstercliffwalking.py#L159) · [Reviewed image](https://github.com/Sebastian-Griesbach/MonsterCliffWalking/blob/704112ea619365fae18acc6bc3fecf25d6edd765/img/demonstration.gif) · [Local source](../../../reference/github-visual-sweep/sources/sebastian-griesbach--monstercliffwalking@704112ea6193/monstercliffwalking.py) · MIT.

## Connect Four

861 candidates · 15 of those repositories received a pinned tree inspection.

- **kenrick95/c4** (game screen). Dedicated browser board for a red/blue Connect Four implementation. [Pinned source](https://github.com/kenrick95/c4/blob/5f0b141806decad56a70f691413165091f7849a1/browser/src/board/index.ts#L3) · [Local source](../../../reference/github-visual-sweep/sources/kenrick95--c4@5f0b141806de/browser/src/board/index.ts) · MIT.
- **zaymonoid/Connect4-3D-R3F** (rule variant). React Three Fiber implementation of a 4×4×4 board. The extra depth is a rules change. [Pinned source](https://github.com/zaymonoid/Connect4-3D-R3F/blob/310c919b89c2d14e51de4a7459f4b4b1f1365083/src/App.js#L396) · [Local source](../../../reference/github-visual-sweep/sources/zaymonoid--connect4-3d-r3f@310c919b89c2/src/App.js) · MIT.

## Crazy Eights

445 candidates · 15 of those repositories received a pinned tree inspection.

- **BNAS24/Crazy-Eights-Game** (game screen). React game container and a separate modal for choosing the effect of a wild eight. [Pinned source](https://github.com/BNAS24/Crazy-Eights-Game/blob/1fded5412b338032c5de3084015d1520abc4d564/src/pages/gamepage/GameContainer.jsx#L1) · [Local source](../../../reference/github-visual-sweep/sources/bnas24--crazy-eights-game@1fded5412b33/src/pages/gamepage/GameContainer.jsx) · MIT.
- **hakon1233/card-games** (shared table). Display-settings component shared across several card games including Crazy Eights. [Pinned source](https://github.com/hakon1233/card-games/blob/0d85e1195238c35daa9557bf2057b4fd6ac6e742/components/game/table-display-settings.tsx#L59) · [Local source](../../../reference/github-visual-sweep/sources/hakon1233--card-games@0d85e1195238/components/game/table-display-settings.tsx) · MIT.

## Cribbage

331 candidates · 14 of those repositories received a pinned tree inspection.

- **Kinsa/cribbage-board-app** (scoring surface). A React Native cribbage board for tracking pegging positions. [Pinned source](https://github.com/Kinsa/cribbage-board-app/blob/8c17210d088fce0bf90c28be7391578dba029a7b/components/CribbageBoard.tsx#L115) · [Local source](../../../reference/github-visual-sweep/sources/kinsa--cribbage-board-app@8c17210d088f/components/CribbageBoard.tsx) · Apache-2.0.
- **rheostaticsfan/CribbageBoard** (scoring surface). Colour e-ink pegboard with touch-driven peg movement. This is a scorekeeper surface. A tall U-shaped peg track is paired with a narrow player/score legend on the left. [Pinned source](https://github.com/rheostaticsfan/CribbageBoard/blob/400e5751d65bc04fe137bc54768c2e48d5e0544c/app/src/main/java/com/moira/cribbage/BoardView.kt#L21) · [Reviewed image](https://github.com/rheostaticsfan/CribbageBoard/blob/400e5751d65bc04fe137bc54768c2e48d5e0544c/docs/light.png) · [Local source](../../../reference/github-visual-sweep/sources/rheostaticsfan--cribbageboard@400e5751d65b/app/src/main/java/com/moira/cribbage/BoardView.kt) · MIT.

## Dou Dizhu

401 candidates · 13 of those repositories received a pinned tree inspection.

- **ConstStar/dou-di-zhu** (game screen). A dedicated landlord-game client using Pygame alongside a Tk interface. The landlord table uses a pale blue field, a tightly overlapped hand along the bottom and opponent counts at its top corners. [Pinned source](https://github.com/ConstStar/dou-di-zhu/blob/3e29202ffd5c29d4fc2b7c17b83ef3b34396dda9/poker_client.py#L7) · [Reviewed image](https://github.com/ConstStar/dou-di-zhu/blob/3e29202ffd5c29d4fc2b7c17b83ef3b34396dda9/docs/images/gui.png) · [Local source](../../../reference/github-visual-sweep/sources/conststar--dou-di-zhu@3e29202ffd5c/poker_client.py) · MIT.
- **DavidWang1231/doudizhu-online** (game screen). A browser landlord-game stylesheet to compare against the Pygame client. [Pinned source](https://github.com/DavidWang1231/doudizhu-online/blob/8d750b58ea17667573709401d6c882a8d2392da7/css/style.css#L7) · [Local source](../../../reference/github-visual-sweep/sources/davidwang1231--doudizhu-online@8d750b58ea17/css/style.css) · MIT.

## Euchre

137 candidates · 13 of those repositories received a pinned tree inspection.

- **whtdrgn101/game-euchre** (game screen). Partnership trick-taking board with hand, turn and team-results panels. [Pinned source](https://github.com/whtdrgn101/game-euchre/blob/c90db152e552b0acdf8c3f60611048c02dd5e4b6/src/client/Board.tsx#L57) · [Local source](../../../reference/github-visual-sweep/sources/whtdrgn101--game-euchre@c90db152e552/src/client/Board.tsx) · BSD-3-Clause.

## First-Price Sealed-Bid Auction

38 candidates · 10 of those repositories received a pinned tree inspection.

- **20010208/blind-auction** (auction relative). A timed browser bidding interface for a sealed-bid strategy game. Verify the settlement rule independently. [Pinned source](https://github.com/20010208/blind-auction/blob/adb8377e3fd49c1ab6ed5266d59909cc2f1b8317/public/index.html#L15) · [Local source](../../../reference/github-visual-sweep/sources/20010208--blind-auction@adb8377e3fd4/public/index.html) · MIT.
- **TiantianFlow/qiju** (auction relative). Four-seat sealed-bid table with a lot board and a round-by-round event feed. The Core two-bidder payoff is not established here. The board occupies the left of a dark dashboard while a vertically stacked round/event feed fills the right. [Pinned source](https://github.com/TiantianFlow/qiju/blob/683845fb4540c482f7dad9f79382611f5f9334b9/apps/web/src/pages/Table.tsx#L58) · [Reviewed image](https://github.com/TiantianFlow/qiju/blob/683845fb4540c482f7dad9f79382611f5f9334b9/docs/screenshot.png) · [Local source](../../../reference/github-visual-sweep/sources/tiantianflow--qiju@683845fb4540/apps/web/src/pages/Table.tsx) · MIT.

## Frozen Lake

38 candidates · 8 of those repositories received a pinned tree inspection.

- **AlecWaumans/ML-FrozenLake** (physics relative). An enhanced Pygame grid renderer for the stochastic lake environment. The four-column snowfield uses textured ice, blue holes, a character token and a wrapped goal. [Pinned source](https://github.com/AlecWaumans/ML-FrozenLake/blob/4000e0316564ee3fede2fd916f2a598f2c59af24/frozen_lake_enhanced.py#L19) · [Reviewed image](https://github.com/AlecWaumans/ML-FrozenLake/blob/4000e0316564ee3fede2fd916f2a598f2c59af24/docs/img/environment.jpeg) · [Local source](../../../reference/github-visual-sweep/sources/alecwaumans--ml-frozenlake@4000e0316564/frozen_lake_enhanced.py) · MIT.

## Gin Rummy

113 candidates · 12 of those repositories received a pinned tree inspection.

- **alexwitting/cardgames** (game screen). Native Android Gin Rummy screen inside a multi-game card application. The theme specimen pairs an ornate burgundy card back with green felt; the contemporary specimen uses a geometric blue back. [Pinned source](https://github.com/alexwitting/cardgames/blob/c895605c5672dd72919bcfe17c8b65e7c53cb6e5/feature/ginrummy/src/main/kotlin/com/cardgames/feature/ginrummy/GinScreen.kt#L30) · [Reviewed image](https://github.com/alexwitting/cardgames/blob/c895605c5672dd72919bcfe17c8b65e7c53cb6e5/app/src/main/assets/themes/green_felt_classic/preview.webp) · [Local source](../../../reference/github-visual-sweep/sources/alexwitting--cardgames@c895605c5672/feature/ginrummy/src/main/kotlin/com/cardgames/feature/ginrummy/GinScreen.kt) · MIT.
- **lokkant/Gin-Rummy** (game screen). A separate LÖVE scene for laying cards off after the hand. The card hand forms one continuous, overlapping strip above a narrow score edge. [Pinned source](https://github.com/lokkant/Gin-Rummy/blob/58c3c41214d2d18e76ada757987daa3d5f80c1f7/src/scenes/layoff_scene.lua#L170) · [Reviewed image](https://github.com/lokkant/Gin-Rummy/blob/58c3c41214d2d18e76ada757987daa3d5f80c1f7/media/cards.gif) · [Local source](../../../reference/github-visual-sweep/sources/lokkant--gin-rummy@58c3c41214d2/src/scenes/layoff_scene.lua) · MIT.

## Go

148 candidates · 13 of those repositories received a pinned tree inspection.

- **ale64bit/WeiqiHub** (board component). Flutter board annotations for a Go client with puzzle support. A close-up gold intersection board places large contrasting stones beneath the mobile toolbar. [Pinned source](https://github.com/ale64bit/WeiqiHub/blob/cd1997863d7e2e6d6105c4b6f0580f607170ba19/lib/board/board_annotation.dart#L24) · [Reviewed image](https://github.com/ale64bit/WeiqiHub/blob/cd1997863d7e2e6d6105c4b6f0580f607170ba19/doc/screenshot/iPad/2.png) · [Local source](../../../reference/github-visual-sweep/sources/ale64bit--weiqihub@cd1997863d7e/lib/board/board_annotation.dart) · BSD-3-Clause.
- **cbelsole/easygo** (board component). Browser Go board used alongside KataGo analysis and joseki recognition. [Pinned source](https://github.com/cbelsole/easygo/blob/20293034c781d3c64eab63d4a4dccbada7cd9b12/web/src/components/Board.tsx#L62) · [Local source](../../../reference/github-visual-sweep/sources/cbelsole--easygo@20293034c781/web/src/components/Board.tsx) · MIT.
- **peterblazejewicz/gobanhaus** (game screen). A dedicated interactive 9×9 Go board for a single-page browser client. [Pinned source](https://github.com/peterblazejewicz/gobanhaus/blob/460341bf469ce93c268b7a555160cdeac7a5aa2e/src/app/components/Board.tsx#L63) · [Local source](../../../reference/github-visual-sweep/sources/peterblazejewicz--gobanhaus@460341bf469c/src/app/components/Board.tsx) · MIT.
- **popojan/goban** (board component). A three-dimensional goban rendered through a GLSL ray-tracing interface. The perspective goban has reflective stones, a visible tabletop edge and separate stone bowls. [Pinned source](https://github.com/popojan/goban/blob/eb52413fcec8843fc888ccfee1bb28237941b66a/src/main.cpp#L603) · [Reviewed image](https://github.com/popojan/goban/blob/eb52413fcec8843fc888ccfee1bb28237941b66a/res/screenshot.png) · [Local source](../../../reference/github-visual-sweep/sources/popojan--goban@eb52413fcec8/src/main.cpp) · GPL-3.0.

## Gomoku

1,132 candidates · 13 of those repositories received a pinned tree inspection.

- **Hexik/Gomoku_GUI** (board component). An Android board view for a generic Gomoku interface. [Pinned source](https://github.com/Hexik/Gomoku_GUI/blob/36940e0d5390cc8ca91370535993ee278ec6a288/app/src/main/java/cz/fontan/gomoku_gui/BoardView.kt#L5) · [Local source](../../../reference/github-visual-sweep/sources/hexik--gomoku_gui@36940e0d5390/app/src/main/java/cz/fontan/gomoku_gui/BoardView.kt) · MIT.
- **guijixzh/Inverse-Gomoku-GUI-vs-AI** (rule variant). An inverse-Gomoku board that supports a piece-movement rule absent from standard Gomoku. A tan intersection board places move markers beside the stones and a vertical command strip along the right. [Pinned source](https://github.com/guijixzh/Inverse-Gomoku-GUI-vs-AI/blob/49470d3cf1916ac1671fbbc2b54cba84b36d3b6d/web/src/board.ts#L84) · [Reviewed image](https://github.com/guijixzh/Inverse-Gomoku-GUI-vs-AI/blob/49470d3cf1916ac1671fbbc2b54cba84b36d3b6d/docs/prevpic.png) · [Local source](../../../reference/github-visual-sweep/sources/guijixzh--inverse-gomoku-gui-vs-ai@49470d3cf191/web/src/board.ts) · MIT.

## Goofspiel

68 candidates · 12 of those repositories received a pinned tree inspection.

- **Metta-AI/cogame-goofspiel-oshi-zumo** (game screen). A dedicated sealed-bid card renderer with a separate replay viewer. [Pinned source](https://github.com/Metta-AI/cogame-goofspiel-oshi-zumo/blob/6cf155196fcf8aebd5cac24b218b62425e5f821f/client/renderer.js#L66) · [Local source](../../../reference/github-visual-sweep/sources/metta-ai--cogame-goofspiel-oshi-zumo@6cf155196fcf/client/renderer.js) · MIT.

## Hanabi

98 candidates · 12 of those repositories received a pinned tree inspection.

- **krinj/hanabi-simulator** (game screen). Board-information widget separate from game controls in an agent-assisted Hanabi interface. Rows of numbered colour cards sit beside an action log; a concealed row uses uniform grey backs. [Pinned source](https://github.com/krinj/hanabi-simulator/blob/b77b04aa09bab8bd8d7b784e04bf8b9d5d76d1a6/py_hanabi/interface/widget_board_info.py#L8) · [Reviewed image](https://github.com/krinj/hanabi-simulator/blob/b77b04aa09bab8bd8d7b784e04bf8b9d5d76d1a6/images/pyhanabi_gui.png) · [Local source](../../../reference/github-visual-sweep/sources/krinj--hanabi-simulator@b77b04aa09ba/py_hanabi/interface/widget_board_info.py) · MIT.
- **nina-cohen/hanabi-ui** (game screen). A stack-painting module within a dedicated cooperative Hanabi interface. [Pinned source](https://github.com/nina-cohen/hanabi-ui/blob/5273475fc1bb48bd154b44d86bb8071ce22f97d5/scripts/PaintStackManager.js#L7) · [Local source](../../../reference/github-visual-sweep/sources/nina-cohen--hanabi-ui@5273475fc1bb/scripts/PaintStackManager.js) · Apache-2.0.

## Hearts

173 candidates · 18 of those repositories received a pinned tree inspection.

- **Rescator7/Hearts2** (game screen). A native Qt card scene for Hearts. Its standard table differs from the compact two-player trace. Four hands frame the green table, with blue-backed side hands and the current trick in the centre. [Pinned source](https://github.com/Rescator7/Hearts2/blob/d4f533dad693e87736121861c9c6eb6147faf535/cardscene.cpp#L3) · [Reviewed image](https://github.com/Rescator7/Hearts2/blob/d4f533dad693e87736121861c9c6eb6147faf535/screenshot/Hearts2.png) · [Local source](../../../reference/github-visual-sweep/sources/rescator7--hearts2@d4f533dad693/cardscene.cpp) · MIT.
- **wesmcd6/Game-of-hearts** (game screen). Browser reconstruction of the classic desktop Hearts presentation. [Pinned source](https://github.com/wesmcd6/Game-of-hearts/blob/4184d8cd23d49789ee49769daa894aa83deeddf0/style.css#L22) · [Local source](../../../reference/github-visual-sweep/sources/wesmcd6--game-of-hearts@4184d8cd23d4/style.css) · MIT.

## Hex

170 candidates · 14 of those repositories received a pinned tree inspection.

- **FutaAlice/FutaHex2** (game screen). Dedicated native canvas for a Hex connection board. A large slanted hex lattice has coloured goal edges and two smaller analysis lattices alongside it. [Pinned source](https://github.com/FutaAlice/FutaHex2/blob/2786e2e291b6de171d74b1dbbe76c013478f925e/src/futahex2/canvas.cpp#L133) · [Reviewed image](https://github.com/FutaAlice/FutaHex2/blob/2786e2e291b6de171d74b1dbbe76c013478f925e/doc/image/preview.png) · [Local source](../../../reference/github-visual-sweep/sources/futaalice--futahex2@2786e2e291b6/src/futahex2/canvas.cpp) · GPL-2.0.
- **eliaxyzz/HEX** (game screen). Desktop Hex client with a separately drawn game background. [Pinned source](https://github.com/eliaxyzz/HEX/blob/fadf672b8a61035c83c28206b57b3a359656a8f6/src/ui/background_renderer.cpp#L78) · [Local source](../../../reference/github-visual-sweep/sources/eliaxyzz--hex@fadf672b8a61/src/ui/background_renderer.cpp) · MIT.

## Ice Hockey Style Arena

192 candidates · 16 of those repositories received a pinned tree inspection.

- **ArtisVitols/hockey** (arcade relative). Rink-painting layer in a 3D hockey game; use it for markings and camera study. [Pinned source](https://github.com/ArtisVitols/hockey/blob/458973bdbdf53fdff6544c5f2302af8ea228cabe/src/arena/icePainter.ts#L14) · Link only · Unspecified.

## Leduc Hold'em

32 candidates · 14 of those repositories received a pinned tree inspection.

- **acaen007/GameLab** (game screen). Shared browser lab for Kuhn and Leduc poker, useful for making the smaller betting tree visible. [Pinned source](https://github.com/acaen007/GameLab/blob/fec0984d339ec946118dd6ae45cdab691451bd13/src/poker-app.js#L749) · Link only · Unspecified.

## Liar's Dice

284 candidates · 14 of those repositories received a pinned tree inspection.

- **mmousawy/dicebluff** (game screen). Browser dice-bluff client with a dedicated stylesheet for its game displays. [Pinned source](https://github.com/mmousawy/dicebluff/blob/e3c7f81810434f513eb34f2eefb7952f33f2ac95/src/dicebluff-client/styles/main.css#L14) · [Local source](../../../reference/github-visual-sweep/sources/mmousawy--dicebluff@e3c7f8181043/src/dicebluff-client/styles/main.css) · MIT.

## Limit Texas Hold'em

22 candidates · 10 of those repositories received a pinned tree inspection.

- **ZoliQua/Texas-Holdem-Game** (related table). No-limit tournament table. Its seat layout is relevant to fixed-limit poker, but its betting controls differ. [Pinned source](https://github.com/ZoliQua/Texas-Holdem-Game/blob/18a7ce1539a18ac9666a6b6d34c3f1d9d78b8905/src/ui/Table.tsx#L189) · [Local source](../../../reference/github-visual-sweep/sources/zoliqua--texas-holdem-game@18a7ce1539a1/src/ui/Table.tsx) · MIT.

## Lunar Lander

213 candidates · 12 of those repositories received a pinned tree inspection.

- **PeiP-2018-Work-Nantes-DUT-INFO/Planet-Lander-Lunar-Lander-with-Pygame** (physics relative). Separate Pygame flight state for a planetary landing game. [Pinned source](https://github.com/PeiP-2018-Work-Nantes-DUT-INFO/Planet-Lander-Lunar-Lander-with-Pygame/blob/cc694785ea0587e1edb0546a306e1162be76f4fc/states/game.py#L2) · [Local source](../../../reference/github-visual-sweep/sources/peip-2018-work-nantes-dut-info--planet-lander-lunar-lander-with-pygame@cc694785ea05/states/game.py) · MIT.

## Mahjong

259 candidates · 18 of those repositories received a pinned tree inspection.

- **junosan/Nama** (game screen). Qt/OpenGL widget from a riichi Mahjong client. Its rules extend beyond the compact bundled game. Four tile walls surround the central discard area on green felt, with the visible hand at the bottom and chat to the side. [Pinned source](https://github.com/junosan/Nama/blob/6ace0bb25a986d71b8e08d74334481eadb96650e/code/glwidget.cpp#L18) · [Reviewed image](https://github.com/junosan/Nama/blob/6ace0bb25a986d71b8e08d74334481eadb96650e/images/readme/rich.png) · [Local source](../../../reference/github-visual-sweep/sources/junosan--nama@6ace0bb25a98/code/glwidget.cpp) · Apache-2.0.

## Mancala

253 candidates · 13 of those repositories received a pinned tree inspection.

- **Noah-Vincenz/ProjectCrawl** (rule variant). Oware board view for the Mancala family. Pit and capture conventions must be checked before reuse. [Pinned source](https://github.com/Noah-Vincenz/ProjectCrawl/blob/c6c789f2d354e5f04bb1df7391e4d5ba950c0d1c/src/main/java/com/noahvincenz/oware/view/GameBoardView.java#L33) · [Local source](../../../reference/github-visual-sweep/sources/noah-vincenz--projectcrawl@c6c789f2d354/src/main/java/com/noahvincenz/oware/view/GameBoardView.java) · MIT.
- **togiberlin/kalah_mancala** (rule variant). Kalah game-screen styling for a web board and its stores. [Pinned source](https://github.com/togiberlin/kalah_mancala/blob/4dfe49c9c78fb4aab572afaf9056070c55cffe91/static/kalahMancala/gameScreenStyle.css#L49) · [Local source](../../../reference/github-visual-sweep/sources/togiberlin--kalah_mancala@4dfe49c9c78f/static/kalahMancala/gameScreenStyle.css) · MIT.

## Mountain Car

9 candidates · 7 of those repositories received a pinned tree inspection.

- **subhamdangar/MountainCar-Reinforcement-Learning** (physics relative). Custom Pygame presentation of the mountain-car task, separate from its training loop. [Pinned source](https://github.com/subhamdangar/MountainCar-Reinforcement-Learning/blob/94fc1c875c54216b3bd2edbffa40ed17f7c5da75/fancy_mountaincar.py#L5) · Link only · Unspecified.

## Negotiation

17 candidates · 10 of those repositories received a pinned tree inspection.

- **issamoham-art/cargo-game** (related experiment). A browser shipping negotiation exercise, useful as an alternative negotiation-room composition. [Pinned source](https://github.com/issamoham-art/cargo-game/blob/2347f3519c47b79a24c43984c5bb31e71ba3a88f/index.html#L15) · Link only · Unspecified.
- **lnwcode2003eiei/the-inner-circle** (related experiment). An SVG trading-card surface for a multiplayer negotiation game. Core negotiates price and delivery instead. [Pinned source](https://github.com/lnwcode2003eiei/the-inner-circle/blob/46f60084cc457662875fcccb8225c838364fdfc1/src/components/TradingCard.tsx#L99) · Link only · Unspecified.

## Nine Men's Morris

293 candidates · 19 of those repositories received a pinned tree inspection.

- **LouisRadek/muehle** (game screen). Rust game screen for the mill board, complementing the Cairo implementation. [Pinned source](https://github.com/LouisRadek/muehle/blob/d7f6f4cd3fc93e2d1c638493947efae747a10be3/src/ui/game.rs#L4) · [Local source](../../../reference/github-visual-sweep/sources/louisradek--muehle@d7f6f4cd3fc9/src/ui/game.rs) · MIT.
- **farindk/morris** (game screen). GTK/Cairo rendering of the mill board and its playing pieces. Three concentric square tracks sit between vertical reserves of white and black pieces. [Pinned source](https://github.com/farindk/morris/blob/60ac099eb02b82e9f9a9e7add577f296ddc1bd2d/src/gtkcairo_boardgui.cc#L600) · [Reviewed image](https://github.com/farindk/morris/blob/60ac099eb02b82e9f9a9e7add577f296ddc1bd2d/doc/screenshot.png) · [Local source](../../../reference/github-visual-sweep/sources/farindk--morris@60ac099eb02b/src/gtkcairo_boardgui.cc) · GPL-3.0.

## No-Limit Texas Hold'em

129 candidates · 18 of those repositories received a pinned tree inspection.

- **ZoliQua/Texas-Holdem-Game** (game screen). React tournament table with its own scoped table stylesheet. [Pinned source](https://github.com/ZoliQua/Texas-Holdem-Game/blob/18a7ce1539a18ac9666a6b6d34c3f1d9d78b8905/src/ui/Table.tsx#L189) · [Local source](../../../reference/github-visual-sweep/sources/zoliqua--texas-holdem-game@18a7ce1539a1/src/ui/Table.tsx) · MIT.

## Othello

980 candidates · 18 of those repositories received a pinned tree inspection.

- **batuhanisik751/JavaHexagonalReversi** (rule variant). JavaFX canvas for hexagonal Reversi. Six neighbour directions change flipping and valid moves. [Pinned source](https://github.com/batuhanisik751/JavaHexagonalReversi/blob/79a35eb7a78d68a9f5c786e34e89e9157d4c4dcf/src/main/java/cs3500/reversi/view/FxReversiCanvas.java#L10) · [Local source](../../../reference/github-visual-sweep/sources/batuhanisik751--javahexagonalreversi@79a35eb7a78d/src/main/java/cs3500/reversi/view/FxReversiCanvas.java) · MIT.
- **felipeap92/othello-game** (game screen). Standalone React board in a Reversi client with multiplayer support. [Pinned source](https://github.com/felipeap92/othello-game/blob/aa9dd2bd3d2ebc101405c3fabf24b27810c7086b/othello-gui/src/components/Board.tsx#L40) · [Local source](../../../reference/github-visual-sweep/sources/felipeap92--othello-game@aa9dd2bd3d2e/othello-gui/src/components/Board.tsx) · MIT.

## Paddle Ball

1,553 candidates · 21 of those repositories received a pinned tree inspection.

- **akshatjain02/Breakout** (arcade relative). Breakout playfield presentation; brick destruction differs from the bundled paddle rally. The spare blue playfield puts score and lives in opposite corners above a four-row brick wall. [Pinned source](https://github.com/akshatjain02/Breakout/blob/4acd4fb33ea8e6da74eba53a6e7a4490d267ccf5/Breakout.css#L8) · [Reviewed image](https://github.com/akshatjain02/Breakout/blob/4acd4fb33ea8e6da74eba53a6e7a4490d267ccf5/Screenshot1.png) · [Local source](../../../reference/github-visual-sweep/sources/akshatjain02--breakout@4acd4fb33ea8/Breakout.css) · MIT.

## Pentago

360 candidates · 16 of those repositories received a pinned tree inspection.

- **DevJac/gloss-pentago** (game screen). Haskell/Gloss rendering provides an alternative desktop treatment for the rotating quadrants. Four separated red 3×3 trays make the rotation units visible around black and white counters. [Pinned source](https://github.com/DevJac/gloss-pentago/blob/ec7e9b0206fee1c142400ca063fee7dca1955826/src/Main.hs#L1) · [Reviewed image](https://github.com/DevJac/gloss-pentago/blob/ec7e9b0206fee1c142400ca063fee7dca1955826/screenshot.png) · [Local source](../../../reference/github-visual-sweep/sources/devjac--gloss-pentago@ec7e9b0206fe/src/Main.hs) · MIT.
- **Starfox64/Pentago** (game screen). Dedicated Python graphical interface for Pentago. [Pinned source](https://github.com/Starfox64/Pentago/blob/82b215aaba3a0ff17593c281fd9d853c72eae91e/src/pentagoGUI.py#L1) · [Local source](../../../reference/github-visual-sweep/sources/starfox64--pentago@82b215aaba3a/src/pentagoGUI.py) · MIT.

## Prisoner's Dilemma

420 candidates · 12 of those repositories received a pinned tree inspection.

- **Taku0172/Repeated-Prisoners-Dilemma-Simulator** (rule variant). Interactive repeated-game strategy simulator with implementation errors; useful for a history view. [Pinned source](https://github.com/Taku0172/Repeated-Prisoners-Dilemma-Simulator/blob/50d784640f2ce667bac40046b128cac0195a3b12/index.html#L49) · [Local source](../../../reference/github-visual-sweep/sources/taku0172--repeated-prisoners-dilemma-simulator@50d784640f2c/index.html) · MIT.

## Rock Paper Scissors

2,117 candidates · 16 of those repositories received a pinned tree inspection.

- **digamjain/Rock-Paper-Scissors-GUI** (game screen). A dedicated graphical single-player gesture-selection interface. [Pinned source](https://github.com/digamjain/Rock-Paper-Scissors-GUI/blob/76f4a54555a4502dd281ad7b00d1d565a9819ffb/Stone-Paper-scissors/Rock-Paper-Scissors.py#L1) · [Local source](../../../reference/github-visual-sweep/sources/digamjain--rock-paper-scissors-gui@76f4a54555a4/Stone-Paper-scissors/Rock-Paper-Scissors.py) · MIT.
- **doyBrian/RPS-Multiplayer** (game screen). Two-player browser layout for simultaneous gesture choices. [Pinned source](https://github.com/doyBrian/RPS-Multiplayer/blob/c37b0888b87c5b9084351083fee5977628ed2d35/index.html#L37) · [Local source](../../../reference/github-visual-sweep/sources/doybrian--rps-multiplayer@c37b0888b87c/index.html) · MIT.

## Shedding Card Game

97 candidates · 9 of those repositories received a pinned tree inspection.

- **NiyiOke/open-shed-card-engine** (rule variant). Canvas table for an extensible multiplayer shedding game. Compare rank/suit rules before adoption. The project illustration uses vivid rectangular seat hands around a square central play area. [Pinned source](https://github.com/NiyiOke/open-shed-card-engine/blob/f20a5c15bfb2b1aa943f61f8b17bcbd27f185c40/app/components/GameTableCanvas.tsx#L14) · [Reviewed image](https://github.com/NiyiOke/open-shed-card-engine/blob/f20a5c15bfb2b1aa943f61f8b17bcbd27f185c40/public/og.png) · [Local source](../../../reference/github-visual-sweep/sources/niyioke--open-shed-card-engine@f20a5c15bfb2/app/components/GameTableCanvas.tsx) · Apache-2.0.
- **intrepion/kata-inspired-by-uno-codex-dot** (rule variant). Prism Relay's browser table and card styling for a related shedding game. A dark inset table holds two prominent central cards above action controls and a horizontal numbered hand. [Pinned source](https://github.com/intrepion/kata-inspired-by-uno-codex-dot/blob/42ea008d13c2bea37a0ffcd5976f01fbf6372958/src/style.css#L10) · [Reviewed image](https://github.com/intrepion/kata-inspired-by-uno-codex-dot/blob/42ea008d13c2bea37a0ffcd5976f01fbf6372958/docs/screenshots/fresh-table.jpg) · [Local source](../../../reference/github-visual-sweep/sources/intrepion--kata-inspired-by-uno-codex-dot@42ea008d13c2/src/style.css) · MIT.

## Shogi

57 candidates · 9 of those repositories received a pinned tree inspection.

- **OsakiTsukiko/lishogi-client** (game screen). Godot play-tab scene for a desktop shogi client. [Pinned source](https://github.com/OsakiTsukiko/lishogi-client/blob/ed6dafbc99258a694c202f4b80ed8e9bb296e46e/src/core/main_screen/tabs/play_tab/game.tscn#L28) · Link only · Unspecified.
- **pentla/shogi-board** (board component). Reserve-piece board kept separate from the main grid, useful for representing drops. [Pinned source](https://github.com/pentla/shogi-board/blob/12d74a0a8ddd1ff42ab56e6cb3c8be2345f7f97a/src/components/Board/CapturedPieceBoard/index.tsx#L28) · [Local source](../../../reference/github-visual-sweep/sources/pentla--shogi-board@12d74a0a8ddd/src/components/Board/CapturedPieceBoard/index.tsx) · MIT.

## Spades

57 candidates · 12 of those repositories received a pinned tree inspection.

- **indiagames/spade** (game screen). A dedicated table component in a real-time multiplayer Spades room. [Pinned source](https://github.com/indiagames/spade/blob/095d840ba0084ed3bac57354286eb422b183d108/frontend/src/features/room/Table.tsx#L46) · [Local source](../../../reference/github-visual-sweep/sources/indiagames--spade@095d840ba008/frontend/src/features/room/Table.tsx) · MIT.
- **sruckh/spades-coach** (game screen). A trick-taking table paired with a coaching view; the coaching information needs a distinct spectator policy. A portrait trick table keeps the viewer’s fanned hand at the lower edge and played cards inside the central trick. [Pinned source](https://github.com/sruckh/spades-coach/blob/87ec070084566ef25fc0e899293eef1cfbd37bc0/src/ui/Table.tsx#L16) · [Reviewed image](https://github.com/sruckh/spades-coach/blob/87ec070084566ef25fc0e899293eef1cfbd37bc0/preview.png) · [Local source](../../../reference/github-visual-sweep/sources/sruckh--spades-coach@87ec07008456/src/ui/Table.tsx) · Apache-2.0.

## Taxi

22 candidates · 6 of those repositories received a pinned tree inspection.

- **agrawalanshika/Routemind-AI** (physics relative). Interactive browser simulation of Taxi-v3. Treat its presentation separately from the learned policy. [Pinned source](https://github.com/agrawalanshika/Routemind-AI/blob/5a5d5d2e0d65ff7e330e6cf2256453968caa7435/index.html#L15) · Link only · Unspecified.

## Tic-Tac-Toe

2,284 candidates · 14 of those repositories received a pinned tree inspection.

- **razvan404/tic-tac-toe-multiplayer** (game screen). Desktop client styling for a networked noughts-and-crosses board. [Pinned source](https://github.com/razvan404/tic-tac-toe-multiplayer/blob/c412047c45f499de7f6a297a6d8e6ba9a2bdca9c/Client/src/main/resources/application/gui/css/style.css#L31) · [Local source](../../../reference/github-visual-sweep/sources/razvan404--tic-tac-toe-multiplayer@c412047c45f4/Client/src/main/resources/application/gui/css/style.css) · MIT.
- **vlokesh7/Dynamic-Tic-Tac-Toe-Game-with-Python-Tkinter** (game screen). A desktop Tkinter noughts-and-crosses interface. Blue glyphs on a dark three-by-three grid leave the result above and restart control below. [Pinned source](https://github.com/vlokesh7/Dynamic-Tic-Tac-Toe-Game-with-Python-Tkinter/blob/2260d569fbc06ef1c29ea99e37183ba2bb48b986/TicTacToe.py#L1) · [Reviewed image](https://github.com/vlokesh7/Dynamic-Tic-Tac-Toe-Game-with-Python-Tkinter/blob/2260d569fbc06ef1c29ea99e37183ba2bb48b986/tie.png) · [Local source](../../../reference/github-visual-sweep/sources/vlokesh7--dynamic-tic-tac-toe-game-with-python-tkinter@2260d569fbc0/TicTacToe.py) · MIT.

## Ultimate Tic-Tac-Toe

778 candidates · 13 of those repositories received a pinned tree inspection.

- **PhilAldridge/REACT-Ultimate-tic-tac-toe** (game screen). A React macro-board for composing the nine smaller boards. [Pinned source](https://github.com/PhilAldridge/REACT-Ultimate-tic-tac-toe/blob/816d0f81d8ff1d0720290d0b59b323d990b99330/src/bigBoard.js#L104) · [Local source](../../../reference/github-visual-sweep/sources/philaldridge--react-ultimate-tic-tac-toe@816d0f81d8ff/src/bigBoard.js) · CC0-1.0.
- **chacestew/u3t** (game screen). A local-board component inside the larger multiplayer game area; useful for nested-board feedback. [Pinned source](https://github.com/chacestew/u3t/blob/743c7cd70cfae431695a34af153aa28f214942e0/client/src/Components/GameArea/LocalBoard/LocalBoard.tsx#L39) · [Local source](../../../reference/github-visual-sweep/sources/chacestew--u3t@743c7cd70cfa/client/src/Components/GameArea/LocalBoard/LocalBoard.tsx) · MIT.

## Xiangqi

217 candidates · 8 of those repositories received a pinned tree inspection.

- **Velithia/JieqiBox** (rule variant). Desktop board for Jieqi, a hidden-piece relative of Xiangqi. Face-down identities need a private-state contract. A wood-coloured river board supports both blank discs and revealed marked pieces beside a desktop analysis panel. [Pinned source](https://github.com/Velithia/JieqiBox/blob/3958989feda0164ec09e34d13c0e090c053fa5d9/src/components/Chessboard.vue#L2) · [Reviewed image](https://github.com/Velithia/JieqiBox/blob/3958989feda0164ec09e34d13c0e090c053fa5d9/linux_screenshot.png) · [Local source](../../../reference/github-visual-sweep/sources/velithia--jieqibox@3958989feda0/src/components/Chessboard.vue) · MIT.
- **xiewang233/XiangqiAI** (game screen). Pygame board view separated from the Xiangqi search engine. [Pinned source](https://github.com/xiewang233/XiangqiAI/blob/d32f6bdbd55707d45348fa220a829d66f68387f9/gui/board_view.py#L6) · [Local source](../../../reference/github-visual-sweep/sources/xiewang233--xiangqiai@d32f6bdbd557/gui/board_view.py) · MIT.

