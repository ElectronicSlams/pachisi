# Live-state contracts

Pachisi's `Board` draws a `BoardFrame`: three small shapes (cells, a two-seat card table, a placeholder) with no actor, turn, scores, legal actions or accessibility graph. Real matches in the eSlams Platform travel through a richer, versioned **render contract**. These entry points port the pure, dependency-free parts of that contract so a host can carry a real match to `Board` truthfully:

| Entry | What it is | Source (read-only, ported) |
|---|---|---|
| `/contract` | `PublicStateEnvelope`, `DisplayFrameV1`, `DisplayCell`, `ActionTarget`, `BoardScene`, `BoardSceneNode`, `AccessibleBoardNode`, `SceneEnvelope`, `GameRenderSpec`, `GameRendererFamily` (12 families), `parseDisplayFrame`, `adaptPublicStateToDisplayFrame`, `buildSceneEnvelope`, `assertBoardSceneSafe`, `SCENE_BUILDER_REGISTRY`, `RENDERER_FAMILY_ALIASES`, privacy checks, version constants | Platform `0fa7dfe`: `packages/game-render-contract/src/index.ts` and the needed parts of `packages/core-types` |
| `/game/board-adapter` | `boardFrameFromDisplayFrame` (new), `boardFrameFromCells`, `normalizeCellToken`, `emptyBoardFrame`, `placeholderFrame`, `cardFrameFromRecord`, `describeBoardFrame` | Platform `0fa7dfe`: `apps/web/lib/stadium/board.ts` |
| `/game/interactions` | Legal-action labels/hints/kinds, board from/to/promotion, cell targets, RL control-pad slots, seat labels | Platform `0fa7dfe`: `apps/web/lib/arena-interactions.ts` |
| `/theme-tokens` | Typed theme contract (32 token names, ink/material, `winText`/`lossText`/`drawText`), Classic Light/Dark plus four archived-mobile palettes | Older Platform `8dd06c12`: `packages/theme-tokens/src` (removed from Platform in `8b88fde0`) |

All four are server-safe TypeScript: no React, DOM, storage, network or catalogue import, and none is re-exported from the package root.

## The pipeline

```text
Core public state ──► PublicStateEnvelope ──► DisplayFrameV1 ──► BoardScene (+ ActionTargets, a11y nodes)
                       (host projection)      parseDisplayFrame   buildSceneEnvelope
                                              adaptPublicState…        │
                                                     │                 ▼
                                                     └──► boardFrameFromDisplayFrame ──► BoardFrame ──► <Board>
                                                          (frame + issues + metadata)
```

1. **Public state.** The host receives Core's public projection of a turn and wraps it as `{ publicStateVersion: "eslams.public-state.v1", gameSlug, state }`. Private hands, reasoning, provider and billing data must already be gone; the contract re-checks but is not the projection.
2. **Display frame.** `parseDisplayFrame(value, { gameSlug, rendererFamily })` accepts a v1 frame (camelCase or the legacy snake_case `display_cells` form). `adaptPublicStateToDisplayFrame` covers only a flat `state.board` array (with `rows`/`cols`, or a square guess). Anything else must arrive as a ready display frame. Pass the trusted family from your own catalogue: unknown Core vocabulary (e.g. `poker-table`) is rejected unless the context supplies it.
3. **Scene.** `buildSceneEnvelope(value, context, actionTargets)` returns a `SceneEnvelope` with every version constant and a `BoardScene`: one node per cell, one accessibility node per scene node (`Row r, column c: label` or `Empty`), and each `ActionTarget` bound to exactly one node by id. `assertBoardSceneSafe` enforces that graph. All 12 families currently use the same accessible builder; per-family geometry is not part of this contract.
4. **Board.** `boardFrameFromDisplayFrame(frame, options)` returns `{ frame, issues, metadata }` and never throws:
   - Only `grid_3x3`, `connect_four`, `square_board`, `go_board` and `hex_board` project to cells. Every other family (and any unknown family) becomes a placeholder that names that family. It never substitutes another game's example.
   - Board cells need a position (`index`, or `row` + `col`); positions must agree, be unique and lie inside the board, and the board-cell count must equal `rows * cols`. Size is inferred from the largest row/col or passed as `options.rows/cols`. Dimensions must be finite positive integers.
   - `""`, null, `"-"`, `"_"` and `"."` normalise to `"."`. A non-empty label the family does not recognise fails closed to a placeholder rather than being drawn as empty.
   - `options.tokens` names the label vocabulary (see below). The default `"board"` keeps the Board reading; pass `"core"` for labels copied from Core public state.
   - `last`/`line` come only from `options` and are bounds-checked. `DisplayFrameV1` has no last-move field, so nothing is inferred from `actionLabel` or frame diffs.
   - `metadata` keeps `frameId`, `actorPlayer`, `actionLabel`, `activePlayer`, `terminal`, `turn`, `scores` and status-cell labels for the host's chrome.
   - Core frames that carry key/value cells (chess sends a FEN cell, not 64 positioned cells) are reported as a placeholder with an issue. Converting FEN to cells is host work.
   - `card_table` is not projected. `DisplayFrameV1` does not say which cards belong to which seat or which were played, so the host builds `CardBoardFrame` itself (or uses `cardFrameFromRecord` with its own hands).

