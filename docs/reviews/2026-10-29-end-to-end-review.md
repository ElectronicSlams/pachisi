# Pachisi end-to-end review — 29 October 2026

**Verdict: the package builds and its demonstrations are broadly coherent, but the exported live gameplay helpers need corrections before adoption. Passing the current physics suite does not establish correct rendered motion or complete rule coverage.**

Reviewed commit: `be005ef37467eaa24cca0858da4fb15fb3453cf3`, branch `consolidate/all-eslams-work-and-physics-review`. `git fetch origin --prune` and `git pull --ff-only` completed; the checkout was already current. Remote `main` remains at `c9167c7`; the reviewed consolidation branch is one commit ahead. The initial working tree was clean. This review adds this document and local diagnostic artifacts; it does not change implementation, archive contents, game traces, or production applications.

P1 findings below block adoption of the affected live adapters. They are not claims that these helpers are already deployed in production. P2 findings affect correctness or review reliability. P3 is a catalogue usability defect.

## Findings

### F1 · P1 · Ultimate Tic-Tac-Toe actions target the wrong rendered cells

**Source:** [interactions.ts](../../src/game/interactions.ts), lines 343–344. Compare [scene.tsx](../../src/game/scene.tsx), the `ultimate-tic-tac-toe` branch of `cellModel`.

The engine encodes a move as `subBoard * 9 + localCell`. The scene correctly rearranges that into the visible 9×9 board, but `arenaBoardCellActionFromAction` treats the action as an ordinary row-major index. For action `9`, the helper returns row 1, column 0; the corresponding visible cell is row 0, column 3. **54 of the 81 possible target mappings are wrong.** A host binding legal actions to these targets can highlight or submit a move for a different cell than the one clicked.

Use the same sub-board/local-cell coordinate conversion for interaction targets and rendering. Verify all 81 mappings, preserving the original action token for submission. Evidence: [interaction reproductions](../../artifacts/review/interactions.json).

### F2 · P1 · The cell adapter silently deletes unknown pieces

**Source:** [board-adapter.ts](../../src/game/board-adapter.ts), lines 143–155.

`projectCells` normalizes every token without checking whether a non-empty token became `"."`. For example, `boardFrameFromCellsWithIssues({family:'square_board',rows:2,cols:2}, ['B','DRAGON','.','W'])` returns a normal board containing `['B','.','.','W']` and **an empty issues list**. `Board` cannot reject the unknown piece afterward because the evidence has already been erased. The same behavior affects the non-issues variant of this API.

The live DisplayFrame path already rejects this condition. Apply equivalent validation to `projectCells`, returning a truthful placeholder and an issue. This is required by the repository's stated fail-closed rendering policy. Evidence: [adapter reproductions](../../artifacts/review/reproductions.json).

### F3 · P1 · The live Hex adapter confuses Core's black token with the second seat

**Source:** [board-adapter.ts](../../src/game/board-adapter.ts), line 207 and its use in `boardFrameFromDisplayFrame`. Compare the explicit Hex conversion in [scene.tsx](../../src/game/scene.tsx).

Core's bundled Hex state uses `B` for player 1 and `W` for player 2. The decorative scene explicitly converts those to Board's `R`/`B` vocabulary. The live adapter has no corresponding source-vocabulary distinction: `B` becomes Board `B`, displaying player 1 as player 2, and `W` is rejected. Passing a flat Core-style Hex board through `adaptPublicStateToDisplayFrame` and `boardFrameFromDisplayFrame` reproduces both behaviors: the first black move renders on the wrong side with no issue; adding white produces a placeholder.

Make source token encoding explicit at this boundary, or add a game-aware Core projection. Preserve the valid existing `R`/`B` Board vocabulary; globally swapping the meaning of `B` would introduce another ambiguity. Evidence: [adapter reproductions](../../artifacts/review/reproductions.json).

### F4 · P2 · Shogi and Xiangqi legal moves are parsed with a chess-style grammar

**Source:** [interactions.ts](../../src/game/interactions.ts), lines 325–329 and 425–429.

The public helper advertises Shogi and Xiangqi but routes them through `([a-i][1-9])([a-i][1-9])([a-z])?`. All **12 bundled Shogi actions** return `null`, including `1g1f` and the promotion `1c1a+`. **Six of 12 Xiangqi actions** return `null` because rank 0 is excluded, including `a0a1` and `b0a2`. Hosts using this helper lose selection/highlight behavior for ordinary legal moves.

