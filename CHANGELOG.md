# Changelog

## Unreleased

Post-merge hygiene for the November work on `main` (`486aa05`). No export was removed. The pinned Core commit is unchanged; only the three hold'em traces were regenerated.

- Fixed: `GameReplay` no longer resets to the first frame when a host re-renders with an inline `demonstration` object.
- The physics validator now checks Goofspiel `committed` and Pentago `placement`. Six new planted corruptions bring the self-test to 44 planted errors.
- Hold'em traces regenerated at the same pin (`7731e2f`) with scripted betting plans: Limit shows bet, call, raise and fold to a showdown, No-limit shows bet:2, raise:4, bet:4, fold, call and all-in, and Leduc shows bet, call, fold and raise, so the Limit and No-limit demos no longer match. The poker validator now checks action sizes, folds, street commitments and the pot ledger, with four new planted corruptions (48 in all), and seats show chips committed on the street. The bundled set is now 745 frames and 695 transitions.
- `GameReplay`, `GameAnimation` and `Board` validate the `design` prop against the designs registered for the game.
- The catalogue lazy-loads its census, sweep, source and coverage JSON.
- The package tarball no longer includes `docs/captures` or `docs/research`.
- The Connect Four local round has a short accessible label instead of the raw cell list.
- Docs sweep: current trace and self-test counts, one changelog order, README repository layout, subpath exports and physics readiness restored, inventory exports, physics regeneration instructions and the list of Core issues still to file upstream.
- `NOTICE.md` states the public repository status as a fact, keeps the provider-logo decision open, and lists the licence families and named copyleft sources in the reference collections.
- Local CI evidence in `docs/validation/` is re-recorded with `pnpm ci:local` after these changes.

## 0.2.0 working collection · 6 November 2026

Work merged to `main` between 1 and 6 November. The pinned Core commit is unchanged (`7731e2f`). Car Racing and Pentago were re-recorded as longer demonstrations, which brings the bundled set from 722 frames and 672 transitions to 740 frames and 690 transitions. Goofspiel frames gained the `committed` field, and the five sealed or discard games now publish neutral action labels.

- Add all-game design selection, local and public GitHub research, and the blue/violet/lime/red/gold pack palette.
- Fix sealed replay disclosure, live Checkers ranks, settled Connect Four stills, Pentago Porcelain and game-specific card-table labels.
- Add public position inspection, stable design IDs and explicit input capabilities.
- Record complete Pentago, Goofspiel and Racing demonstrations. Expand browser and packed-consumer regressions and fail on new physics-renderer findings.
- Rewrite the README around catalogue discovery, consuming real frames, public replay boundaries and reproducible local validation.

### Game design lab

- Fix clipped catalogue boards: restrict the short arena-table layout to supported card tables, reserve caption space in arena/event boards and remove the preview's conflicting height cap. Keep filtered selections consistent and add a per-game comparison of implemented studies/presentations, replay links and shareable game URLs.
- Research 270 distinct GitHub candidates through 57 searches; inspect 49 repositories and archive 443 selected original files from 38, including 148 SVG assets. Map all 50 games and declared variants to sources with explicit gaps; preserve full commits, original licenses, Git blob IDs and SHA-256 hashes. Add searchable catalogue sources and offline integrity checks; verify reference sources are excluded from the packed library.
- Review all 50 games and their declared variants in an interactive catalogue lab; add 33 authored studies with 47 frames, category filtering, primary-source inspiration and explicit coverage boundaries.
- Export paused-by-default `GameReplay` from `game/demo`, with deterministic frame controls, speed, reduced-motion handling and outcome text.
- Correct tall-map/shooter clipping, terrain foot contacts, road-relative alignment/camera fit, shared hockey cells, Blackjack conceal/reveal, long-card-row disclosure and external-seat crop scope. Improve mobile inspection, Go stone edges and wrapping captions.
- Strengthen lander/racing/walker equation checks and add eight corruption tests, bringing the self-test to 38 planted errors at the time. The original 722 pinned frames and the canonical theme assets were preserved; the later Car Racing and Pentago recordings described above added frames on top of them.
- Ship 20 Connect Four board designs on four surfaces, including Gumball and Bullseye from first-party prototypes. Add a shared comparison slider, local two-player board, copyable IDs, design links, six native reference captures and optional design selection for Board, GameAnimation, GameReplay and LegalDemonstration.
- Census all 50 games across first-party prototypes, archived Platform renderers, native captures and 38 local public-source selections. Extend the per-game design chooser, shared-frame comparison, replay selection and share links across the catalogue. Include package registry lookup, new family materials and Shudan's attributed Go stones.
- Add a second public GitHub design sweep across all 50 games, with per-game findings, pinned source links, visual observations, offline-verifiable snapshots and explicit variant relationships in the catalogue.

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

### Review fixes (29 October end-to-end review, `docs/reviews/2026-10-29-end-to-end-review.md`)

- F1: Ultimate tic-tac-toe action targets now map `subBoard*9 + localCell` to the visible 9x9 cell the scene draws; all 81 mappings tested against the rendered scene.
- F2: `boardFrameFromCells` fails closed on an unknown non-empty token (placeholder plus issue) instead of erasing the piece.
- F3: new `tokens: "board" | "core"` vocabulary option on `BoardGeometry` and the display-frame projection; `"core"` maps Core Hex `B`/`W` to Board `R`/`B`. Default unchanged.
- F4: Shogi (USI moves, `+` promotion, `P*5e` drops) and Xiangqi (ranks 0–9) get their own move grammars; every bundled action parses. New `arenaBoardSquareToCell` and `ArenaBoardMove.drop`.
- F5: Connect Four discs now start above the board and travel exactly `--drop` row pitches (cells are square pitches with an inset hole instead of a grid gap; `.st-board-c4` no longer uses `gap`). Browser check measures start, travel, overshoot and settle at two widths.
- F6: Go-family boards draw a supplied winning `line` (Gomoku five-in-a-row markers and a win line through contiguous runs).
- F7: paddle-ball ball centre is inset by radius plus stroke so it never crosses the drawn walls; paddle uses the same transform.
- F8: the validator now checks ball integration, wall reflection and speed conservation for paddle-ball; the self-test grew to 30 planted errors.
- F9: `design-archive/ARCHIVE_INDEX.md` defers to the live design chronology and distinguishes retired evaluation rankings from retained match Records.
- F10: the catalogue applies a saved theme before first paint; browser check covers persistence across reload.

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