`boardFrameFromCells(geometry, cells, options)` is the older direct path for a known row-major board. Geometry (`{ family, rows, cols, chess?, variant?, name?, tokens? }`) is explicit because pachisi has no game catalogue. It fails closed the same way: a non-empty token the family does not recognise (e.g. `"DRAGON"` on a disc board) returns a placeholder and an issue from `boardFrameFromCellsWithIssues`, never an empty cell. `normalizeCellToken` on its own stays lossy (unknown → `"."`); callers using it directly must check `isEmptyCellToken` themselves.

### Token vocabulary (`tokens: "board" | "core"`)

The same letter means different seats in Core and in Board, so the source vocabulary is explicit rather than guessed:

| Family | `"board"` (default) | `"core"` (bundled Core public state) |
|---|---|---|
| `hex_board` | `R` first seat, `B` second seat (blue); `W` rejected | `B` player 1 → Board `R`, `W` player 2 → Board `B`; `R` rejected |
| every other cell family | Board tokens and the spellings `normalizeCellToken` accepts | Same as `"board"`: Core's X/O, R/Y, B/W and chess letters are already Board tokens |

The Core map is exported as `CORE_TOKEN_MAPS` and matches the decorative scene's own Hex conversion. `adaptPublicStateToDisplayFrame` copies Core labels unchanged, so a host projecting a Core Hex board must pass `{ tokens: "core" }` to `boardFrameFromDisplayFrame`. The meaning of a bare `B` is never changed globally.

## Legal actions

`ActionTarget { id, action, label, disabled }` binds one legal action to one cell id in a scene. `/game/interactions` turns Core legal-action tokens into labels and targets: `describeArenaAction`, `arenaBoardMoveFromAction` (chess/shogi/xiangqi/checkers from, to, promotion), `arenaBoardSquareToCell`, `arenaBoardCellActionFromAction` (go, gomoku, hex, ultimate tic-tac-toe, othello, battleship), `arenaRlControlSlotFromAction` and seat labels. These helpers only describe actions the host already received as legal. They do not compute legality.

Per-game notation:

- **Chess** (and chess-style checkers labels): `e2e4`, `e7e8q`; files a-h, rank 8 is row 0.
- **Shogi** (USI): `1g1f`, promotion `1c1a+` (`promotion: "+"`), drop `P*5e` (`from: "P*"`, `drop: "P"`). Files 1-9 run right to left (file 1 is column 8), ranks a-i top to bottom.
- **Xiangqi**: `a0a1`, `b0a2`; files a-i, rank digit 0-9 is the Core board row (0 is the top row).
- **Ultimate tic-tac-toe**: Core's action is `subBoard * 9 + localCell`. The target is the visible 9x9 cell the scene draws (row `floor(sub/3)*3 + floor(local/3)`, column `(sub%3)*3 + local%3`); `token` stays the original action. Requires a 9x9 board.