Parse each game's actual notation separately, including Shogi promotion/drop semantics and Xiangqi ranks 0–9. Exercise the exported helper against the shipped actions, not only chess examples. Evidence: [interaction reproductions](../../artifacts/review/interactions.json).

### F5 · P2 · Connect Four discs begin their fall inside the board

**Source:** [game styles](../../src/game/styles.css), lines 13–14 and 37–42; `GridBoard` in [board.tsx](../../src/game/board.tsx).

`--drop = row + 1` is multiplied by `100%` in the disc's transform. CSS transform percentages use the disc's own height, while the disc is only 80% of the cell height and the grid also has gaps. Consequently six disc heights do not cover six row pitches. At animation time zero for the first bundled drop, the measured disc top was `69.59px` and board top `21.81px`: the disc materializes **47.78px below the top of the board**. This is a rendered-motion error even though the destination state obeys gravity.

Calculate the start translation from board/cell geometry, including gaps and padding, or animate a positioned overlay between explicit entry and destination coordinates. Check start, contact, and settle positions in a real browser at multiple sizes. The existing test only verifies the numeric `--drop` value. Evidence: [drop measurement](../../artifacts/review/drop.json), [start-frame capture](../../artifacts/review/connect-four-drop-start.png).

### F6 · P2 · Gomoku's winning line is calculated but never drawn

**Source:** [board.tsx](../../src/game/board.tsx), lines 282–283 and 319–325.

Gomoku uses `go_board`. `deriveCellCues` correctly returns a five-cell `line`, but `GoBoard` only reads `last` and `check`; it neither emits line markers nor styles a winning run. An authored terminal five-in-a-row at indexes 105–109 yields those five cue indexes and **zero rendered `data-line` attributes**. The bundled Gomoku trace is nonterminal, so the all-frame checks never exercise the result.

Carry the supplied winning line through the Go-family renderer and add a terminal Gomoku render assertion. Evidence: [adapter/cue reproductions](../../artifacts/review/reproductions.json).

### F7 · P2 · Paddle-ball collision artwork crosses the visible walls

**Source:** [scene.tsx](../../src/game/scene.tsx), lines 377–382.

The renderer places the ball's centre directly on the court's boundary at normalized x=0/1 or y=1, despite drawing it with radius 5. In bundled frame 18, the court ends at SVG x=300 and the ball extends to x=305. Frames 39 and 55 exhibit the analogous top and left contacts. The paddle contact accounts for radius; the wall contacts do not. The result visibly passes halfway through the wall before reversing.

Use a consistent physical-to-visual transform with centre bounds inset by the radius, or place the drawn walls outside the centre's permitted range. Keep paddle collision geometry consistent with that mapping. Evidence: [browser geometry](../../artifacts/review/browser-extra.json), [wall-contact capture](../../artifacts/review/paddle-wall.png).

### F8 · P2 · The paddle physics validator accepts a ball teleport

**Source:** [validate-demonstrations.py](../../scripts/validate-demonstrations.py), lines 1537–1556.

The checker advertises `ball x/y += v` and `wall reflections` but never compares next-frame ball coordinates to velocity integration or validates horizontal reflection. Changing only frame 20's `ball.x` from `0.94464` to `0.01` yields **no FAIL anywhere in the full validator run**, and no paddle findings. The existing mutation test changes `paddle_x`, which exercises a different check.

Implement the claimed ball integration/reflection assertions and add independent ball-position, ball-velocity and wall-reflection mutations. Until then, describe this as paddle movement, bounds and selected bounce invariants, not verification of ball dynamics. Evidence: [full-validator mutation result](../../artifacts/review/validator-full.json).

### F9 · P2 · The archive index gives conflicting current design instructions

**Source:** [ARCHIVE_INDEX.md](../../design-archive/ARCHIVE_INDEX.md), lines 15–19, versus [design-decisions.md](../design-decisions.md), “Which source wins” and “Resolved historical contradictions.”

The new archive index calls the September 30 brief authoritative and describes the leaderboard as retired without the later distinction. The live design decisions explicitly prioritize October founder corrections, restore model/provider discovery, and retain founder-approved completed-match Records/Leaderboard labels while retiring hosted evaluation rankings. A designer entering via the archive can therefore remove surfaces the current design guidance explicitly preserves.

Make the archive index defer to the live chronology and preserve the distinction between retired evaluation rankings and retained match records. Keep historical prototype files unchanged; this is an index/authority correction, not a redesign.

### F10 · P3 · A saved catalogue theme is not restored on reload

**Source:** [catalogue/main.tsx](../../catalogue/main.tsx), lines 31–37, and [catalogue/index.html](../../catalogue/index.html).

