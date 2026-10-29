# Changelog

## 0.2.0 — 2026-10-29

Minor release: additive exports, new tests and docs, renderer fixes. No existing export was removed. Registry publication remains disabled and Platform consumption is still not activated.

### Consolidation

- Add `design-archive/` (341 files): de-duplicated historical eSlams design prototypes, briefs and assets from June to October 2026, with `ARCHIVE_INDEX.md` recording sources, hashes, exclusions and stale facts. Non-canonical, not built, not imported.
- Add `reference/platform/` (707 files): verbatim un-built Platform presentation source from `eSlamsPlatform@0fa7dfe` (19 replay renderer kinds including the Pixi arcade stage, the arena card table, Battlefield client, home animations, share image, games CSS), plus the 12-family native Skia renderer with 375 golden images, theme tokens and the mobile arena/renderer/feedback/audio set recovered from `8dd06c12` (deleted upstream on 2026-08-16). `MANIFEST.json` records sha256 per file.
- Mahjong tiles are CC BY 4.0 (FluffyStuff and xhokir) and playing cards are CC0; `NOTICE.md` records both. Provider logos embedded as data URIs in two archived Arena prototype files are an open founder/legal decision; standalone provider-mark folders were excluded.

### Contracts

- Added `@electronicslams/pachisi/contract`: the server-safe eSlams live render contract ported from Platform `0fa7dfe` (`DisplayFrameV1`, `DisplayCell`, `PublicStateEnvelope`, `ActionTarget`, `BoardScene`, `BoardSceneNode`, `AccessibleBoardNode`, `SceneEnvelope`, `GameRenderSpec`, 12 `GameRendererFamily` values, `parseDisplayFrame`, `adaptPublicStateToDisplayFrame`, `buildSceneEnvelope`, `assertBoardSceneSafe`, `SCENE_BUILDER_REGISTRY`, `RENDERER_FAMILY_ALIASES`, the six contract version constants plus `MOBILE_MINIMUM_APP_VERSION`, and the public-replay privacy checks). Vendored core-types subset; no catalogue.
- Added `@electronicslams/pachisi/game/board-adapter`: the Platform host adapter (`boardFrameFromCells`, `normalizeCellToken`, `emptyBoardFrame`, `placeholderFrame`, `cardFrameFromRecord`, `describeBoardFrame`) with explicit geometry instead of `GAME_CATALOG`, and the new non-throwing `boardFrameFromDisplayFrame(frame, options)` projection returning `{ frame, issues, metadata }`.
- Added `@electronicslams/pachisi/game/interactions`: pure legal-action labels, board from/to/promotion, cell targets and RL control slots (Platform `arena-interactions.ts`, `ArenaSeed` replaced by `ArenaGameLike`).
- Added `@electronicslams/pachisi/theme-tokens`: typed theme contract (Classic Light/Dark plus Neon/Club/Arcade/Midnight as archived-mobile reference data) from the pre-removal Platform `packages/theme-tokens` (`8dd06c12`); preference persistence not ported.
- `styles/tokens.css`: added `--win-text`, `--loss-text`, `--draw-text` (light, manual dark, system dark) in one delimited additive block; existing Platform bytes unchanged (the canonical-bytes test strips only that block).
- Fixed: `CellBoardFrame.cells` doc comment no longer claims `""` is empty; it points to `normalizeCellToken`.
- Fixed in the port: renderer-family alias lookup no longer resolves inherited keys (`"constructor"`, `"toString"`) as families (Platform used a plain object lookup).
- Additive optional fields on `CellBoardFrame`: `orientation`, `check`, `toMove`, `result`, `coordinates`.
- Catalogue: "Live frame projection" example (authored synthetic tic-tac-toe `DisplayFrameV1` through `boardFrameFromDisplayFrame` and `Board`).
- `SOURCE_MANIFEST.json` now lists 76 entries; theme-tokens entries carry a per-entry `sourceCommit`.

### Physics review and renderer fixes

- Independent review of all 50 bundled traces: a standard-library validator replayed all 672 transitions (722 frames). 49 of 50 games pass. Exact rules were simulated for tic-tac-toe, Connect Four, Go, Gomoku, Hex, Othello, Pentago, Ultimate tic-tac-toe, checkers, mancala, backgammon, chess (castling rights, king safety, clocks, SAN), shogi, xiangqi, and the CartPole and MountainCar equations. The validator caught all 23 deliberately corrupted traces in its self-test.
- One known Core engine issue is recorded, not hidden: taxi frame 10 reports the passenger at the pickup origin after dropoff.
- Nine games are legal only under Core's simplified variants (Hearts, Spades and Euchre 2-player; Hanabi; Gin rummy 7-card deal; Mahjong 108 tiles; Backgammon 5 checkers; Leduc Hold'em 4 seats; Cribbage without pegging). They are now documented per game.
- Fixed: `Board` no longer draws `""` as a piece, guesses a side for an unknown token, or accepts a cell array whose length differs from `rows * cols`; it fails closed to a placeholder.
- Fixed: last-move and win-line cues were never shown because demonstration frames carried no `last` or `line`. They are now derived from consecutive frames in `src/game/cues.ts`, without regenerating traces.
- Fixed: Connect Four drop distance follows the landing row instead of always 4 cells; Go draws non-square boards and star points; backgammon draws the bar and borne-off checkers; battleship sizes its grid from `grid_size`.
- Fixed: `LegalDemonstration` no longer throws on a missing state field, and an unknown slug no longer draws a card table.
- Fixed: hover or focus no longer hands the shared clock to another preview; `IntersectionObserver` use is guarded.

### Tooling

- Add `scripts/validate-demonstrations.py` and `pnpm check:physics`; the physics check is part of `pnpm check` and CI.
- Add a `pretest` build step so `pnpm test` works on a clean checkout (tests import `dist/`).

### Docs

- New `docs/contracts.md` and `docs/physics.md`; README repository layout and physics/readiness sections; NOTICE provenance for the archive and reference trees; CONTRIBUTING rules for archive folders and physics checks; inventory, design decisions, game guide, coverage JSON (`physicsValidation`, per-game `ruleVariantNote`) and validation record updated.

## 0.1.0 — 2026-10-29

- Extract existing eSlams Stadium foundations, UI primitives, composites, game visuals and event stage into a portable package.
- Preserve approved tokens, assets, typography and motion; replace app-specific dependencies with explicit presentation contracts and router adapters.
- Add catalogue, source provenance, component/game guides, package/SSR checks and browser verification.
- Reuse the established controlled-modal focus loop in Dialog and Sheet; protect nested modal events.
- Namespace tab IDs for multiple instances. Adapt the demonstration generator's relocated paths.
- Registry publication remains disabled; Platform consumption is prepared but not activated.