## Still host-owned

Legality and move generation, session/turn clocks, submission and optimistic state, public/private projection, per-game catalogue facts (sizes, variants, seat layouts, hidden information), FEN or other key/value decoding, card-seat assignment, selection state and hit-testing, replay transport, and every non-cell family's renderer (dice, auction, payoff matrix, control benchmark, economic panel, custom boards). The Platform's DOM viewers (`replay-board.tsx`, `arena-card-table.tsx`) and the native plan layer (`board-skia`) were not ported.

## Versions

| Constant | Value |
|---|---|
| `PUBLIC_STATE_VERSION` | `eslams.public-state.v1` |
| `DISPLAY_FRAME_VERSION` | `eslams.replay.display_frame.v1` |
| `SCENE_SCHEMA_VERSION` | `eslams.scene.v1` |
| `RENDERER_CONTRACT_VERSION` / `RENDERER_VERSION` | `eslams.renderer.v1` |
| `RENDER_ADAPTER_VERSION` | `eslams.render-adapter.v1` |
| `THEME_TOKEN_REFERENCE_VERSION` | `eslams.theme-tokens.v1` |
| `MOBILE_MINIMUM_APP_VERSION` | `1.0.0` (carried in `SceneEnvelope.minimumAppVersion`) |
| `GameRenderSpec.schemaVersion` | `eslams.game.render.v1` |

These match Platform `0fa7dfe`. Change them only alongside the Platform/Core contract.

## Privacy checks and their limitation

Frames pass two key checks before anything is parsed:

- `assertPublicReplaySafe` (Platform `public-replay-safety.ts`): private/secret/hidden/prompt/response, provider logs/receipts, credentials and auth tokens, judge/auditor, phone/attestation/provenance and similar keys; billing keys (`usage`, `cost`, `*_tokens`, `billing`); and secret-like values (API-key shapes, `access_token: …`).
- `NON_RENDERABLE_KEY_PATTERN`: `/reason(?:ing)?|explanation|provider|billing|usage|cost|token|prompt|response|private|hidden|secret/iu`.

The second pattern matches substrings, case-insensitively. **Any key containing `token` is rejected**, as are `terminalReason`, `providerName` or `costBasis`. That includes the `token` field of a legal action, so legal actions must travel beside a frame as `ActionTarget`s (with the token in `action`), never inside it. `collectNonRenderableFieldIssues` reports the same findings without throwing. These are key-name heuristics, not a projection. They cannot detect private data under an innocent key.

## Theme tokens

`/theme-tokens` is the typed contract the archived mobile app and non-DOM renderers used. `styles/tokens.css` stays the web source of truth and its Platform bytes are unchanged. One delimited additive block at the end adds `--win-text`, `--loss-text` and `--draw-text` for light, manual dark and system dark, using the Classic values (`#1c7c44`/`#c23c33`/`#8f6216` light, `#3ec97e`/`#ec6a5f`/`#e0a94a` dark).

The typed Classic Light data predates later web changes. Its `win`/`loss`/`draw` swatches (`#1f8a4c`/`#c43d33`/`#b0791b`) differ from the web tokens (`#17703d`/`#b5332a`/`#8a5d0a`), which are darker than the new light text roles. Both pass WCAG AA on the soft fills (text roles about 4.6:1, web swatches above 5:1). Classic Dark's `textOnAccent` (`#0b0b0d`) is also not reflected in `tokens.css`, whose dark blocks inherit white `--text-on-accent`. Neon, Club, Arcade and Midnight are archived-mobile reference palettes, kept as data only. `THEME_CSS` targets `[data-eslams-theme]` for visual tooling, not the web `data-theme` switch. Preference storage stays in `/theme` (`es-theme`); the old package's `persistence.ts` was not ported.