The catalogue initializes its selection from `readThemePreference()` but only calls `applyThemePreference` after a user change. On a light OS, selecting Dark sets `data-theme="dark"`; reloading leaves the select on Dark but removes the root theme attribute, so CSS returns to the OS theme. There is no startup theme script in the HTML.

Synchronize the saved choice to the document at startup and test a persisted choice opposite to the OS preference. This finding concerns the catalogue; consumers may already perform their own startup synchronization. Evidence: [theme reproduction](../../artifacts/review/browser-extra.json).

## Design assessment

The current Stadium direction is internally stronger than the early leaderboard-centric explorations: the board is the visual subject, controls have a consistent hierarchy, metadata uses a recognizable mono treatment, and the library keeps game data and routing outside presentational components. The four-board Grand Slams composition remains distinct and fits the checked phone viewport. Brand/font preservation checks pass.

The main design weakness is the difference between a recognizable miniature and a readable actual match. Several tables have little phase/result information beyond a caption. Poker does not show actual hole-card or winner semantics, bridge omits dummy, and small boards compress identifiers and labels. Those are substantive adaptation limits, not details that a new palette will solve.

The light/dark contact sheets expose a separate legibility concern: black Go/Gomoku stones and dark chess pieces are difficult to distinguish from the dark board at compact sizes. Backgammon's central dice/bar/tray labels and bridge's north card/contract label are crowded. These are visual observations for design refinement; this review did not perform a comprehensive contrast certification or font/browser matrix.

The styling of movement is intentionally illustrative. CartPole and MountainCar show recorded states at demo cadence, and the control scenes mostly step between frames rather than simulating a continuous world. A consumer should not infer a real-time simulation clock from these previews. The concrete motion defects above concern the correspondence between the picture and the supplied state.

### Design coverage and boundaries

| Design area | What was reviewed | Assessment / boundary |
|---|---|---|
| Canonical tokens, fonts, brand | Source hierarchy, CSS, asset-preservation tests, catalogue light/dark | Coherent live baseline; six archived palettes are reference data, not six supported web product themes. |
| General UI | Buttons/links, fields/errors, password visibility, copy success/failure handling, tabs, avatars, dialog/sheet, cards/status | Automated catalogue interactions and focus checks pass. Not a complete assistive-technology audit. |
| Stadium composites | Model identity, matchup, match posters, status/date, empty/error states | Host-driven boundaries are appropriate. Posters contain synthetic demonstrations; actual shares/replays need real-state projection. |
| Game visuals | All 50 identities, all 722 frames, all final scenes in both themes, targeted motion and action probes | No unavailable scenes in the bundled data. Findings F1–F8 prevent interpreting this as complete gameplay correctness. |
| Grand Slams | Source, desktop/phone captures, reduced motion and four-board presence | Composition preserved; host owns event content, dates and destinations. |
| Web v1/v2/v3/v4 | Four entry shells rendered; design notes/source hierarchy compared | Historical leaderboard/provider-heavy layouts. Their sample counts, event dates and route decisions are not current product facts. |
| Home v1/v2 | Both entry designs rendered and visually compared | Useful hero/replay/card composition history. Home v1 needed its documented sibling support runtime supplied via a local browser route; archived files were not edited. |
| Mobile v3 | Prototype rendered after splash; theme/motion specification and native motion reference read | Useful mobile density/material references. Native runtime and all six native themes were not executed. |
| Identity/Trinity | Identity entry, seven further identity surfaces, Trinity overview, corrected four-role RBAC mock | Historical auth/profile/admin design, not permission enforcement. Prototype's older five-role model must not override the explicit four-role correction. |
| Stadium prototype | All 12 top-level review controls exercised: Home, Arena, Battlefield, Grand Slams, Labs, Open source, Profile, Settings, Sign in, Records, 404, All states | No page errors in these transitions. Reviewed key Arena/Battlefield/event/settings/state-gallery captures. Not every substate or historical local engine was exhaustively tested. |
| Arena-only app | Built entry rendered, briefs/source organization and welcome composition reviewed | Separate historical product exploration. Its local engines and six-theme onboarding are not imported or validated as the live Pachisi runtime. |
| Platform web/native reference | Ownership map, adapter origins, replay/table/native motion boundaries inspected | Preserved, unbuilt reference. No claim of compiling or exhaustively reviewing all 707 reference files. |

All 12 archived entry pages opened without JavaScript page errors in the capture pass. Missing archived brand/provider images were observed and are already documented intentional exclusions; they are not new live-package regressions. No production login, mail, account mutation or deployment was used.

## All 50 games

Every row received the existing trace checks, an actual browser render across all its frames, and visual inspection of its final scene in light and dark. “PASS” below means the existing validator's limited checks passed, **not full tournament rules or actual-play readiness**. F-numbers reference this review's additional findings.

| Game | Existing trace result | Additional assessment |
|---|---|---|
| Alien Shooter | PASS | Discrete scene and invasion ending render. No live control-game adapter certified. |
| Backgammon | RULE | Five-checker variant; bar/off trays present. Compact labels are crowded; traces omit hits/bearing off. |
| Bargaining | PASS | Offer split conserves the displayed total; acceptance remains caption-driven. |
| Battleship | PASS | Declared grid and public shots render. Hidden fleet truth cannot be checked. |
| Bipedal Walker | PASS | Kinematic illustration; invariants do not certify rigid-body/contact dynamics. |
| Blackjack | RENDER | Known omitted dealer hole-card back in public initial state. |
| Boxing-style Arena | PASS | Health/distance illustration; not collision-based boxing physics. |
| Bridge | RENDER | Known missing public dummy; compass layout present, contract label crowded. |
| Car Racing | PASS | Parametric road/progress illustration; no continuous driving simulation claimed. |
| CartPole | PASS | Recorded Euler integration checked; discrete preview cadence differs from simulation time. |
| Checkers | PASS | Bespoke demo has alternating squares and captures. General live adaptation remains limited. |
| Chess | PASS | Ordinary trace legal; castling/promotion/en-passant absent from recorded trace. F2 affects raw-cell adaptation. |
| Cliff Walking | PASS | Hazard/goal geometry renders; only supplied trace validated. |
| Connect Four | PASS | Final board/win cue correct; entry motion wrong (F5). |
| Crazy Eights | PASS | Declared wild suit absent from public state; validator limitation remains. |
| Cribbage | RULE | No-pegging variant; not a complete standard game presentation. |
| Dou Dizhu | PASS | Public play/count presentation; ordinary single-card trace only. |
| Euchre | RULE | Two-player variant; standard four-player strategy not certified. |
| First-price sealed-bid auction | PASS | Reveals render; no winner/payoff fields in supplied frame. |
| Frozen Lake | PASS | Grid, hazards and goal render. |
| Gin Rummy | RULE | Seven-card deal; phase/deck/discard shown. |
| Go | PASS | Grid and captures supported by logic; no capture/ko in bundled trace. Dark stones need legibility review. |
| Gomoku | PASS | Terminal win overlay is lost (F6); bundled trace never reaches a win. |
| Goofspiel | PASS | Public bids/prizes/points consistent for supplied trace. |
| Hanabi | RULE | Two colours/12-card variant and full-clue discards; not standard-game certification. |
| Hearts | RULE | Two-player and nonstandard first lead/hearts breaking. |
| Hex | PASS | Demo conversion is correct; live Core B/W projection is wrong (F3). |
| Ice Hockey-style Arena | RENDER | Known same-cell skater occlusion on frames 6–10. |
| Leduc Hold'em | RULE | Four-handed variant; actual showdown semantics unavailable. |
| Liar's Dice | PASS | Concealed/revealed dice and increasing bid; winner missing from public state. |
| Limit Texas Hold'em | PASS | Same scripted checking sequence as no-limit; bets/raises/folds unexercised. |
| Lunar Lander | PASS | State-based pad and fuel/thrust rendering; simplified dynamics. |
| Mahjong | RULE | 108-tile/10-tile-hand variant, public counts/discards; no calls in trace. |
| Mancala | PASS | Sowing orientation, stores and seed counts consistent with trace. |
| Mountain Car | PASS | Recorded position/velocity dynamics checked; terrain slope aligns with car tilt. |
| Negotiation | PASS | Public offer/acceptance presentation; outcome facts remain limited. |
| Nine Men's Morris | PASS | Geometry/adjacency checked; no mill/removal in bundled trace. |
| No-limit Texas Hold'em | PASS | Identical checking-only sequence to limit; distinct betting behavior unproven. |
| Othello | PASS | Flip sets checked; last cue correctly singles out the placed disc. |
| Paddle Ball | PASS | Wall penetration (F7) and missing ball-dynamics validation (F8). |
| Pentago | PASS | Placement/rotation states checked; not a continuously animated quadrant turn. |
| Prisoner's Dilemma | PASS | Sealed/revealed choices; no explicit payoff/winner display. |
| Rock Paper Scissors | PASS | Simultaneous reveal; caption/state do not expose complete winner semantics. |
| Shedding Card Game | PASS | Public hand/deck counts and legal discard matching checked. |
| Shogi | PASS | Demo board renders; all recorded move tokens rejected by interaction helper (F4). Check/mate/nifu/uchifuzume not certified. |
| Spades | RULE | Two-player variant and unbroken-spade lead; standard game not certified. |
| Taxi | KNOWN | Frame 10 passenger teleports to pickup in source data; renderer hides it using delivered flag. |
| Tic-Tac-Toe | PASS | Supplied draw and last-move rendering correct; F2 affects raw-cell adaptation. |
| Ultimate Tic-Tac-Toe | PASS | Demo topology correct; 54/81 exported action targets wrong (F1). |
| Xiangqi | PASS | Demo board renders; rank-0 move parsing fails (F4). Check/checkmate not certified. |

The stored coverage metadata reports different artwork/runtime arena versions for 32 games. That is a comparison to the pinned Platform reference, not a fresh inspection of deployed runtime state.

## Validation performed

| Check | Result in this review |
|---|---|
| Pull latest | Fetch/prune and fast-forward-only pull successful; already current. |
| `pnpm check` | Passed: typecheck, build, 69 tests, catalogue build, public-payload check, physics validator and 25 existing mutation checks. |
| Browser suite | Passed: four desktop/phone × light/dark cases, 200 game selections, 722 finite-geometry frame renders, keyboard/dialog/sheet/search/password/clipboard/reduced-motion and scheduling checks. |
| Independent browser frame sweep | 722 frames rendered, zero unavailable placeholders. Bounds inspection found small text/edge overhangs; these were not treated as proof of game-rule failure. |
| Visual inspection | 100 final game scenes (50 × two themes), event/game phone captures, archive entries and selected additional surfaces. |
| `pnpm test:consumer` | Passed: packed ESM render, strict NodeNext declarations, Next 16.4.1 server/client/router build. |
| `pnpm audit --json` | Registry audit reported zero advisories in all severity categories for the installed dependency graph. |
| Additional reproductions | F1–F8 reproduced through exported functions, rendered DOM/geometry or a temporary mutated validator input; F10 reproduced by theme reload. |

Local runtime: Node 26.4.0. The first browser launch failed because Playwright 1.57's pinned headless-shell executable was not installed. The successful run used the existing Chromium cache revision 1248 via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. This is not a rerun of CI's Node 22 and Playwright-pinned Linux combination. No fresh frozen install was performed.

Important test limits: the browser suite's general SVG check checks finiteness, not correct collisions, topology, visible winning lines or pixel parity. The physics checker mirrors cue logic in Python and checks a source version marker; it does not execute TypeScript cue logic or prove that the renderer consumes every cue. The 25 mutations do not establish every unrecorded rule path. Existing documentation should not describe absent gameplay situations as fully exercised merely because the mutation suite passes.

## Local evidence

Diagnostic files are under ignored `artifacts/review/`, browser-suite evidence under `artifacts/browser/`, and consumer results in `artifacts/consumer-result.json`. These are local review artifacts, not a committed test suite or publication payload.

- [Adapter/cue reproductions](../../artifacts/review/reproductions.json) and [reproduction script](../../artifacts/review/reproduce.mjs).
- [Interaction mapping results](../../artifacts/review/interactions.json) and [probe](../../artifacts/review/interactions-probe.mjs).
- [Full validator mutation](../../artifacts/review/validator-full.json) and [probe](../../artifacts/review/validator-full-probe.py).
- [Browser-suite report](../../artifacts/browser/report.json), [bounds sweep](../../artifacts/review/scene-bounds.json), [motion/theme measurements](../../artifacts/review/browser-extra.json).
- Light contact sheets: [1–12](../../artifacts/review/games-light-0.png), [13–24](../../artifacts/review/games-light-12.png), [25–36](../../artifacts/review/games-light-24.png), [37–48](../../artifacts/review/games-light-36.png), [49–50](../../artifacts/review/games-light-48.png).
- Dark contact sheets: [1–12](../../artifacts/review/games-dark-0.png), [13–24](../../artifacts/review/games-dark-12.png), [25–36](../../artifacts/review/games-dark-24.png), [37–48](../../artifacts/review/games-dark-36.png), [49–50](../../artifacts/review/games-dark-48.png).
- [Archive-entry inventory/results](../../artifacts/review/archive.json), [additional surface results](../../artifacts/review/surfaces.json).
